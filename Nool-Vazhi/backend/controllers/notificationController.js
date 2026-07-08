const { handleError } = require('../utils/errorHandler');
const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, filter = 'all' } = req.query;
    const query = { user: req.user._id, isDeleted: { $ne: true } };
    
    if (filter === 'unread') query.read = false;
    else if (filter === 'read') query.read = true;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
      
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isDeleted: { $ne: true }, read: false });

    res.json({ notifications, total, unreadCount, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    handleError(res, err);
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false, isDeleted: { $ne: true } }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    handleError(res, err);
  }
};

const markSingleAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    handleError(res, err);
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isDeleted: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    handleError(res, err);
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isDeleted: { $ne: true } }, { isDeleted: true });
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = { getNotifications, markAsRead, markSingleAsRead, deleteNotification, deleteAllNotifications };
