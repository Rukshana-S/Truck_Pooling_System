const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/adminController');

router.use(protect);
router.use(adminOnly); // Only accessible by admin role

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/approve', approveKyc);

// Platform Entities
router.get('/shipments', getShipments);
router.delete('/shipments/:id', deleteShipmentAdmin);

router.get('/auctions', getAuctions);
router.put('/auctions/:id/cancel', cancelAuctionAdmin);

module.exports = router;
