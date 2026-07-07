const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  bidId: { type: String, unique: true },
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'AuctionRequest', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  pricePerKg: { type: Number, required: true },
  totalPrice: { type: Number, required: true },   // pricePerKg * auction.weight

  status: {
    type: String,
    enum: ['ACTIVE', 'SELECTED', 'REJECTED', 'ACCEPTED', 'CANCELLED'],
    default: 'ACTIVE',
  },
}, { timestamps: true });

bidSchema.pre('save', function (next) {
  if (!this.bidId) this.bidId = 'BD' + Date.now().toString().slice(-8);
  next();
});

module.exports = mongoose.model('Bid', bidSchema);
