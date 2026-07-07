const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markSingleAsRead, deleteNotification, deleteAllNotifications } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.route('/')
  .get(getNotifications)
  .put(markAsRead)
  .delete(deleteAllNotifications);

router.route('/:id')
  .put(markSingleAsRead)
  .delete(deleteNotification);

module.exports = router;
