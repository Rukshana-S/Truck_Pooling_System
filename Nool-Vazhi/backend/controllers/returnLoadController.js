const Shipment = require('../models/Shipment');
const ReturnLoadRequest = require('../models/ReturnLoadRequest');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

// 1. Find Return Load Recommendations
const findRecommendations = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { currentLocation } = req.query; // this could be the city name or full address
    
    // Get driver to check capacity
    const driver = await User.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    const driverCapacity = driver.vehicleCapacityKg || 0;

    // Find all pending shipments that are not assigned to a driver
    const availableShipments = await Shipment.find({
      status: 'Pending',
      $or: [{ driver: null }, { driver: { $exists: false } }],
      isDeleted: { $ne: true }
    }).populate('shipper', 'businessName name phone');

    // Filter by location (nearby/matching) and capacity
    const recommendations = availableShipments.filter(shipment => {
      // Basic capacity check
      if (shipment.weight > driverCapacity) {
        return false;
      }
      
      // Basic location match (if currentLocation is provided)
      if (currentLocation) {
        // e.g., if delivery was Chennai, we look for pickup containing Chennai
        const loc = currentLocation.split(',')[0].trim().toLowerCase(); // simple heuristic to get city
        const pickupStr = shipment.pickup.toLowerCase();
        
        // If the pickup doesn't include the delivery location, we filter it out. 
        // We could also do coordinates distance check, but string match is a good start.
        if (!pickupStr.includes(loc)) {
            return false;
        }
      }
      return true;
    });

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Request Return Load
const requestReturnLoad = async (req, res) => {
  try {
    const { shipmentId, originalDeliveryLocation } = req.body;
    const driverId = req.user._id;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

    if (shipment.driver) {
      return res.status(400).json({ message: 'Shipment already has a driver' });
    }

    // Check if request already exists
    const existingReq = await ReturnLoadRequest.findOne({ shipment: shipmentId, driver: driverId, isDeleted: false });
    if (existingReq) {
      return res.status(400).json({ message: 'You have already requested this return load' });
    }

    const returnLoadRequest = await ReturnLoadRequest.create({
      shipment: shipmentId,
      driver: driverId,
      organization: shipment.shipper,
      originalDeliveryLocation: originalDeliveryLocation || ''
    });

    // Notify organization
    await createNotification(req, shipment.shipper, {
      title: 'New Return Load Request',
      message: `Driver ${req.user.name} requested your shipment to ${shipment.drop} as a return load.`,
      type: 'INFO',
      category: 'Return Loads',
      priority: 'Medium',
      relatedEntityId: returnLoadRequest._id,
      entityType: 'ReturnLoadRequest',
      link: '/shipments/return-load-requests'
    });

    // Notify driver
    await createNotification(req, driverId, {
      title: 'Return Load Request Sent',
      message: `Your return load request for ${shipment.drop} has been sent to the organization.`,
      type: 'SUCCESS',
      category: 'Return Loads',
      priority: 'Low',
      relatedEntityId: returnLoadRequest._id,
      entityType: 'ReturnLoadRequest',
      link: '/driver-trips/return-loads/history'
    });

    res.status(201).json(returnLoadRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Update Request Status (Organization Accept/Reject)
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'Accepted' or 'Rejected'
    const requestId = req.params.id;

    const returnLoadRequest = await ReturnLoadRequest.findById(requestId).populate('shipment').populate('driver');
    if (!returnLoadRequest) return res.status(404).json({ message: 'Request not found' });

    if (returnLoadRequest.status !== 'Pending') {
      return res.status(400).json({ message: `Request is already ${returnLoadRequest.status}` });
    }

    // Verify it belongs to this org
    if (returnLoadRequest.organization.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this request' });
    }

    returnLoadRequest.status = status;
    await returnLoadRequest.save();

    const shipment = returnLoadRequest.shipment;

    if (status === 'Accepted') {
      // Check if shipment is still available
      if (shipment.driver) {
        returnLoadRequest.status = 'Rejected'; // Force reject if taken
        await returnLoadRequest.save();
        return res.status(400).json({ message: 'Shipment has already been assigned to another driver.' });
      }

      // Convert return load into normal shipment
      shipment.driver = returnLoadRequest.driver._id;
      shipment.status = 'Pickup Confirmed';
      shipment.timeline.push({ status: 'Pickup Confirmed', note: 'Organization accepted return load request' });
      await shipment.save();

      // Reject all other pending requests for this shipment
      await ReturnLoadRequest.updateMany(
        { shipment: shipment._id, _id: { $ne: requestId }, status: 'Pending' },
        { $set: { status: 'Rejected' } }
      );

      // Notify Driver
      await createNotification(req, returnLoadRequest.driver._id, {
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
      // Notify Driver
      await createNotification(req, returnLoadRequest.driver._id, {
        title: 'Return Load Rejected',
        message: `Your return load request for ${shipment.drop} was rejected.`,
        type: 'WARNING',
        category: 'Return Loads',
        priority: 'Medium',
        relatedEntityId: returnLoadRequest._id,
        entityType: 'ReturnLoadRequest',
        link: '/driver-trips/return-loads/history'
      });
    }

    res.json(returnLoadRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Get Return Load History (Driver)
const getReturnLoadHistory = async (req, res) => {
  try {
    const driverId = req.user._id;
    const history = await ReturnLoadRequest.find({ driver: driverId, isDeleted: false })
      .populate('shipment')
      .populate('organization', 'businessName name phone')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Get Organization Requests
const getOrganizationRequests = async (req, res) => {
  try {
    const orgId = req.user._id;
    const requests = await ReturnLoadRequest.find({ organization: orgId, isDeleted: false, status: 'Pending' })
      .populate('shipment')
      .populate('driver', 'name phone vehicleNumber vehicleCapacityKg rating totalRatings')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Get Analytics (Driver & Organization)
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role; // 'driver' or 'organization'

    const query = { status: 'Accepted', isDeleted: false };
    if (role === 'driver') {
      query.driver = userId;
    } else {
      query.organization = userId;
    }

    const acceptedRequests = await ReturnLoadRequest.find(query).populate('shipment');

    const returnLoadsCompleted = acceptedRequests.length;
    let extraEarnings = 0;
    
    acceptedRequests.forEach(req => {
        if (req.shipment && req.shipment.cost) {
            extraEarnings += req.shipment.cost.total || 0;
        }
    });

    // Heuristics:
    // Assume average return load distance is 300km if not calculable. 
    // 300km / 10km per liter = 30 Liters saved per trip.
    // 30 Liters * 2.68 kg CO2/L = 80.4 kg CO2 saved per trip.
    const fuelSavedLiters = returnLoadsCompleted * 30; 
    const co2SavedKg = fuelSavedLiters * 2.68;

    res.json({
        returnLoadsCompleted,
        emptyTripsAvoided: returnLoadsCompleted,
        extraEarnings,
        fuelSavedLiters: Math.round(fuelSavedLiters),
        co2SavedKg: Math.round(co2SavedKg)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  findRecommendations,
  requestReturnLoad,
  updateRequestStatus,
  getReturnLoadHistory,
  getOrganizationRequests,
  getAnalytics
};
