const Shipment = require('../models/Shipment');
const { createNotification } = require('../services/notificationService');

const calculateCost = (bundles, pickup, drop) => {
  const baseCost = 1500;
  const perBundle = 200;
  const poolDiscount = bundles >= 5 ? 0.15 : bundles >= 3 ? 0.10 : 0.05;
  const subtotal = baseCost + perBundle * bundles;
  const discount = subtotal * poolDiscount;
  return {
    baseCost,
    perBundle: perBundle * bundles,
    poolDiscount: Math.round(discount),
    total: Math.round(subtotal - discount),
  };
};

const createShipment = async (req, res) => {
  const { pickup, drop, goodsType, bundles, weight, estimatedDelivery } = req.body;
  try {
    const cost = calculateCost(Number(bundles), pickup, drop);
    const shipment = await Shipment.create({
      shipper: req.user._id,
      pickup,
      drop,
      goodsType,
      bundles,
      weight,
      cost,
      estimatedDelivery,
      timeline: [{ status: 'Pending', note: 'Shipment booked' }],
    });
    res.status(201).json(shipment);
    
    await createNotification(req, req.user._id, {
      title: 'Shipment Created',
      message: `Your shipment from ${pickup} to ${drop} was created.`,
      type: 'SUCCESS',
      category: 'Shipments',
      priority: 'Low',
      relatedEntityId: shipment._id,
      entityType: 'Shipment',
      link: '/shipments'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyShipments = async (req, res) => {
  try {
    let shipments;
    if (req.user.role === 'driver') {
      shipments = await Shipment.find({ driver: req.user._id.toString(), isDeleted: { $ne: true } })
        .populate('shipper', 'businessName name phone')
        .sort({ createdAt: -1 });
      // fallback: also try ObjectId match
      if (!shipments.length) {
        const mongoose = require('mongoose');
        shipments = await Shipment.find({ driver: new mongoose.Types.ObjectId(req.user._id), isDeleted: { $ne: true } })
          .populate('shipper', 'businessName name phone')
          .sort({ createdAt: -1 });
      }
    } else {
      shipments = await Shipment.find({ shipper: req.user._id, isDeleted: { $ne: true } })
        .populate('driver', 'name phone')
        .sort({ createdAt: -1 });
    }
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('shipper', 'businessName email phone')
      .populate('driver', 'contactPerson phone rating');
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateShipmentStatus = async (req, res) => {
  const { status, currentLocation, note } = req.body;
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id || req.params.shipmentId, isDeleted: { $ne: true } });
    if (!shipment) return res.status(404).json({ message: 'Not found' });

    // Authorization: Only the assigned driver can update the status
    if (req.user.role === 'driver' && shipment.driver?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the assigned driver can update tracking' });
    }
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Organizations have read-only tracking access' });
    }

    const ADVANCED_STATUS_ORDER = [
      'Pending',
      'Accepted',
      'Advance Paid',
      'Pickup Started',
      'Loaded',
      'In Transit',
      'Near Destination',
      'Delivered',
      'Final Payment Completed'
    ];

    const isNewStatus = ADVANCED_STATUS_ORDER.includes(status);
    const isOldStatus = ['Pending', 'Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(status);

    if (!isNewStatus && !isOldStatus) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Apply New Advanced Tracking Rules
    if (isNewStatus) {
      const newIndex = ADVANCED_STATUS_ORDER.indexOf(status);
      const currentIndex = ADVANCED_STATUS_ORDER.indexOf(shipment.currentStatus || 'Pending');

      if (newIndex < currentIndex) {
        return res.status(400).json({ message: 'Cannot transition backward in status' });
      }
      if (newIndex === currentIndex) {
        return res.status(400).json({ message: 'Duplicate consecutive status' });
      }

      shipment.currentStatus = status;
      shipment.statusUpdatedAt = Date.now();
      shipment.trackingHistory.push({
        status,
        note: note || status,
        timestamp: Date.now()
      });
    }

    // Apply Old Timeline Rules
    if (isOldStatus) {
      shipment.status = status;
      if (currentLocation) shipment.currentLocation = currentLocation;
      shipment.timeline.push({ status, note: note || status });
    }

    await shipment.save();
    res.json(shipment);
    
    // Notifications logic (only trigger once for overlapping statuses)
    if (isOldStatus || isNewStatus) {
      if (status === 'Delivered') {
        await createNotification(req, [shipment.shipper, shipment.driver].filter(Boolean), {
          title: 'Shipment Delivered',
          message: `Shipment to ${shipment.drop} has been delivered successfully.`,
          type: 'SUCCESS',
          category: 'Shipments',
          priority: 'High',
          relatedEntityId: shipment._id,
          entityType: 'Shipment',
          link: '/shipments'
        });
      } else {
        await createNotification(req, shipment.shipper, {
          title: `Shipment ${status}`,
          message: `Shipment status updated to ${status}.`,
          type: 'INFO',
          category: 'Shipments',
          priority: 'Medium',
          relatedEntityId: shipment._id,
          entityType: 'Shipment',
          link: '/shipments'
        });
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const total = await Shipment.countDocuments({ shipper: req.user._id, isDeleted: { $ne: true } });
    const active = await Shipment.countDocuments({ shipper: req.user._id, status: 'In Transit', isDeleted: { $ne: true } });
    const completed = await Shipment.countDocuments({ shipper: req.user._id, status: 'Delivered', isDeleted: { $ne: true } });
    const spent = await Shipment.aggregate([
      { $match: { shipper: req.user._id, status: 'Delivered', isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$cost.total' } } },
    ]);
    res.json({
      total,
      active,
      completed,
      totalSpent: spent[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAvailableShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({ status: 'Pending', $or: [{ driver: null }, { driver: { $exists: false } }], isDeleted: { $ne: true } })
      .populate('shipper', 'businessName name')
      .sort({ createdAt: -1 });
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const acceptShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    if (shipment.driver) return res.status(400).json({ message: 'Shipment already accepted' });
    shipment.driver = req.user._id;
    shipment.status = 'Pickup Confirmed';
    shipment.timeline.push({ status: 'Pickup Confirmed', note: 'Driver accepted the shipment' });
    await shipment.save();
    res.json(shipment);

    await createNotification(req, shipment.shipper, {
      title: 'Driver Assigned',
      message: `A driver has accepted your shipment to ${shipment.drop}.`,
      type: 'SUCCESS',
      category: 'Shipments',
      priority: 'Medium',
      relatedEntityId: shipment._id,
      entityType: 'Shipment',
      link: '/shipments'
    });
    
    await createNotification(req, req.user._id, {
      title: 'Shipment Accepted',
      message: `You accepted the shipment to ${shipment.drop}.`,
      type: 'SUCCESS',
      category: 'Shipments',
      priority: 'Low',
      relatedEntityId: shipment._id,
      entityType: 'Shipment',
      link: '/driver-trips'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDriverStats = async (req, res) => {
  try {
    const total = await Shipment.countDocuments({ driver: req.user._id, isDeleted: { $ne: true } });
    const active = await Shipment.countDocuments({ driver: req.user._id, status: { $in: ['Pickup Confirmed', 'In Transit', 'Out for Delivery'] }, isDeleted: { $ne: true } });
    const completed = await Shipment.countDocuments({ driver: req.user._id, status: 'Delivered', isDeleted: { $ne: true } });
    const earned = await Shipment.aggregate([
      { $match: { driver: req.user._id, status: 'Delivered', isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$cost.total' } } },
    ]);
    
    // Calculate monthly earnings for charts
    const monthlyData = await Shipment.aggregate([
      { $match: { driver: req.user._id, status: 'Delivered', isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          earnings: { $sum: "$cost.total" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyEarnings = monthlyData.map(m => ({
      month: months[m._id - 1],
      earnings: m.earnings
    }));

    res.json({ 
      total, 
      active, 
      completed, 
      totalSpent: earned[0]?.total || 0,
      monthlyEarnings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateLocation = async (req, res) => {
  const { currentLocation, status } = req.body;
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, driver: req.user._id, isDeleted: { $ne: true } });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found or not assigned to you' });
    if (currentLocation) shipment.currentLocation = currentLocation;
    if (status) {
      shipment.status = status;
      shipment.timeline.push({ status, note: `Driver updated: ${currentLocation || status}` });
    }
    await shipment.save();
    res.json(shipment);
    
    if (status) {
      await createNotification(req, shipment.shipper, {
        title: `Shipment ${status}`,
        message: `Your shipment status is now: ${status}.`,
        type: 'INFO',
        category: 'Shipments',
        priority: 'Medium',
        relatedEntityId: shipment._id,
        entityType: 'Shipment',
        link: '/shipments'
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getShipperAnalytics = async (req, res) => {
  try {
    const shipments = await Shipment.find({ shipper: req.user._id, isDeleted: { $ne: true } })
      .populate('driver', 'vehicleCapacityKg capacityUnit');

    // Total spending and pool savings
    let totalSpent = 0;
    let totalSavings = 0;
    let activeShipments = 0;
    let deliveredShipments = 0;
    let cancelledShipments = 0;
    
    // New metrics
    let totalWeight = 0;
    let pooledCount = 0;
    let totalVehicleCapacity = 0;
    let assignedShipmentsCount = 0;
    let totalUtilization = 0;
    
    // Group by month
    const monthlyData = {};
    const routeData = {};
    const categoryData = {};

    shipments.forEach(s => {
      if (s.status === 'Delivered') {
        totalSpent += s.cost?.total || 0;
        totalSavings += s.cost?.poolDiscount || 0;
        deliveredShipments++;
      } else if (s.status === 'Cancelled') {
        cancelledShipments++;
      } else {
        activeShipments++;
      }

      totalWeight += s.weight || 0;
      if (s.isPooled) pooledCount++;

      if (s.driver && s.driver.vehicleCapacityKg) {
        assignedShipmentsCount++;
        totalVehicleCapacity += s.driver.vehicleCapacityKg;
        totalUtilization += (s.weight / s.driver.vehicleCapacityKg) * 100;
      }

      // Category aggregation
      const category = s.goodsType || 'Other';
      if (!categoryData[category]) {
        categoryData[category] = { name: category, value: 0 };
      }
      categoryData[category].value += 1;

      // Monthly aggregation
      const date = new Date(s.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { month: monthYear, spend: 0, savings: 0, count: 0 };
      }
      if (s.status === 'Delivered') {
        monthlyData[monthYear].spend += s.cost?.total || 0;
        monthlyData[monthYear].savings += s.cost?.poolDiscount || 0;
      }
      monthlyData[monthYear].count += 1;

      // Route aggregation
      const route = `${s.pickup.split(',')[0]} → ${s.drop.split(',')[0]}`;
      if (!routeData[route]) {
        routeData[route] = { route, count: 0 };
      }
      routeData[route].count += 1;
    });

    const monthlySpend = Object.values(monthlyData).sort((a, b) => new Date(a.month) - new Date(b.month));
    const routeAnalytics = Object.values(routeData).sort((a, b) => b.count - a.count).slice(0, 5); // top 5 routes
    const categories = Object.values(categoryData);

    const averageShipmentWeight = shipments.length > 0 ? (totalWeight / shipments.length) : 0;
    const averageVehicleCapacity = assignedShipmentsCount > 0 ? (totalVehicleCapacity / assignedShipmentsCount) : 0;
    const truckUtilization = assignedShipmentsCount > 0 ? (totalUtilization / assignedShipmentsCount) : 0;
    const poolingEfficiency = shipments.length > 0 ? (pooledCount / shipments.length) * 100 : 0;

    res.json({
      totalSpent,
      totalSavings,
      totalShipments: shipments.length,
      activeShipments,
      deliveredShipments,
      cancelledShipments,
      monthlySpend,
      routeAnalytics,
      categories,
      averageShipmentWeight,
      averageVehicleCapacity,
      truckUtilization,
      poolingEfficiency
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateShipment = async (req, res) => {
  const { pickup, drop, goodsType, bundles, weight, estimatedDelivery } = req.body;
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    
    // Business rule: Edit only if shipment is not yet accepted by a driver
    if (shipment.driver) {
      return res.status(400).json({ message: 'Cannot edit shipment. It has already been accepted by a driver.' });
    }

    if (bundles && (bundles !== shipment.bundles || pickup !== shipment.pickup || drop !== shipment.drop)) {
      shipment.cost = calculateCost(Number(bundles || shipment.bundles), pickup || shipment.pickup, drop || shipment.drop);
    }

    if (pickup) shipment.pickup = pickup;
    if (drop) shipment.drop = drop;
    if (goodsType) shipment.goodsType = goodsType;
    if (bundles) shipment.bundles = bundles;
    if (weight) shipment.weight = weight;
    if (estimatedDelivery) shipment.estimatedDelivery = estimatedDelivery;

    await shipment.save();
    res.json(shipment);
    
    await createNotification(req, req.user._id, {
      title: 'Shipment Updated',
      message: `Your shipment has been updated.`,
      type: 'INFO',
      category: 'Shipments',
      priority: 'Low',
      relatedEntityId: shipment._id,
      entityType: 'Shipment',
      link: '/shipments'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

    // Business rule: Delete only if auction has not started / driver hasn't accepted. 
    // Wait, auctions are separate, but if this is an auction-backed shipment? The requirement says "Delete only if auction has not started. Once a driver accepts, disable Edit/Delete."
    if (shipment.driver) {
      return res.status(400).json({ message: 'Cannot delete shipment. It has already been accepted by a driver.' });
    }

    // Checking if auction exists for this shipment (based on pickup/drop/weight correlation or auction creation logic)
    // Actually, in this app, auctions are created separately. But we'll enforce the driver check.
    shipment.isDeleted = true;
    shipment.status = 'Cancelled';
    await shipment.save();
    res.json({ message: 'Shipment deleted successfully' });
    
    await createNotification(req, req.user._id, {
      title: 'Shipment Deleted',
      message: `Your shipment has been deleted and cancelled.`,
      type: 'WARNING',
      category: 'Shipments',
      priority: 'Low',
      relatedEntityId: shipment._id,
      entityType: 'Shipment',
      link: '/shipments'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createShipment, getMyShipments, getShipmentById, updateShipmentStatus, getDashboardStats, getAvailableShipments, acceptShipment,  getDriverStats,
  updateLocation,
  getShipperAnalytics,
  updateShipment,
  deleteShipment,
};
