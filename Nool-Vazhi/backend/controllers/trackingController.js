const { handleError } = require('../utils/errorHandler');
const Shipment = require('../models/Shipment');
const AuctionRequest = require('../models/AuctionRequest');

const trackShipment = async (req, res) => {
  const { trackingId } = req.params;
  try {
    // Try shipment first
    const shipment = await Shipment.findOne({ shipmentId: trackingId })
      .populate('driver', 'name phone rating vehicleNumber vehicleType')
      .populate('shipper', 'name businessName')
      .select('shipmentId pickup drop status currentLocation timeline driver shipper estimatedDelivery currentStatus trackingHistory statusUpdatedAt paymentStatus cost weight goodsType bundles createdAt');

    if (shipment) return res.json(shipment);

    // Try auction
    const auction = await AuctionRequest.findOne({ auctionId: trackingId })
      .populate({
        path: 'selections.driver',
        select: 'name phone rating vehicleType vehicleNumber',
      })
      .populate('shipper', 'name businessName');

    if (!auction) return res.status(404).json({ message: 'Tracking ID not found' });

    // Build a tracking-compatible response from auction
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

module.exports = { trackShipment };
