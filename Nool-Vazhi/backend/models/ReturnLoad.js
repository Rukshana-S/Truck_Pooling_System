const mongoose = require('mongoose');

const returnLoadSchema = new mongoose.Schema(
  {
    returnLoadId: { type: String, unique: true },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    pickup: { type: String, required: true },
    destination: { type: String, required: true },
    goodsType: { type: String, required: true },
    weight: { type: Number, required: true },
    offeredPrice: { type: Number, required: true },
    vehicleCapacity: { type: Number, required: true },
    
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Withdrawn', 'Completed'],
      default: 'Pending',
    },
    
    pickupTime: { type: Date, default: null },
    remarks: { type: String, default: '' },
    
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate return load ID
returnLoadSchema.pre('save', function (next) {
  if (!this.returnLoadId) {
    this.returnLoadId = 'RL' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('ReturnLoad', returnLoadSchema);
