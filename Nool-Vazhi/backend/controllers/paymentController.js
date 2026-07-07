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
    const payment = await PaymentService.initializePayment({
      shipmentId: shipment._id,
      shipperId: shipment.shipper,
      driverId: shipment.driver,
      amount,
      type
    });

    res.status(201).json(payment);
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

module.exports = {
  createPayment,
  getPaymentById,
  getShipmentPayments,
  updatePaymentStatus
};
