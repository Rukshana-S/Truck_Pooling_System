const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  auctionId: { type: String, unique: true },
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  fromLocation: { type: String, required: true },
  toLocation: { type: String, required: true },
  weight: { type: Number, required: true },           // total kg needed
  goodsType: { type: String, default: '' },
  description: { type: String, default: '' },

  auctionDuration: { type: Number, required: true },  // minutes
  auctionStartTime: { type: Date, required: true },
  auctionEndTime: { type: Date, required: true },

  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'SELECTED', 'CONFIRMED', 'CANCELLED'],
    default: 'OPEN',
  },

  // After shipper selects drivers
  selections: [{
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedWeight: { type: Number },
    pricePerKg: { type: Number },
    totalPrice: { type: Number },
    driverStatus: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
    currentLocation: { type: String, default: '' },
    deliveryStatus: {
      type: String,
      enum: ['Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered'],
      default: 'Pickup Confirmed',
    },
    timeline: [{
      status: String,
      location: String,
      timestamp: { type: Date, default: Date.now },
      note: String,
    }],
  }],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

auctionSchema.pre('save', function (next) {
  if (!this.auctionId) this.auctionId = 'AU' + Date.now().toString().slice(-8);
  next();
});

// Auto-close if past end time
auctionSchema.virtual('isExpired').get(function () {
  return new Date() >= this.auctionEndTime;
});

auctionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('AuctionRequest', auctionSchema);
