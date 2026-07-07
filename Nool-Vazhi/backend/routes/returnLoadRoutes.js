const express = require('express');
const router = express.Router();
const {
  findRecommendations,
  requestReturnLoad,
  updateRequestStatus,
  getReturnLoadHistory,
  getOrganizationRequests,
  getAnalytics
} = require('../controllers/returnLoadController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Common Routes
router.get('/analytics', protect, getAnalytics);

// Driver Routes
router.get('/recommendations', protect, authorize('driver'), findRecommendations);
router.post('/request', protect, authorize('driver'), requestReturnLoad);
router.get('/history', protect, authorize('driver'), getReturnLoadHistory);

// Organization Routes
router.get('/organization-requests', protect, authorize('organization'), getOrganizationRequests);
router.put('/:id/status', protect, authorize('organization'), updateRequestStatus);

module.exports = router;
