const express = require('express');
const router = express.Router();
const { trackShipment, updateTrackingStatus } = require('../controllers/trackingController');

router.get('/:trackingId', trackShipment);
router.put('/:trackingId/status', updateTrackingStatus);

module.exports = router;
