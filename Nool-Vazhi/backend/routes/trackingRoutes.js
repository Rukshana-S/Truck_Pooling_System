const express = require('express');
const router = express.Router();
const { trackShipment } = require('../controllers/trackingController');

router.get('/:trackingId', trackShipment);

module.exports = router;
