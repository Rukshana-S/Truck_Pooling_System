const { handleError } = require('../utils/errorHandler');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

// Helper: derive payment status label from a booking
const paymentStatus = (b) => {
  if (b.remainingPaid) return 'Completed';
  if (b.advancePaid)   return 'Advance Paid';
  return 'Pending';
};

// Helper: start-of-day UTC for a given date
const startOf = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOf   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

// GET /api/earnings?filter=today|week|month
const getDriverEarnings = async (req, res) => {
  const { filter = 'today' } = req.query;
  try {
    // Find all trips owned by this driver
    const driverTrips = await Trip.find({ driver: req.user._id }).select('_id');
    const tripIds = driverTrips.map(t => t._id);

    // All bookings on those trips (excluding cancelled)
    const allBookings = await Booking.find({
      trip: { $in: tripIds },
      status: { $ne: 'CANCELLED' },
    })
      .populate({ path: 'trip', select: 'fromLocation toLocation tripId departureTime' })
      .populate({ path: 'shipper', select: 'name businessName phone' })
      .sort({ createdAt: -1 });

    // Date range filter
    const now = new Date();
    let from, to;
    if (filter === 'week') {
      from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0,0,0,0);
      to   = endOf(now);
    } else if (filter === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to   = endOf(now);
    } else {
      // today
      from = startOf(now);
      to   = endOf(now);
    }

    const filtered = allBookings.filter(b => {
      const d = new Date(b.createdAt);
      return d >= from && d <= to;
    });

    // Summary calculations
    const todayStart = startOf(now);
    const todayEnd   = endOf(now);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayEarnings = allBookings
      .filter(b => new Date(b.createdAt) >= todayStart && new Date(b.createdAt) <= todayEnd)
      .reduce((s, b) => s + b.totalPrice, 0);

    const weeklyEarnings = allBookings
      .filter(b => new Date(b.createdAt) >= weekStart && new Date(b.createdAt) <= todayEnd)
      .reduce((s, b) => s + b.totalPrice, 0);

    const monthlyEarnings = allBookings
      .filter(b => new Date(b.createdAt) >= monthStart && new Date(b.createdAt) <= todayEnd)
      .reduce((s, b) => s + b.totalPrice, 0);

    const completedBookings = allBookings.filter(b => b.status === 'DELIVERED');
    const completedTrips = completedBookings.length;
    const avgEarnings = completedTrips > 0 
      ? Math.round(completedBookings.reduce((s, b) => s + b.totalPrice, 0) / completedTrips) 
      : 0;

    const pendingPayments = allBookings
      .filter(b => !b.remainingPaid)
      .reduce((s, b) => s + (b.totalPrice - (b.advancePaid ? (b.advanceAmount || 0) : 0)), 0);

    // Build trip rows
    const rows = filtered.map(b => ({
      _id: b._id,
      bookingId: b.bookingId,
      shipmentId: b._id,
      tripId: b.trip?.tripId,
      date: b.createdAt,
      from: b.trip?.fromLocation || '—',
      to: b.trip?.toLocation || '—',
      weight: b.bookedWeight,
      weightUnit: 'kg',
      totalEarning: b.totalPrice,
      advancePaid: b.advancePaid,
      advanceAmount: b.advanceAmount,
      remainingPaid: b.remainingPaid,
      remainingAmount: b.remainingAmount || (b.totalPrice - b.advanceAmount),
      paymentStatus: paymentStatus(b),
      status: b.status,
      shipper: b.shipper?.businessName || b.shipper?.name || '—',
      goodsType: b.goodsType,
    }));

    res.json({
      summary: { 
        todayEarnings, 
        weeklyEarnings, 
        monthlyEarnings, 
        pendingPayments, 
        completedTrips, 
        avgEarnings 
      },
      rows,
    });
  } catch (err) {
    handleError(res, err);
  }
};

// PUT /api/earnings/:bookingId/payment  — update advance or remaining payment
const updatePayment = async (req, res) => {
  const { type, amount, note } = req.body; // type: 'advance' | 'remaining'
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('trip', 'driver');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.trip.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your booking' });

    if (type === 'advance') {
      booking.advancePaid   = true;
      booking.advanceAmount = Number(amount) || Math.round(booking.totalPrice * 0.3);
    } else if (type === 'remaining') {
      booking.remainingPaid   = true;
      booking.remainingAmount = booking.totalPrice - booking.advanceAmount;
    }
    if (note) booking.paymentNote = note;
    await booking.save();
    res.json({ message: 'Payment updated', paymentStatus: paymentStatus(booking), booking });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = { getDriverEarnings, updatePayment };
