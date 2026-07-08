const { handleError } = require('../utils/errorHandler');
const Rating = require('../models/Rating');
const User = require('../models/User');

const addRating = async (req, res) => {
  const { tripId, toUserId, rating, comment } = req.body;
  const fromUserId = req.user._id;

  try {
    if (!tripId || !toUserId || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if already rated
    const existing = await Rating.findOne({ tripId, fromUser: fromUserId, toUser: toUserId });
    if (existing) {
      return res.status(400).json({ message: 'You have already rated this user for this trip' });
    }

    const newRating = await Rating.create({
      tripId,
      fromUser: fromUserId,
      toUser: toUserId,
      rating: Number(rating),
      comment: comment || '',
    });

    // Update user average rating
    const toUser = await User.findById(toUserId);
    if (toUser) {
      const currentAvg = toUser.rating || 0;
      const currentTotal = toUser.totalRatings || 0;
      
      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + Number(rating)) / newTotal;

      toUser.rating = newAvg;
      toUser.totalRatings = newTotal;
      await toUser.save();
    }

    res.status(201).json({ message: 'Rating submitted successfully', rating: newRating });
  } catch (err) {
    handleError(res, err);
  }
};

const getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ toUser: req.params.userId })
      .populate('fromUser', 'name businessName role')
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    handleError(res, err);
  }
};

const updateRating = async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const existingRating = await Rating.findOne({ _id: req.params.id, fromUser: req.user._id });
    if (!existingRating) return res.status(404).json({ message: 'Rating not found' });

    // Business rule: Can only update within 24 hours
    const hoursSinceCreation = (new Date() - existingRating.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({ message: 'Ratings can only be edited within 24 hours of submission.' });
    }

    const oldRatingValue = existingRating.rating;
    existingRating.rating = Number(rating) || existingRating.rating;
    if (comment !== undefined) existingRating.comment = comment;

    await existingRating.save();

    // Recalculate user average if rating changed
    if (oldRatingValue !== existingRating.rating) {
      const toUser = await User.findById(existingRating.toUser);
      if (toUser && toUser.totalRatings > 0) {
        // Reverse old rating from sum and add new rating
        const sum = (toUser.rating * toUser.totalRatings) - oldRatingValue + existingRating.rating;
        toUser.rating = sum / toUser.totalRatings;
        await toUser.save();
      }
    }

    res.json({ message: 'Rating updated successfully', rating: existingRating });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = { addRating, getUserRatings, updateRating };
