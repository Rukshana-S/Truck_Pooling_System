const { handleError } = require('../utils/errorHandler');
const Shipment = require('../models/Shipment');
const AuctionRequest = require('../models/AuctionRequest');
const { createNotification } = require('../services/notificationService');

// ─── GET /api/tracking/:trackingId ─────────────────────────────────────────
const trackShipment = async (req, res) => {
  const { trackingId } = req.params;
  try {
    // Try shipment first
    const shipment = await Shipment.findOne({ shipmentId: trackingId })
      .populate('driver', 'name phone rating vehicleNumber vehicleType')
      .populate('shipper', 'name businessName phone email')
      .select('shipmentId pickup drop status currentLocation timeline driver shipper estimatedDelivery currentStatus trackingHistory statusUpdatedAt paymentStatus cost weight goodsType bundles createdAt currentGpsLocation');

    if (shipment) return res.json(shipment);

    // Try auction
    const auction = await AuctionRequest.findOne({ auctionId: trackingId })
      .populate({ path: 'selections.driver', select: 'name phone rating vehicleType vehicleNumber' })
      .populate('shipper', 'name businessName');

    if (!auction) return res.status(404).json({ message: 'Tracking ID not found' });

    const acceptedDrivers = auction.selections.filter(s => s.driverStatus === 'ACCEPTED');
    const primaryDriver = acceptedDrivers[0]?.driver || null;

    res.json({
      shipmentId: auction.auctionId,
      pickup: auction.fromLocation,
      drop: auction.toLocation,
      status: auction.status === 'CONFIRMED' ? 'Pickup Confirmed' : auction.status,
      currentLocation: auction.fromLocation,
      estimatedDelivery: null,
      driver: primaryDriver,
      timeline: [
        { status: 'Booked', timestamp: auction.createdAt, note: 'Auction created' },
        { status: 'Pickup Confirmed', timestamp: auction.updatedAt, note: `Driver${acceptedDrivers.length > 1 ? 's' : ''} accepted the shipment` },
      ],
      isAuction: true,
      totalWeight: auction.weight,
      goodsType: auction.goodsType,
      acceptedDrivers: acceptedDrivers.map(s => ({
        driver: s.driver,
        assignedWeight: s.assignedWeight,
        pricePerKg: s.pricePerKg,
        totalPrice: s.totalPrice,
      })),
    });
  } catch (err) {
    handleError(res, err);
  }
};

// ─── PUT /api/tracking/:trackingId/status ──────────────────────────────────
const updateTrackingStatus = async (req, res) => {
  const { trackingId } = req.params;
  const { status, lat, lng, note } = req.body;
  try {
    let updated = false;

    const shipment = await Shipment.findOne({ shipmentId: trackingId })
      .populate('shipper', 'name')
      .populate('driver', 'name');

    if (shipment) {
      const previousStatus = shipment.currentStatus;
      const statusChanged = status && previousStatus !== status;

      if (statusChanged) {
        shipment.currentStatus = status;
        shipment.statusUpdatedAt = Date.now();
        shipment.timeline.push({ status, timestamp: Date.now(), note: note || `Status updated to ${status}` });
        shipment.trackingHistory.push({ status, timestamp: Date.now(), note: note || `Tracking update: ${status}` });

        // Update legacy status field for backwards compatibility
        const legacyMap = {
          'In Transit': 'In Transit',
          'Delivered': 'Delivered',
          'Pickup Started': 'Pickup Confirmed',
          'Near Destination': 'Out for Delivery',
        };
        if (legacyMap[status]) shipment.status = legacyMap[status];

        // Auto-update paymentStatus when lifecycle progresses
        if (status === 'Advance Paid' && shipment.paymentStatus === 'Pending Advance') {
          shipment.paymentStatus = 'Advance Paid';
        }
        if (status === 'Final Payment Completed') {
          shipment.paymentStatus = 'Fully Paid';
        }

        // Send notification only when status actually changes (dedup guard)
        if (shipment.shipper?._id) {
          await createNotification(req, shipment.shipper._id, {
            title: 'Shipment Status Update',
            message: `Shipment ${trackingId}: ${status}`,
            type: 'INFO',
            category: 'Shipments',
            priority: 'Medium',
            relatedEntityId: shipment._id,
            entityType: 'Shipment',
            link: `/tracking/${trackingId}`,
          });
        }
      }

      if (lat && lng) {
        shipment.currentGpsLocation = { lat, lng };
      }
      await shipment.save();
      updated = true;

      if (req.io && statusChanged) {
        req.io.to(`track_${trackingId}`).emit('shipment_status_update', {
          trackingId, status, previousStatus, timestamp: Date.now(), lat, lng,
        });
      }
    }

    if (!updated) {
      const auction = await AuctionRequest.findOne({ auctionId: trackingId });
      if (auction) {
        const selIndex = auction.selections.findIndex(s => s.driverStatus === 'ACCEPTED');
        if (selIndex !== -1) {
          if (status && auction.selections[selIndex].deliveryStatus !== status) {
            auction.selections[selIndex].deliveryStatus = status;
            auction.selections[selIndex].timeline = auction.selections[selIndex].timeline || [];
            auction.selections[selIndex].timeline.push({
              status, location: lat && lng ? `${lat},${lng}` : '', timestamp: Date.now(),
              note: note || `Status updated to ${status}`,
            });
          }
          if (lat && lng) auction.selections[selIndex].currentGpsLocation = { lat, lng };
          await auction.save();
          updated = true;

          if (req.io) {
            req.io.to(`track_${trackingId}`).emit('shipment_status_update', {
              trackingId, status, timestamp: Date.now(), lat, lng,
            });
          }
        }
      }
    }

    if (updated) {
      res.json({ message: 'Tracking updated successfully' });
    } else {
      res.status(404).json({ message: 'Tracking ID not found or no accepted driver' });
    }
  } catch (err) {
    handleError(res, err);
  }
};

// ─── PUT /api/tracking/:trackingId/location (GPS only, no status change) ───
const updateGpsLocation = async (req, res) => {
  const { trackingId } = req.params;
  const { lat, lng } = req.body;
  try {
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    const shipment = await Shipment.findOne({ shipmentId: trackingId });
    if (shipment) {
      shipment.currentGpsLocation = { lat, lng };
      await shipment.save();
    }

    // Always emit to org watchers regardless of DB result
    if (req.io) {
      req.io.to(`track_${trackingId}`).emit('driver_location_update', {
        trackingId, lat, lng, timestamp: Date.now(),
      });
    }

    res.json({ message: 'Location updated' });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = { trackShipment, updateTrackingStatus, updateGpsLocation };
