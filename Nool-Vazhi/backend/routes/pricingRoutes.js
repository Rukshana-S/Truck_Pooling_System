const express = require('express');
const router = express.Router();
const { getPricingEstimate, getSuggestedPrice } = require('../controllers/pricingController');

router.get('/estimate', getPricingEstimate);
router.get('/suggest', getSuggestedPrice);

module.exports = router;
