const { handleError } = require('../utils/errorHandler');
const Shipment = require('../models/Shipment');
const ReturnLoad = require('../models/ReturnLoad');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

// 1. Find Return Load Recommendations
const findRecommendations = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { currentLocation } = req.query; 
    
    const driver = await User.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    const driverCapacity = driver.vehicleCapacityKg || 0;


    // Find all pending shipments that are not assigned to a driver
    const availableShipments = await Shipment.find({
      status: 'Pending',
      $or: [{ driver: null }, { driver: { $exists: false } }],
      isDeleted: { $ne: true }
    }).populate('shipper', 'businessName name phone');

    const recommendations = availableShipments.filter(shipment => {
      if (shipment.weight > driverCapacity) return false;
      
      if (currentLocation) {
        const loc = currentLocation.split(',')[0].trim().toLowerCase();
        const pickupStr = shipment.pickup.toLowerCase();
        if (!pickupStr.includes(loc)) {
            return false;
        }
      }
      return true;
    });

    res.json(recommendations);
  } catch (err) {
    handleError(res, err);
  }
};

// 2. Request Return Load
const requestReturnLoad = async (req, res) => {
  try {
    const { shipmentId, offeredPrice } = req.body;
    const driverId = req.user._id;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    if (shipment.driver) return res.status(400).json({ message: 'Shipment already has a driver' });

    const driver = await User.findById(driverId);

    const existingReq = await ReturnLoad.findOne({ shipmentId, driverId, deletedAt: null });
    if (existingReq) {
      return res.status(400).json({ message: 'You have already requested this return load' });
    }

    const returnLoad = await ReturnLoad.create({
      shipmentId,
      driverId,
      organizationId: shipment.shipper,
      pickup: shipment.pickup,
      destination: shipment.drop,
      goodsType: shipment.goodsType,
      weight: shipment.weight,
      offeredPrice: offeredPrice || shipment.cost?.total || 0,
      vehicleCapacity: driver.vehicleCapacityKg || shipment.weight
    });

    await createNotification(req, shipment.shipper, {
      title: 'New Return Load Request',
      message: `Driver ${driver.name} requested your shipment to ${shipment.drop} as a return load.`,
      type: 'INFO',
      category: 'Return Loads',
      priority: 'Medium',
      relatedEntityId: returnLoad._id,
      entityType: 'ReturnLoad',
      link: '/shipments/return-loads'
    });

    await createNotification(req, driverId, {
      title: 'Return Load Request Sent',
      message: `Your return load request for ${shipment.drop} has been sent.`,
      type: 'SUCCESS',
      category: 'Return Loads',
      priority: 'Low',
      relatedEntityId: returnLoad._id,
      entityType: 'ReturnLoad',
      link: '/return-loads'
    });

    res.status(201).json(returnLoad);
  } catch (err) {
    handleError(res, err);
  }
};

// 3. Update Request (Driver before approval)
const updateDriverRequest = async (req, res) => {
  try {
    const { offeredPrice, status } = req.body; // status can be 'Withdrawn'
    const rlId = req.params.id;

    const returnLoad = await ReturnLoad.findById(rlId);
    if (!returnLoad) return res.status(404).json({ message: 'Request not found' });
    if (returnLoad.driverId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    if (returnLoad.status !== 'Pending') return res.status(400).json({ message: `Cannot modify a ${returnLoad.status} request` });

    if (offeredPrice) returnLoad.offeredPrice = offeredPrice;
    
    if (status === 'Withdrawn') {
      returnLoad.status = 'Withdrawn';
      await createNotification(req, returnLoad.organizationId, {
        title: 'Return Load Withdrawn',
        message: `A driver withdrew their return load request for your shipment.`,
        type: 'WARNING',
        category: 'Return Loads',
        priority: 'Low',
        relatedEntityId: returnLoad._id,
        entityType: 'ReturnLoad',
        link: '/shipments/return-loads'
      });
    }

    await returnLoad.save();
    res.json(returnLoad);
  } catch (err) {
    handleError(res, err);
  }
};

// 4. Update Request Status (Organization Accept/Reject/Modify)
const updateOrgRequest = async (req, res) => {
  try {
    const { status, pickupTime, remarks } = req.body; // 'Approved' or 'Rejected'
    const rlId = req.params.id;

    const returnLoad = await ReturnLoad.findById(rlId).populate('shipmentId').populate('driverId');
    if (!returnLoad) return res.status(404).json({ message: 'Request not found' });
    if (returnLoad.organizationId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    if (returnLoad.status !== 'Pending') return res.status(400).json({ message: `Request is already ${returnLoad.status}` });

    if (pickupTime) returnLoad.pickupTime = pickupTime;
    if (remarks) returnLoad.remarks = remarks;
    returnLoad.status = status;
    await returnLoad.save();

    const shipment = returnLoad.shipmentId;

    if (status === 'Approved') {
      if (shipment.driver) {
        returnLoad.status = 'Rejected'; 
        returnLoad.remarks = 'Shipment already assigned.';
        await returnLoad.save();
        return res.status(400).json({ message: 'Shipment has already been assigned to another driver.' });
      }

      // Convert return load into normal shipment
      shipment.driver = returnLoad.driverId._id;
      shipment.status = 'Pickup Confirmed';
      shipment.timeline.push({ status: 'Pickup Confirmed', note: 'Organization accepted return load request' });
      await shipment.save();

      // Reject all other pending requests for this shipment
      await ReturnLoad.updateMany(
        { shipmentId: shipment._id, _id: { $ne: rlId }, status: 'Pending' },
        { $set: { status: 'Rejected', remarks: 'Shipment assigned to another driver.' } }
      );

      await createNotification(req, returnLoad.driverId._id, {
        title: 'Return Load Approved',
        message: `Your return load request for ${shipment.drop} was approved!`,
        type: 'SUCCESS',
        category: 'Return Loads',
        priority: 'High',
        relatedEntityId: shipment._id,
        entityType: 'Shipment',
        link: '/driver-trips'
      });
    } else if (status === 'Rejected') {
      await createNotification(req, returnLoad.driverId._id, {
        title: 'Return Load Rejected',
        message: `Your return load request for ${shipment.drop} was rejected.`,
        type: 'WARNING',
        category: 'Return Loads',
        priority: 'Medium',
        relatedEntityId: returnLoad._id,
        entityType: 'ReturnLoad',
        link: '/return-loads'
      });
    }

    res.json(returnLoad);
  } catch (err) {
    handleError(res, err);
  }
};

// 5. Soft Delete Return Load
const softDeleteReturnLoad = async (req, res) => {
  try {
    const rlId = req.params.id;
    const returnLoad = await ReturnLoad.findById(rlId);
    
    if (!returnLoad) return res.status(404).json({ message: 'Return load not found' });

    // Driver deletes rejected/completed/withdrawn
    if (req.user.role === 'driver' && returnLoad.driverId.toString() === req.user._id.toString()) {
      if (['Pending', 'Approved'].includes(returnLoad.status)) {
        return res.status(400).json({ message: 'Cannot delete active return loads.' });
      }
      returnLoad.deletedAt = new Date();
    } 
    // Org deletes (archives) completed/rejected
    else if (req.user.role !== 'driver' && returnLoad.organizationId.toString() === req.user._id.toString()) {
      if (['Pending', 'Approved'].includes(returnLoad.status)) {
         return res.status(400).json({ message: 'Cannot archive active requests.' });
      }
      returnLoad.deletedAt = new Date();
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await returnLoad.save();
    res.json({ message: 'Successfully removed.' });
  } catch (err) {
    handleError(res, err);
  }
};

// 6. Get Driver Return Loads
const getDriverReturnLoads = async (req, res) => {
  try {
    const driverId = req.user._id;
    const requests = await ReturnLoad.find({ driverId, deletedAt: null })
      .populate('shipmentId')
      .populate('organizationId', 'businessName name phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    handleError(res, err);
  }
};

// 7. Get Organization Requests
const getOrgReturnLoads = async (req, res) => {
  try {
    const orgId = req.user._id;
    const requests = await ReturnLoad.find({ organizationId: orgId, deletedAt: null })
      .populate('shipmentId')
      .populate('driverId', 'name phone vehicleNumber vehicleCapacityKg rating totalRatings')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    handleError(res, err);
  }
};

// 8. Get Analytics
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role; 

    // Find all approved or completed return loads for this user (even if soft deleted, analytics needs them)
    const query = { status: { $in: ['Approved', 'Completed'] } };
    if (role === 'driver') {
      query.driverId = userId;
    } else {
      query.organizationId = userId;
    }

    const successfulRequests = await ReturnLoad.find(query);

    const returnLoadsCompleted = successfulRequests.length;
    let extraEarnings = 0;
    
    successfulRequests.forEach(req => {
      extraEarnings += req.offeredPrice || 0;
    });

    const fuelSavedLiters = returnLoadsCompleted * 30; 
    const co2SavedKg = fuelSavedLiters * 2.68;

    // Success rate (Approved/Completed vs Total)
    const allQuery = role === 'driver' ? { driverId: userId } : { organizationId: userId };
    const totalRequests = await ReturnLoad.countDocuments(allQuery);
    const successRate = totalRequests > 0 ? Math.round((returnLoadsCompleted / totalRequests) * 100) : 0;

    res.json({
        returnLoadsCompleted,
        emptyTripsAvoided: returnLoadsCompleted,
        extraEarnings,
        fuelSavedLiters: Math.round(fuelSavedLiters),
        co2SavedKg: Math.round(co2SavedKg),
        successRate
    });

  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  findRecommendations,
  requestReturnLoad,
  updateDriverRequest,
  updateOrgRequest,
  softDeleteReturnLoad,
  getDriverReturnLoads,
  getOrgReturnLoads,
  getAnalytics
};
