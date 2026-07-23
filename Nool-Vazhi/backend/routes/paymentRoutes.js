const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPayment,
  getPaymentById,
  getShipmentPayments,
  getMyPayments,
  updatePaymentStatus,
  verifyRazorpayPayment
} = require('../controllers/paymentController');

// All payment routes are protected
router.use(protect);

router.post('/razorpay/verify', verifyRazorpayPayment);
router.post('/', createPayment);
router.get('/', getMyPayments);
router.get('/shipment/:shipmentId', getShipmentPayments);
router.get('/:id', getPaymentById);
router.put('/:id/status', updatePaymentStatus);

module.exports = router;
