const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPayment,
  getPaymentById,
  getShipmentPayments,
  updatePaymentStatus
} = require('../controllers/paymentController');

// All payment routes are protected
router.use(protect);

router.post('/', createPayment);
router.get('/:id', getPaymentById);
router.get('/shipment/:shipmentId', getShipmentPayments);
router.put('/:id/status', updatePaymentStatus);

module.exports = router;
