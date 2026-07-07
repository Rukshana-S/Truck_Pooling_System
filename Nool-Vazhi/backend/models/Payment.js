const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, unique: true },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    shipperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['Advance', 'Final'], 
      required: true 
    },
    status: {
      type: String,
      enum: ['Pending Advance', 'Advance Paid', 'Pending Final Payment', 'Fully Paid'],
      default: 'Pending Advance',
    },
    paymentMethod: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate payment ID
paymentSchema.pre('save', function (next) {
  if (!this.paymentId) {
    this.paymentId = 'PAY' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
