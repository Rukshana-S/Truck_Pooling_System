const User = require('../models/User');
const Shipment = require('../models/Shipment');
const AuctionRequest = require('../models/AuctionRequest');
const { createNotification } = require('../services/notificationService');

// ─── USER MANAGEMENT ──────────────────────────────────────────────

// Get all users with filters
const getUsers = async (req, res) => {
  const { role, isDeleted } = req.query;
  try {
    const query = {};
    if (role) query.role = role;
    if (isDeleted !== undefined) query.isDeleted = isDeleted === 'true';
    
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Update basic fields
    const fields = ['name', 'phone', 'location', 'businessName', 'gst', 'industry', 'licenseNumber', 'vehicleType', 'vehicleNumber', 'capacity', 'capacityUnit', 'vehicleCapacity', 'vehicleCapacityKg', 'fuelType', 'availability', 'currentLocation'];
    fields.forEach(f => { if (req.body[f] !== undefined) user[f] = req.body[f]; });

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isDeleted = true;
    await user.save();
    res.json({ message: 'User soft deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.kycStatus = 'rejected';
    await user.save();
    res.json({ message: 'User suspended' });
    
    await createNotification(req, user._id, {
      title: 'Account Suspended',
      message: `Your account KYC has been rejected or suspended by the admin.`,
      type: 'ERROR',
      category: 'System',
      priority: 'High',
      relatedEntityId: user._id,
      entityType: 'User',
      link: '/profile'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveKyc = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.kycStatus = 'verified';
    user.isVerified = true;
    await user.save();
    res.json({ message: 'KYC verified' });
    
    await createNotification(req, user._id, {
      title: 'KYC Verified',
      message: `Congratulations! Your KYC details have been verified successfully.`,
      type: 'SUCCESS',
      category: 'System',
      priority: 'High',
      relatedEntityId: user._id,
      entityType: 'User',
      link: '/profile'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PLATFORM ENTITY MANAGEMENT ─────────────────────────────────────

// Get all shipments
const getShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate('shipper', 'name businessName phone')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 });
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin delete shipment
const deleteShipmentAdmin = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    shipment.isDeleted = true;
    shipment.status = 'Cancelled';
    await shipment.save();
    res.json({ message: 'Shipment deleted by Admin' });
    
    const usersToNotify = [shipment.shipper];
    if (shipment.driver) usersToNotify.push(shipment.driver);

    await createNotification(req, usersToNotify, {
      title: 'Shipment Cancelled by Admin',
      message: `A shipment was cancelled and deleted by the platform administrator.`,
      type: 'WARNING',
      category: 'System',
      priority: 'High',
      relatedEntityId: shipment._id,
      entityType: 'Shipment',
      link: '/shipments'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all auctions
const getAuctions = async (req, res) => {
  try {
    const auctions = await AuctionRequest.find()
      .populate('shipper', 'name businessName')
      .sort({ createdAt: -1 });
    res.json(auctions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin cancel auction
const cancelAuctionAdmin = async (req, res) => {
  try {
    const auction = await AuctionRequest.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    auction.status = 'CANCELLED';
    await auction.save();
    res.json({ message: 'Auction cancelled by Admin' });
    
    await createNotification(req, auction.shipper, {
      title: 'Auction Cancelled by Admin',
      message: `Your auction was cancelled by the platform administrator.`,
      type: 'WARNING',
      category: 'System',
      priority: 'High',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/auction'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  suspendUser,
  approveKyc,
  getShipments,
  deleteShipmentAdmin,
  getAuctions,
  cancelAuctionAdmin,
};
