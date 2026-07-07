const Payment = require('../models/Payment');
const Shipment = require('../models/Shipment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Service to handle payment business logic.
 */
class PaymentService {
  /**
   * Initializes a new payment record and updates the shipment's payment status.
   */
  static async initializePayment({ shipmentId, shipperId, driverId, amount, type }) {
    const payment = new Payment({
      shipmentId,
      shipperId,
      driverId,
      amount,
      type,
      status: type === 'Advance' ? 'Pending Advance' : 'Pending Final Payment',
    });

    await payment.save();

    // Optionally sync shipment status if it's the first payment
    await Shipment.findByIdAndUpdate(shipmentId, {
      paymentStatus: payment.status
    });

    return payment;
  }

  /**
   * Process a payment update and sync with Shipment.
   */
  static async updatePaymentStatus(paymentId, newStatus, paymentMethod, transactionId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = newStatus;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (transactionId) payment.transactionId = transactionId;

    await payment.save();

    // Sync to Shipment
    // Based on the payment update, we update the shipment's overall payment status
    const shipment = await Shipment.findById(payment.shipmentId);
    if (shipment) {
      if (newStatus === 'Advance Paid' && shipment.paymentStatus === 'Pending Advance') {
        shipment.paymentStatus = 'Advance Paid';
      } else if (newStatus === 'Fully Paid') {
        shipment.paymentStatus = 'Fully Paid';
      } else if (newStatus === 'Pending Final Payment') {
        shipment.paymentStatus = 'Pending Final Payment';
      }
      await shipment.save();
    }

    return payment;
  }

  /**
   * Create a Razorpay Order
   */
  static async createRazorpayOrder(amount, receiptId) {
    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: 'INR',
      receipt: receiptId,
    };
    const order = await razorpayInstance.orders.create(options);
    return order;
  }

  /**
   * Verify Razorpay Payment Signature
   */
  static verifyRazorpayPayment(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }
}

module.exports = PaymentService;
