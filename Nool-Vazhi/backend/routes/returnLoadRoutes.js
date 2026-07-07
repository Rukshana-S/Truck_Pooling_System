const express = require('express');
const router = express.Router();
const {
  findRecommendations,
  requestReturnLoad,
  updateDriverRequest,
  updateOrgRequest,
  softDeleteReturnLoad,
  getDriverReturnLoads,
  getOrgReturnLoads,
  getAnalytics
} = require('../controllers/returnLoadController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Common Routes
router.get('/analytics', protect, getAnalytics);
router.delete('/:id', protect, softDeleteReturnLoad);

// Driver Routes
router.get('/recommendations', protect, authorize('driver'), findRecommendations);
router.post('/request', protect, authorize('driver'), requestReturnLoad);
router.get('/driver', protect, authorize('driver'), getDriverReturnLoads);
router.put('/driver/:id', protect, authorize('driver'), updateDriverRequest);

// Organization Routes
router.get('/organization', protect, authorize('organization'), getOrgReturnLoads);
router.put('/organization/:id', protect, authorize('organization'), updateOrgRequest);

module.exports = router;
