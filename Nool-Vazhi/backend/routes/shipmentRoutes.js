const express = require('express');
const router = express.Router();
const {
  createShipment, getMyShipments, getShipmentById, updateShipmentStatus, demoUpdateStatus,
  getDashboardStats, getAvailableShipments, acceptShipment, getDriverStats, updateLocation, getShipperAnalytics,
  updateShipment, deleteShipment
} = require('../controllers/shipmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/stats', getDashboardStats);
router.get('/analytics', getShipperAnalytics);
router.get('/driver-stats', getDriverStats);
router.get('/available', getAvailableShipments);
router.put('/:id/accept', acceptShipment);
router.put('/:id/location', updateLocation);
router.route('/').get(getMyShipments).post(createShipment);
router.route('/:id')
  .get(getShipmentById)
  .put(updateShipment)
  .delete(deleteShipment);
router.put('/:id/status', updateShipmentStatus);
router.put('/:id/demo-status', demoUpdateStatus);

module.exports = router;
