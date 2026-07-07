const Payment = require('../models/Payment');
const Shipment = require('../models/Shipment');

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
}

module.exports = PaymentService;
