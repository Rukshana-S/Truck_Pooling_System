const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: { type: String, unique: true },
    shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    goodsType: { type: String, required: true },
    bundles: { type: Number, required: true },
    weight: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    cost: {
      baseCost: { type: Number, default: 0 },
      perBundle: { type: Number, default: 0 },
      poolDiscount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ['Pending Advance', 'Advance Paid', 'Pending Final Payment', 'Fully Paid'],
      default: 'Pending Advance',
    },
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    // New Advanced Tracking Fields (Phase 1)
    currentStatus: {
      type: String,
      enum: [
        'Pending',
        'Accepted',
        'Advance Paid',
        'Pickup Started',
        'Loaded',
        'In Transit',
        'Near Destination',
        'Delivered',
        'Final Payment Completed',
        'Shipment Completed'
      ],
      default: 'Pending'
    },
    trackingHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      }
    ],
    statusUpdatedAt: { type: Date, default: Date.now },
    currentLocation: { type: String, default: '' },
    currentGpsLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    estimatedDelivery: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate shipment ID
shipmentSchema.pre('save', async function (next) {
  if (!this.shipmentId) {
    this.shipmentId = 'NV' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('Shipment', shipmentSchema);
