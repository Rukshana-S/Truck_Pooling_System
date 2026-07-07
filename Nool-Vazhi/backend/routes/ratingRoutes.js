const express = require('express');
const router = express.Router();
const { addRating, getUserRatings, updateRating } = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addRating);
router.get('/user/:userId', protect, getUserRatings);
router.put('/:id', protect, updateRating);

module.exports = router;
