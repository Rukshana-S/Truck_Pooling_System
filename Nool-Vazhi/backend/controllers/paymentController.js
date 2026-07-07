const Payment = require('../models/Payment');
const PaymentService = require('../services/paymentService');
const Shipment = require('../models/Shipment');

// 1. Create a Payment
const createPayment = async (req, res) => {
  try {
    const { shipmentId, amount, type } = req.body;
    
    // Basic validation
    if (!shipmentId || !amount || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    
    if (!shipment.driver) {
       return res.status(400).json({ message: 'Shipment must be assigned to a driver before creating a payment' });
    }

    // Initialize through service
    let payment = await PaymentService.initializePayment({
      shipmentId: shipment._id,
      shipperId: shipment.shipper,
      driverId: shipment.driver,
      amount,
      type
    });

    // Create Razorpay Order
    const razorpayOrder = await PaymentService.createRazorpayOrder(amount, payment.paymentId);
    
    // Store razorpayOrderId in our payment record
    payment.razorpayOrderId = razorpayOrder.id;
    await payment.save();

    res.status(201).json({
      payment,
      razorpayOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get Payment by ID
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('shipmentId', 'shipmentId pickup drop')
      .populate('shipperId', 'name businessName')
      .populate('driverId', 'name');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    
    // Auth check: Only shipper or driver of this payment can view it
    if (
      req.user._id.toString() !== payment.shipperId._id.toString() &&
      req.user._id.toString() !== payment.driverId._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Get Payments for a Shipment
const getShipmentPayments = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const payments = await Payment.find({ shipmentId })
      .populate('shipperId', 'name')
      .populate('driverId', 'name')
      .sort({ createdAt: 1 });
      
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Update Payment Status (e.g. after successful transaction)
const updatePaymentStatus = async (req, res) => {
  try {
    const { status, paymentMethod, transactionId } = req.body;
    
    // Validate status string
    const validStatuses = ['Pending Advance', 'Advance Paid', 'Pending Final Payment', 'Fully Paid'];
    if (!validStatuses.includes(status)) {
       return res.status(400).json({ message: 'Invalid payment status' });
    }

    const updatedPayment = await PaymentService.updatePaymentStatus(
      req.params.id,
      status,
      paymentMethod,
      transactionId
    );

    res.json(updatedPayment);
  } catch (error) {
    if (error.message === 'Payment not found') {
       return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// 5. Verify Razorpay Payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId, status } = req.body;

    const isValid = PaymentService.verifyRazorpayPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Update the payment record with Razorpay IDs and the new status
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    // We already have razorpayOrderId saved during createPayment, but we can verify it matches
    
    await payment.save();

    // Call updatePaymentStatus in service to update local payment status and sync with shipment
    const updatedPayment = await PaymentService.updatePaymentStatus(
      paymentId,
      status, // e.g. 'Advance Paid' or 'Fully Paid'
      'Razorpay',
      razorpay_payment_id
    );

    res.json({ message: 'Payment verified successfully', payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPayment,
  getPaymentById,
  getShipmentPayments,
  updatePaymentStatus,
  verifyRazorpayPayment
};
