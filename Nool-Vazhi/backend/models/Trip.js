const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    tripId: { type: String, unique: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    fromLocation: { type: String, required: true },
    toLocation: { type: String, required: true },

    totalCapacity: { type: Number, required: true },       // kg
    availableCapacity: { type: Number, required: true },   // kg (decrements on booking)
    pricePerKg: { type: Number, required: true },          // ₹ per kg

    departureTime: { type: Date, default: null },
    vehicleNumber: { type: String, default: '' },

    // Return trip
    hasReturnTrip: { type: Boolean, default: false },
    returnTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },

    status: {
      type: String,
      enum: ['ACTIVE', 'FULL', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
    },

    minimumBookingKg: { type: Number, default: 1 },
    currentLocation: { type: String, default: '' },
    isStarted: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tripSchema.pre('save', function (next) {
  if (!this.tripId) {
    this.tripId = 'TR' + Date.now().toString().slice(-8);
  }
  // Auto-mark FULL
  if (this.availableCapacity <= 0) {
    this.availableCapacity = 0;
    this.status = 'FULL';
  }
  next();
});

// Virtual: capacity used percentage
tripSchema.virtual('capacityUsedPct').get(function () {
  return Math.round(((this.totalCapacity - this.availableCapacity) / this.totalCapacity) * 100);
});

// Virtual: discounted price when capacity is low
tripSchema.virtual('effectivePricePerKg').get(function () {
  const pct = this.capacityUsedPct;
  if (pct >= 80) return Math.round(this.pricePerKg * 0.85); // 15% discount
  if (pct >= 50) return Math.round(this.pricePerKg * 0.95); // 5% discount
  return this.pricePerKg;
});

tripSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Trip', tripSchema);
