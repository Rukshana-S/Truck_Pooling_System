const express = require('express');
const router = express.Router();
const { trackShipment, updateTrackingStatus, updateGpsLocation } = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:trackingId', protect, trackShipment);
router.put('/:trackingId/status', protect, updateTrackingStatus);
router.put('/:trackingId/location', protect, updateGpsLocation);

module.exports = router;
