const { handleError } = require('../utils/errorHandler');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const PaymentService = require('../services/paymentService');
const Shipment = require('../models/Shipment');
const User = require('../models/User'); // For checking driver and organization

// Helper function to check DB connection
const checkDBConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database connection unavailable.');
  }
};

// 1. Create a Payment
const createPayment = async (req, res) => {
  try {
    checkDBConnection();
    const { shipmentId, amount, type } = req.body;
    
    // 1. Validate required fields
    if (!shipmentId || !amount || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // 2. Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    // 3. Verify Shipment exists
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }
    
    // 4. Verify Organization (Shipper) exists
    if (!shipment.shipper) {
      return res.status(400).json({ success: false, message: 'Shipment has no organization assigned.' });
    }
    const organization = await User.findById(shipment.shipper);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    // 5. Verify Driver exists
    if (!shipment.driver) {
       return res.status(400).json({ success: false, message: 'Shipment must be assigned to a driver before creating a payment.' });
    }
    const driver = await User.findById(shipment.driver);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    // 6. Prevent Duplicate Payments
    const existingPayment = await Payment.findOne({ shipmentId: shipment._id, type });
    if (existingPayment) {
      if (existingPayment.status !== 'Pending Advance' && existingPayment.status !== 'Pending Final Payment') {
         return res.status(400).json({ success: false, message: 'Payment already completed for this type.' });
      }

      if (!existingPayment.razorpayOrderId) {
        // Generate missing Razorpay Order
        const razorpayOrder = await PaymentService.createRazorpayOrder(amount, existingPayment._id.toString());
        existingPayment.razorpayOrderId = razorpayOrder.id;
        await existingPayment.save();
        
        return res.status(201).json({
          success: true,
          message: 'Payment order generated successfully.',
          data: {
            payment: existingPayment,
            razorpayOrder
          }
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Payment order already generated.',
        data: {
          payment: existingPayment,
          razorpayOrder: {
            id: existingPayment.razorpayOrderId,
            amount: existingPayment.amount * 100
          }
        }
      });
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
    // Will throw custom errors if keys are missing or Razorpay API fails
    const razorpayOrder = await PaymentService.createRazorpayOrder(amount, payment._id.toString());
    
    // Store razorpayOrderId in our payment record
    payment.razorpayOrderId = razorpayOrder.id;
    await payment.save();

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully.',
      data: {
        payment,
        razorpayOrder
      }
    });
  } catch (err) {
    console.error("Payment Error [createPayment]:", err);
    
    // Custom handling for specific errors
    if (err.message === 'Database connection unavailable.') {
      return res.status(503).json({ success: false, message: err.message });
    }
    if (err.message === 'Payment gateway configuration missing.') {
      return handleError(res, err);
    }
    
    // Default 500 error without exposing stack traces
    return handleError(res, err);
  }
};

// 2. Get Payment by ID
const getPaymentById = async (req, res) => {
  try {
    checkDBConnection();
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('shipmentId', 'shipmentId pickup drop')
      .populate('shipperId', 'name businessName')
      .populate('driverId', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    
    // Auth check: Only shipper or driver of this payment can view it
    if (
      req.user._id.toString() !== payment.shipperId._id.toString() &&
      req.user._id.toString() !== payment.driverId._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    return res.json({ success: true, message: 'Payment retrieved successfully.', data: payment });
  } catch (err) {
    console.error("Payment Error [getPaymentById]:", err);
    return handleError(res, err);
  }
};

// 3. Get Payments for a Shipment
const getShipmentPayments = async (req, res) => {
  try {
    checkDBConnection();
    const { shipmentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    const payments = await Payment.find({ shipmentId })
      .populate('shipperId', 'name')
      .populate('driverId', 'name')
      .sort({ createdAt: 1 });
      
    return res.json({ success: true, message: 'Payments retrieved successfully.', data: payments });
  } catch (err) {
    console.error("Payment Error [getShipmentPayments]:", err);
    return handleError(res, err);
  }
};

// 3.5 Get My Payments
const getMyPayments = async (req, res) => {
  try {
    checkDBConnection();
    
    // Find payments where user is either shipper or driver
    const query = req.user.role === 'driver' 
      ? { driverId: req.user._id } 
      : { shipperId: req.user._id };

    const payments = await Payment.find(query)
      .populate('shipmentId', 'shipmentId pickup drop')
      .populate('driverId', 'name')
      .populate('shipperId', 'name businessName')
      .sort({ createdAt: -1 });

    return res.json({ success: true, message: 'Payments retrieved successfully.', data: payments });
  } catch (err) {
    console.error("Payment Error [getMyPayments]:", err);
    return handleError(res, err);
  }
};

// 4. Update Payment Status (e.g. after manual successful transaction if needed)
const updatePaymentStatus = async (req, res) => {
  try {
    checkDBConnection();
    const { status, paymentMethod, transactionId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }
    
    // Validate status string
    const validStatuses = ['Pending Advance', 'Advance Paid', 'Pending Final Payment', 'Fully Paid'];
    if (!validStatuses.includes(status)) {
       return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    }

    const updatedPayment = await PaymentService.updatePaymentStatus(
      req.params.id,
      status,
      paymentMethod,
      transactionId
    );

    return res.json({ success: true, message: 'Payment status updated.', data: updatedPayment });
  } catch (err) {
    console.error("Payment Error [updatePaymentStatus]:", err);
    if (err.message === 'Payment not found') {
       return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    return handleError(res, err);
  }
};

// 5. Verify Razorpay Payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    checkDBConnection();
    console.log("Verify Payment Payload:", req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId, status } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId || !status) {
      console.log("Missing fields in verify payload");
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      console.log("Invalid paymentId:", paymentId);
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    // verifyRazorpayPayment handles configuration check and signature validation
    const isValid = PaymentService.verifyRazorpayPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.log("Signature mismatch!");
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    // Update the payment record with Razorpay IDs and the new status
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    
    await payment.save();

    // Call updatePaymentStatus in service to update local payment status and sync with shipment
    const updatedPayment = await PaymentService.updatePaymentStatus(
      paymentId,
      status, // e.g. 'Advance Paid' or 'Fully Paid'
      'Razorpay',
      razorpay_payment_id
    );

    // Notify driver about Advance Payment
    const { createNotification } = require('../services/notificationService');
    if (status === 'Advance Paid') {
      await createNotification({ app: req.app }, payment.driverId, {
        title: 'Advance Payment Received',
        message: `The shipper has paid the advance for the shipment. You can now confirm the pickup.`,
        type: 'Payment',
        category: 'Payments',
        priority: 'High',
        relatedEntityId: payment.shipmentId,
        entityType: 'Shipment'
      });
    } else if (status === 'Fully Paid') {
      await createNotification({ app: req.app }, payment.driverId, {
        title: 'Final Payment Received',
        message: `The shipper has paid the final amount (90%) for the shipment.`,
        type: 'Payment',
        category: 'Payments',
        priority: 'High',
        relatedEntityId: payment.shipmentId,
        entityType: 'Shipment'
      });
    }

    return res.json({ success: true, message: 'Payment verified successfully.', data: updatedPayment });
  } catch (err) {
    console.error("Payment Error [verifyRazorpayPayment]:", err);
    if (err.message === 'Payment gateway configuration missing.') {
      return handleError(res, err);
    }
    return handleError(res, err);
  }
};

module.exports = {
  createPayment,
  getPaymentById,
  getShipmentPayments,
  getMyPayments,
  updatePaymentStatus,
  verifyRazorpayPayment
};
