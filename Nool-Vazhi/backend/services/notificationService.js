const Notification = require('../models/Notification');

/**
 * Creates and emits a notification to one or more users
 * @param {Object} req - The Express request object (must have req.io)
 * @param {String|Array} userIds - A single user ID or an array of user IDs
 * @param {Object} data - The notification data
 * @param {String} data.title
 * @param {String} data.message
 * @param {String} data.type - 'INFO', 'SUCCESS', 'WARNING', 'ERROR'
 * @param {String} data.category - 'Auctions', 'Shipments', 'Marketplace', 'Payments', 'Return Loads', 'System'
 * @param {String} data.priority - 'High', 'Medium', 'Low'
 * @param {String} data.relatedEntityId - ObjectId
 * @param {String} data.entityType - Collection name e.g. 'Shipment'
 * @param {String} data.link - URL to navigate to
 */
const createNotification = async (req, userIds, data) => {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (!ids.length) return;

    const notifications = ids.map(id => ({
      user: id,
      recipientRole: data.recipientRole || undefined,
      sender: data.sender || undefined,
      title: data.title,
      message: data.message,
      type: data.type || 'INFO',
      category: data.category || 'System',
      priority: data.priority || 'Low',
      relatedEntityId: data.relatedEntityId || null,
      entityType: data.entityType || '',
      link: data.link || '',
      read: false,
      isDeleted: false
    }));

    // Insert into DB
    const inserted = await Notification.insertMany(notifications);

    // Emit via Socket.io
    if (req.io) {
      inserted.forEach(notification => {
        req.io.to(notification.user.toString()).emit('new_notification', notification);
      });
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { createNotification };
