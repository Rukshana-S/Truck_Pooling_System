const { handleError } = require('../utils/errorHandler');
const AuctionRequest = require('../models/AuctionRequest');
const { createNotification } = require('../services/notificationService');
const Bid = require('../models/Bid');
const User = require('../models/User');

const broadcastBidUpdate = async (req, auctionId) => {
  if (!req.io) return;
  try {
    const bids = await Bid.find({ auction: auctionId, status: { $in: ['ACTIVE', 'SELECTED', 'ACCEPTED', 'REJECTED'] } })
      .sort({ pricePerKg: 1 });
    
    if (bids.length > 0) {
      const lowestBid = bids[0].pricePerKg;
      req.io.to(auctionId.toString()).emit('bid_update', {
        auctionId,
        lowestBid,
        totalBids: bids.length
      });
    } else {
      req.io.to(auctionId.toString()).emit('bid_update', {
        auctionId,
        lowestBid: null,
        totalBids: 0
      });
    }
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }
};

// ─── SHIPPER ────────────────────────────────────────────

// Create auction request
const createAuction = async (req, res) => {
  const { fromLocation, toLocation, weight, goodsType, description, auctionDuration } = req.body;
  try {
    const now = new Date();
    const endTime = new Date(now.getTime() + Number(auctionDuration) * 60 * 1000);
    const auction = await AuctionRequest.create({
      shipper: req.user._id,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      weight: Number(weight),
      goodsType: goodsType || '',
      description: description || '',
      auctionDuration: Number(auctionDuration),
      auctionStartTime: now,
      auctionEndTime: endTime,
      status: 'OPEN',
    });
    res.status(201).json(auction);

    await createNotification(req, req.user._id, {
      title: 'Auction Created',
      message: `Your auction for ${weight}kg to ${toLocation} has been created and is now open for bids.`,
      type: 'SUCCESS',
      category: 'Auctions',
      priority: 'Medium',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/auction'
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Shipper: get my auctions
const getMyAuctions = async (req, res) => {
  try {
    const auctions = await AuctionRequest.find({ shipper: req.user._id, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 });

    // Auto-close expired OPEN auctions
    for (const a of auctions) {
      if (a.status === 'OPEN' && new Date() >= a.auctionEndTime) {
        a.status = 'CLOSED';
        await a.save();
      }
    }
    res.json(auctions);
  } catch (err) {
    handleError(res, err);
  }
};

// Shipper: get bids for an auction
const getAuctionBids = async (req, res) => {
  try {
    const auction = await AuctionRequest.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: { $ne: true } });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    // Auto-close if expired
    if (auction.status === 'OPEN' && new Date() >= auction.auctionEndTime) {
      auction.status = 'CLOSED';
      await auction.save();
    }

    const bids = await Bid.find({ auction: req.params.id, status: { $in: ['ACTIVE', 'SELECTED', 'ACCEPTED', 'REJECTED'] } })
      .populate('driver', 'name phone rating vehicleType vehicleNumber vehicleCapacity vehicleCapacityKg capacityUnit fuelType availability')
      .sort({ pricePerKg: 1 });

    res.json({ auction, bids });
  } catch (err) {
    handleError(res, err);
  }
};

// Shipper: select drivers with weight assignments
const selectDrivers = async (req, res) => {
  // selections: [{ bidId, driverId, assignedWeight }]
  const { selections } = req.body;
  try {
    const auction = await AuctionRequest.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: { $ne: true } });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'CLOSED') return res.status(400).json({ message: 'Auction must be CLOSED before selecting drivers' });

    // Validate total weight
    const totalAssigned = selections.reduce((s, sel) => s + Number(sel.assignedWeight), 0);
    if (totalAssigned > auction.weight) {
      return res.status(400).json({ message: `Total assigned weight (${totalAssigned}kg) exceeds requested weight (${auction.weight}kg)` });
    }

    // Build selections with price from bids
    const selectionDocs = [];
    for (const sel of selections) {
      const bid = await Bid.findById(sel.bidId);
      if (!bid) continue;
      const assignedWeight = Number(sel.assignedWeight);
      selectionDocs.push({
        driver: bid.driver,
        assignedWeight,
        pricePerKg: bid.pricePerKg,
        totalPrice: bid.pricePerKg * assignedWeight,
        driverStatus: 'PENDING',
      });
      bid.status = 'SELECTED';
      await bid.save();
    }

    auction.selections = selectionDocs;
    auction.status = 'SELECTED';
    await auction.save();

    res.json(auction);

    // Notify selected drivers
    const driverIds = selectionDocs.map(s => s.driver);
    await createNotification(req, driverIds, {
      title: 'Auction Won',
      message: `You have been selected as a winning bidder for an auction. Please accept to confirm.`,
      type: 'SUCCESS',
      category: 'Auctions',
      priority: 'High',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/driver-auction'
    });
    
    // Notify Shipper
    await createNotification(req, req.user._id, {
      title: 'Winning Driver Selected',
      message: `You selected winning drivers for your auction.`,
      type: 'SUCCESS',
      category: 'Auctions',
      priority: 'Low',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/auction'
    });
  } catch (err) {
    handleError(res, err);
  }
};

// ─── DRIVER ─────────────────────────────────────────────

// Driver: view open auctions
const getOpenAuctions = async (req, res) => {
  try {
    const now = new Date();
    // Auto-close expired ones first
    await AuctionRequest.updateMany(
      { status: 'OPEN', auctionEndTime: { $lte: now } },
      { status: 'CLOSED' }
    );

    const auctions = await AuctionRequest.find({ status: 'OPEN', isDeleted: { $ne: true } })
      .populate('shipper', 'businessName name')
      .sort({ createdAt: -1 });

    // Attach driver's own bid if exists
    const driverId = req.user._id;
    const auctionsWithBid = await Promise.all(auctions.map(async (a) => {
      const myBid = await Bid.findOne({ auction: a._id, driver: driverId });
      return { ...a.toJSON(), myBid: myBid || null };
    }));

    res.json(auctionsWithBid);
  } catch (err) {
    handleError(res, err);
  }
};

// Driver: place a bid
const placeBid = async (req, res) => {
  const { auctionId, pricePerKg } = req.body;
  try {
    const auction = await AuctionRequest.findOne({ _id: auctionId, status: 'OPEN', isDeleted: { $ne: true } });
    if (!auction) return res.status(404).json({ message: 'Auction not found or closed' });
    if (auction.status !== 'OPEN') return res.status(400).json({ message: 'Auction is no longer open' });
    if (new Date() >= auction.auctionEndTime) return res.status(400).json({ message: 'Auction has ended' });

    const currentLowestBidDoc = await Bid.findOne({ auction: auctionId }).sort({ pricePerKg: 1 });

    // Update existing bid or create new
    const existing = await Bid.findOne({ auction: auctionId, driver: req.user._id });
    let finalBid;
    if (existing) {
      existing.pricePerKg = Number(pricePerKg);
      existing.totalPrice = Number(pricePerKg) * auction.weight;
      await existing.save();
      finalBid = existing;
    } else {
      finalBid = await Bid.create({
        auction: auctionId,
        driver: req.user._id,
        pricePerKg: Number(pricePerKg),
        totalPrice: Number(pricePerKg) * auction.weight,
      });
    }

    await broadcastBidUpdate(req, auctionId);
    
    // Notify Shipper
    await createNotification(req, auction.shipper, {
      title: 'New Bid Received',
      message: `A driver has placed a bid of ₹${pricePerKg}/kg on your auction.`,
      type: 'INFO',
      category: 'Auctions',
      priority: 'Medium',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/auction'
    });

    // Notify Driver
    await createNotification(req, req.user._id, {
      title: existing ? 'Bid Updated' : 'Bid Submitted',
      message: `Your bid of ₹${pricePerKg}/kg was successfully placed.`,
      type: 'SUCCESS',
      category: 'Auctions',
      priority: 'Low',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/driver-auction'
    });

    // Notify previous lowest bidder if outbid
    if (currentLowestBidDoc && Number(pricePerKg) < currentLowestBidDoc.pricePerKg && currentLowestBidDoc.driver.toString() !== req.user._id.toString()) {
      await createNotification(req, currentLowestBidDoc.driver, {
        title: 'You were outbid!',
        message: `Another driver placed a lower bid (₹${pricePerKg}/kg) on an auction you bid on.`,
        type: 'WARNING',
        category: 'Auctions',
        priority: 'Medium',
        relatedEntityId: auction._id,
        entityType: 'AuctionRequest',
        link: '/driver-auction'
      });
    }

    if (existing) {
      return res.json(existing);
    }
    res.status(201).json(finalBid);
  } catch (err) {
    handleError(res, err);
  }
};

// Driver: get selected shipments (auctions where driver was selected)
const getDriverSelections = async (req, res) => {
  try {
    const auctions = await AuctionRequest.find({
      isDeleted: { $ne: true },
      selections: {
        $elemMatch: { driver: req.user._id }
      }
    }).populate('shipper', 'businessName name phone');

    const result = auctions.map(a => {
      const sel = a.selections.find(s => s.driver.toString() === req.user._id.toString());
      return {
        _id: a._id,
        auctionId: a.auctionId,
        fromLocation: a.fromLocation,
        toLocation: a.toLocation,
        goodsType: a.goodsType,
        shipper: a.shipper,
        assignedWeight: sel.assignedWeight,
        pricePerKg: sel.pricePerKg,
        totalPrice: sel.totalPrice,
        driverStatus: sel.driverStatus,
        auctionStatus: a.status,
      };
    });

    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

// Driver: accept or reject selected shipments
const respondToSelections = async (req, res) => {
  // decisions: [{ auctionId, decision: 'ACCEPTED' | 'REJECTED' }]
  const { decisions } = req.body;
  try {
    const driver = await User.findById(req.user._id);
    let totalAcceptedWeight = 0;

    // First pass: calculate total weight to accept
    for (const d of decisions) {
      if (d.decision === 'ACCEPTED') {
        const auction = await AuctionRequest.findById(d.auctionId);
        if (!auction) continue;
        const sel = auction.selections.find(s => s.driver.toString() === req.user._id.toString());
        if (sel) totalAcceptedWeight += sel.assignedWeight;
      }
    }

    // Validate capacity only if driver has set it (skip if 0 or not set)
    const capVal = parseFloat(driver.vehicleCapacityKg);
    if (!isNaN(capVal) && capVal > 0) {
      const availableCap = capVal;
      if (totalAcceptedWeight > availableCap) {
        return res.status(400).json({ 
          message: `Total accepted weight (${totalAcceptedWeight}kg) exceeds your capacity (${availableCap}kg). Update your capacity in My Profile.` 
        });
      }
    }

    // Second pass: apply decisions
    for (const d of decisions) {
      const auction = await AuctionRequest.findById(d.auctionId);
      if (!auction) continue;

      const selIdx = auction.selections.findIndex(s => s.driver.toString() === req.user._id.toString());
      if (selIdx === -1) continue;

      auction.selections[selIdx].driverStatus = d.decision;

      // If accepted, mark bid as ACCEPTED
      if (d.decision === 'ACCEPTED') {
        await Bid.findOneAndUpdate({ auction: d.auctionId, driver: req.user._id }, { status: 'ACCEPTED' });
      } else {
        await Bid.findOneAndUpdate({ auction: d.auctionId, driver: req.user._id }, { status: 'REJECTED' });
        // Reopen auction if all drivers rejected
        const allRejected = auction.selections.every(s => s.driverStatus === 'REJECTED');
        if (allRejected) auction.status = 'OPEN';
      }

      // Check if all selections responded
      const allResponded = auction.selections.every(s => s.driverStatus !== 'PENDING');
      const anyAccepted = auction.selections.some(s => s.driverStatus === 'ACCEPTED');
      if (allResponded && anyAccepted) auction.status = 'CONFIRMED';

      await auction.save();
    }

    res.json({ message: 'Response recorded successfully' });
    
    // Notify shipper about responses
    const auctionToNotify = await AuctionRequest.findById(decisions[0]?.auctionId);
    if (auctionToNotify) {
      await createNotification(req, auctionToNotify.shipper, {
        title: 'Driver Response',
        message: `A driver has responded to your auction selection.`,
        type: 'INFO',
        category: 'Auctions',
        priority: 'Medium',
        relatedEntityId: auctionToNotify._id,
        entityType: 'AuctionRequest',
        link: '/auction'
      });
    }
  } catch (err) {
    handleError(res, err);
  }
};

// Shipper: manually close an open auction early
const closeAuction = async (req, res) => {
  try {
    const auction = await AuctionRequest.findOne({ _id: req.params.id, shipper: req.user._id });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'OPEN') return res.status(400).json({ message: 'Auction is not open' });
    auction.status = 'CLOSED';
    auction.auctionEndTime = new Date();
    await auction.save();
    res.json(auction);
    
    await createNotification(req, auction.shipper, {
      title: 'Auction Closed Early',
      message: `You closed the auction manually.`,
      type: 'INFO',
      category: 'Auctions',
      priority: 'Low',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/auction'
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Driver: update location and status for an accepted auction shipment
const updateAuctionLocation = async (req, res) => {
  const { currentLocation, deliveryStatus } = req.body;
  try {
    const auction = await AuctionRequest.findOne({
      _id: req.params.id,
      'selections.driver': req.user._id,
      'selections.driverStatus': 'ACCEPTED',
    });
    if (!auction) return res.status(404).json({ message: 'Auction not found or not assigned to you' });

    const selIdx = auction.selections.findIndex(
      s => s.driver.toString() === req.user._id.toString() && s.driverStatus === 'ACCEPTED'
    );
    if (selIdx === -1) return res.status(404).json({ message: 'Selection not found' });

    if (currentLocation) auction.selections[selIdx].currentLocation = currentLocation;
    if (deliveryStatus) {
      auction.selections[selIdx].deliveryStatus = deliveryStatus;
      auction.selections[selIdx].timeline.push({
        status: deliveryStatus,
        location: currentLocation || auction.selections[selIdx].currentLocation,
        note: `Driver updated: ${deliveryStatus}`,
      });
      // If all accepted drivers delivered, mark auction as completed
      const allDelivered = auction.selections
        .filter(s => s.driverStatus === 'ACCEPTED')
        .every(s => s.deliveryStatus === 'Delivered');
      if (allDelivered) auction.status = 'CONFIRMED'; // keep CONFIRMED but all delivered
    }

    await auction.save();
    res.json(auction.selections[selIdx]);
    
    if (deliveryStatus) {
      await createNotification(req, auction.shipper, {
        title: `Auction Delivery Update`,
        message: `Driver updated delivery status: ${deliveryStatus}`,
        type: 'INFO',
        category: 'Auctions',
        priority: 'Medium',
        relatedEntityId: auction._id,
        entityType: 'AuctionRequest',
        link: '/auction'
      });
    }
  } catch (err) {
    handleError(res, err);
  }
};

// ─── CRUD EXTENSIONS ──────────────────────────────────────

const updateAuction = async (req, res) => {
  const { fromLocation, toLocation, weight, goodsType, description, auctionDuration } = req.body;
  try {
    const auction = await AuctionRequest.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    
    // Business rule: Edit only when there are no bids (which usually means status is OPEN and no one bid)
    // Actually, checking if bids exist:
    const bids = await Bid.countDocuments({ auction: auction._id });
    if (bids > 0) {
      return res.status(400).json({ message: 'Cannot edit auction once bids have been placed.' });
    }

    if (fromLocation) auction.fromLocation = fromLocation;
    if (toLocation) auction.toLocation = toLocation;
    if (weight) auction.weight = weight;
    if (goodsType) auction.goodsType = goodsType;
    if (description) auction.description = description;

    if (auctionDuration && auctionDuration !== auction.auctionDuration) {
      auction.auctionDuration = auctionDuration;
      // adjust end time based on original start time
      auction.auctionEndTime = new Date(auction.auctionStartTime.getTime() + Number(auctionDuration) * 60 * 1000);
      if (new Date() < auction.auctionEndTime) auction.status = 'OPEN';
    }

    await auction.save();
    res.json(auction);
  } catch (err) {
    handleError(res, err);
  }
};

const cancelAuction = async (req, res) => {
  try {
    const auction = await AuctionRequest.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    // Allow cancelling only before winner selection
    if (auction.status === 'SELECTED' || auction.status === 'CONFIRMED') {
      return res.status(400).json({ message: `Cannot cancel auction in ${auction.status} state.` });
    }

    auction.status = 'CANCELLED';
    await auction.save();
    res.json({ message: 'Auction cancelled' });
    
    await createNotification(req, auction.shipper, {
      title: 'Auction Cancelled',
      message: `You cancelled the auction successfully.`,
      type: 'WARNING',
      category: 'Auctions',
      priority: 'Low',
      relatedEntityId: auction._id,
      entityType: 'AuctionRequest',
      link: '/auction'
    });
  } catch (err) {
    handleError(res, err);
  }
};

const deleteAuction = async (req, res) => {
  try {
    const auction = await AuctionRequest.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    // Business rule: Delete only when there are no bids
    const bids = await Bid.countDocuments({ auction: auction._id });
    if (bids > 0) {
      return res.status(400).json({ message: 'Cannot delete auction once bids have been placed.' });
    }

    auction.isDeleted = true;
    auction.status = 'CANCELLED';
    await auction.save();
    res.json({ message: 'Auction deleted' });
  } catch (err) {
    handleError(res, err);
  }
};

const withdrawBid = async (req, res) => {
  const { auctionId } = req.params;
  try {
    const auction = await AuctionRequest.findById(auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'OPEN') return res.status(400).json({ message: 'Cannot withdraw bid on a closed auction' });

    const bid = await Bid.findOne({ auction: auctionId, driver: req.user._id });
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    await Bid.deleteOne({ _id: bid._id });
    await broadcastBidUpdate(req, auctionId);
    res.json({ message: 'Bid withdrawn successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  createAuction,
  getMyAuctions,
  getAuctionBids,
  selectDrivers,
  closeAuction,
  getOpenAuctions,
  placeBid,
  getDriverSelections,
  respondToSelections,
  updateAuctionLocation,
  updateAuction,
  cancelAuction,
  deleteAuction,
  withdrawBid,
};
