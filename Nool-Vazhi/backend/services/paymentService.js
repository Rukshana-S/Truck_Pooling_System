const Payment = require('../models/Payment');
const Shipment = require('../models/Shipment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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
    // Based on the payment update, we update the shipment's overall payment status and tracking status
    const shipment = await Shipment.findById(payment.shipmentId);
    if (shipment) {
      if (newStatus === 'Advance Paid') {
        shipment.paymentStatus = 'Advance Paid';
        
        // Also advance the tracking status to unlock driver actions
        if (!['Advance Paid', 'Pickup Started', 'Loaded', 'In Transit', 'Near Destination', 'Delivered'].includes(shipment.currentStatus)) {
          shipment.currentStatus = 'Advance Paid';
          shipment.statusUpdatedAt = Date.now();
          shipment.trackingHistory.push({
            status: 'Advance Paid',
            note: 'Advance Payment Completed',
            timestamp: Date.now()
          });
        }
      } else if (newStatus === 'Fully Paid') {
        shipment.paymentStatus = 'Fully Paid';
        
        // Also advance tracking status to Final Payment Completed
        if (shipment.currentStatus === 'Delivered') {
          shipment.currentStatus = 'Final Payment Completed';
          shipment.statusUpdatedAt = Date.now();
          shipment.trackingHistory.push({
            status: 'Final Payment Completed',
            note: 'Final Payment Completed',
            timestamp: Date.now()
          });
        }
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
    if (!razorpayInstance) {
      throw new Error('Payment gateway configuration missing.');
    }
    
    try {
      const options = {
        amount: amount * 100, // Razorpay works in paise
        currency: 'INR',
        receipt: receiptId,
      };
      const order = await razorpayInstance.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay Error [createRazorpayOrder]:', error);
      throw new Error('Failed to create payment order with Razorpay.');
    }
  }

  /**
   * Verify Razorpay Payment Signature
   */
  static verifyRazorpayPayment(orderId, paymentId, signature) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Payment gateway configuration missing.');
    }
    
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }
}

module.exports = PaymentService;
