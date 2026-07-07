const express = require('express');
const router = express.Router();
const { getDriverEarnings, updatePayment } = require('../controllers/earningsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getDriverEarnings);
router.put('/:bookingId/payment', updatePayment);

module.exports = router;
