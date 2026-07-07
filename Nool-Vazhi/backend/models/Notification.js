const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientRole: { type: String, enum: ['organization', 'driver', 'admin'] },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'], default: 'INFO' },
  category: { type: String, enum: ['Auctions', 'Shipments', 'Marketplace', 'Payments', 'Return Loads', 'System'], default: 'System' },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
  entityType: { type: String },
  read: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  link: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
