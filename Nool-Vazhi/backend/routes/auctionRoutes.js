const express = require('express');
const router = express.Router();
const {
  createAuction, getMyAuctions, getAuctionBids, selectDrivers,
  getOpenAuctions, placeBid, getDriverSelections, respondToSelections,
  closeAuction, updateAuctionLocation,
  updateAuction, cancelAuction, deleteAuction, withdrawBid,
} = require('../controllers/auctionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Static routes FIRST
router.get('/my', getMyAuctions);
router.get('/open', getOpenAuctions);
router.post('/bid', placeBid);
router.delete('/:auctionId/bid', withdrawBid);
router.get('/driver/selections', getDriverSelections);
router.post('/driver/respond', respondToSelections);
router.post('/', createAuction);

// Param routes LAST
router.route('/:id')
  .put(updateAuction)
  .delete(deleteAuction);

router.get('/:id/bids', getAuctionBids);
router.post('/:id/select', selectDrivers);
router.put('/:id/close', closeAuction);
router.put('/:id/cancel', cancelAuction);
router.put('/:id/update-location', updateAuctionLocation);

module.exports = router;
