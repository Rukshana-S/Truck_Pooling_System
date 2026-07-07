const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { createNotification } = require('../services/notificationService');

// Driver: Create a trip
const createTrip = async (req, res) => {
  const { fromLocation, toLocation, totalCapacity, pricePerKg, vehicleType, vehicleNumber, minimumBookingKg, hasReturnTrip } = req.body;
  try {
    const tripData = {
      driver: req.user._id,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      totalCapacity: Number(totalCapacity),
      availableCapacity: Number(totalCapacity),
      pricePerKg: Number(pricePerKg),
      vehicleType: vehicleType || req.user.vehicleType || '',
      vehicleNumber: vehicleNumber || req.user.vehicleNumber || '',
      minimumBookingKg: Number(minimumBookingKg) || 1,
      hasReturnTrip: !!hasReturnTrip,
    };

    const trip = await Trip.create(tripData);

    // Auto-create return trip if requested
    if (hasReturnTrip) {
      const returnDate = req.body.returnDepartureTime ? new Date(req.body.returnDepartureTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const returnTripData = {
        ...tripData,
        fromLocation: toLocation.trim(),
        toLocation: fromLocation.trim(),
        hasReturnTrip: false,
        departureTime: returnDate,
      };
      const returnTrip = await Trip.create(returnTripData);
      trip.returnTrip = returnTrip._id;
      await trip.save();
    }

    await trip.populate('driver', 'name phone rating vehicleType vehicleNumber');
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Shipper: Search trips by route
const searchTrips = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.json([]);

  try {
    const trips = await Trip.find({
      fromLocation: { $regex: from.trim(), $options: 'i' },
      toLocation: { $regex: to.trim(), $options: 'i' },
      status: 'ACTIVE',
      availableCapacity: { $gt: 0 },
      isStarted: { $ne: true },
      isDeleted: { $ne: true },
    })
      .populate('driver', 'name phone rating vehicleType vehicleNumber vehicleCapacity vehicleCapacityKg capacityUnit fuelType availability')
      .sort({ pricePerKg: 1 });

    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Shipper: Book capacity — atomic using findOneAndUpdate to prevent overbooking
const bookTrip = async (req, res) => {
  const { tripId, bookedWeight, goodsType, goodsDescription } = req.body;
  const weight = Number(bookedWeight);

  try {
    // Atomically deduct capacity only if enough is available
    const trip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        status: 'ACTIVE',
        availableCapacity: { $gte: weight },
        isDeleted: { $ne: true },
      },
      [
        {
          $set: {
            availableCapacity: { $subtract: ['$availableCapacity', weight] },
            status: {
              $cond: {
                if: { $lte: [{ $subtract: ['$availableCapacity', weight] }, 0] },
                then: 'FULL',
                else: '$status',
              },
            },
          },
        },
      ],
      { new: true }
    );

    if (!trip) {
      // Check why it failed
      const existing = await Trip.findById(tripId);
      if (!existing) return res.status(404).json({ message: 'Trip not found' });
      if (existing.status !== 'ACTIVE') return res.status(400).json({ message: `Trip is ${existing.status}` });
      return res.status(400).json({
        message: `Only ${existing.availableCapacity} kg available. You requested ${weight} kg.`,
      });
    }

    if (weight < trip.minimumBookingKg) {
      // Rollback
      await Trip.findByIdAndUpdate(tripId, { $inc: { availableCapacity: weight }, status: 'ACTIVE' });
      return res.status(400).json({ message: `Minimum booking is ${trip.minimumBookingKg} kg` });
    }

    // Calculate effective price with discount
    const pctUsed = Math.round(((trip.totalCapacity - trip.availableCapacity) / trip.totalCapacity) * 100);
    let effectivePrice = trip.pricePerKg;
    if (pctUsed >= 80) effectivePrice = Math.round(trip.pricePerKg * 0.85);
    else if (pctUsed >= 50) effectivePrice = Math.round(trip.pricePerKg * 0.95);

    const booking = await Booking.create({
      trip: trip._id,
      shipper: req.user._id,
      bookedWeight: weight,
      pricePerKg: effectivePrice,
      totalPrice: effectivePrice * weight,
      goodsType: goodsType || '',
      goodsDescription: goodsDescription || '',
    });

    await booking.populate([
      { path: 'trip', populate: { path: 'driver', select: 'name phone' } },
      { path: 'shipper', select: 'name businessName' },
    ]);

    res.status(201).json(booking);
    
    // Notify Driver
    await createNotification(req, booking.trip.driver._id, {
      title: 'Marketplace Capacity Booked',
      message: `${booking.shipper.businessName || booking.shipper.name} booked ${weight}kg on your trip.`,
      type: 'SUCCESS',
      category: 'Marketplace',
      priority: 'Medium',
      relatedEntityId: trip._id,
      entityType: 'Trip',
      link: '/driver-trips'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all trips for a driver
const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ driver: req.user._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get bookings made by shipper
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ shipper: req.user._id, isDeleted: { $ne: true } })
      .populate({
        path: 'trip',
        populate: { path: 'driver', select: 'name phone rating vehicleNumber' },
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get bookings for a specific trip
const getTripBookings = async (req, res) => {
  try {
    // Only driver of the trip can view
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user._id, isDeleted: { $ne: true } });
    if (!trip) return res.status(404).json({ message: 'Trip not found or unauthorized' });

    const bookings = await Booking.find({ trip: req.params.id, isDeleted: { $ne: true } })
      .populate('shipper', 'name businessName phone location')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Driver: Update trip status
const updateTripStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user._id, isDeleted: { $ne: true } });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    trip.status = status;
    await trip.save();
    if (status === 'COMPLETED') await Booking.updateMany({ trip: trip._id }, { status: 'DELIVERED' });
    if (status === 'CANCELLED') await Booking.updateMany({ trip: trip._id }, { status: 'CANCELLED' });
    res.json(trip);
    
    // Notify all shippers on this trip
    const bookings = await Booking.find({ trip: trip._id }).select('shipper');
    const shipperIds = [...new Set(bookings.map(b => b.shipper.toString()))];
    
    if (shipperIds.length > 0) {
      await createNotification(req, shipperIds, {
        title: `Trip ${status}`,
        message: `The trip status has been updated to ${status}.`,
        type: status === 'COMPLETED' ? 'SUCCESS' : status === 'CANCELLED' ? 'WARNING' : 'INFO',
        category: 'Marketplace',
        priority: status === 'COMPLETED' ? 'High' : 'Medium',
        relatedEntityId: trip._id,
        entityType: 'Trip',
        link: '/marketplace'
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Driver trip stats
const getDriverTripStats = async (req, res) => {
  try {
    const totalTrips = await Trip.countDocuments({ driver: req.user._id, isDeleted: { $ne: true } });
    const activeTrips = await Trip.countDocuments({ driver: req.user._id, status: { $in: ['ACTIVE', 'FULL'] }, isDeleted: { $ne: true } });
    const completedTrips = await Trip.countDocuments({ driver: req.user._id, status: 'COMPLETED', isDeleted: { $ne: true } });
    const bookings = await Booking.find({ status: 'DELIVERED' })
      .populate('trip', 'driver');
    const totalEarned = bookings
      .filter(b => b.trip?.driver?.toString() === req.user._id.toString())
      .reduce((sum, b) => sum + b.totalPrice, 0);
    res.json({ total: totalTrips, active: activeTrips, completed: completedTrips, totalEarned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all unique locations from existing trips
const getLocations = async (req, res) => {
  try {
    const froms = await Trip.distinct('fromLocation');
    const tos = await Trip.distinct('toLocation');
    const all = [...new Set([...froms, ...tos])].sort();
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Driver: Accept one booking, auto-reject others on same trip
const acceptBooking = async (req, res) => {
  const { bookingId } = req.body;
  try {
    const booking = await Booking.findById(bookingId).populate('trip');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.trip.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your trip' });

    // Accept this booking
    booking.status = 'CONFIRMED';
    await booking.save();

    // Auto-reject all other PENDING bookings on same trip
    await Booking.updateMany(
      { trip: booking.trip._id, _id: { $ne: bookingId }, status: 'CONFIRMED' },
      { status: 'CANCELLED' }
    );

    res.json(booking);
    
    // Notify shipper
    await createNotification(req, booking.shipper, {
      title: 'Booking Accepted',
      message: `Your booking for ${booking.bookedWeight}kg has been accepted by the driver.`,
      type: 'SUCCESS',
      category: 'Marketplace',
      priority: 'Medium',
      relatedEntityId: booking._id,
      entityType: 'Booking',
      link: '/marketplace'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Driver: Update current location of a trip
const updateLocation = async (req, res) => {
  const { currentLocation } = req.body;
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user._id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (currentLocation) trip.currentLocation = currentLocation;
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Driver: Start a trip — hides it from shipper marketplace
const startTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user._id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    trip.isStarted = true;
    trip.startedAt = new Date();
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Driver: Update individual booking delivery status
const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const booking = await Booking.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('trip');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.trip.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your trip' });
    booking.status = status;
    await booking.save();
    res.json(booking);
    
    await createNotification(req, booking.shipper, {
      title: `Booking Update`,
      message: `Your booking status was updated to ${status}.`,
      type: 'INFO',
      category: 'Marketplace',
      priority: 'Medium',
      relatedEntityId: booking._id,
      entityType: 'Booking',
      link: '/marketplace'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- CRUD Extensions ---

const updateBooking = async (req, res) => {
  const { bookedWeight, goodsType, goodsDescription } = req.body;
  try {
    const booking = await Booking.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false }).populate('trip');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Cannot modify booking after pickup has started.' });
    }

    if (bookedWeight && bookedWeight !== booking.bookedWeight) {
      const diff = Number(bookedWeight) - booking.bookedWeight;
      if (diff > 0 && booking.trip.availableCapacity < diff) {
        return res.status(400).json({ message: 'Not enough available capacity on trip.' });
      }
      booking.trip.availableCapacity -= diff;
      await booking.trip.save();
      booking.bookedWeight = Number(bookedWeight);
      booking.totalPrice = booking.pricePerKg * booking.bookedWeight;
    }

    if (goodsType) booking.goodsType = goodsType;
    if (goodsDescription) booking.goodsDescription = goodsDescription;

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false }).populate('trip');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Cannot cancel booking after pickup has started.' });
    }

    booking.status = 'CANCELLED';
    booking.trip.availableCapacity += booking.bookedWeight;
    await booking.trip.save();
    await booking.save();
    res.json({ message: 'Booking cancelled' });
    
    await createNotification(req, booking.trip.driver, {
      title: `Booking Cancelled`,
      message: `A shipper cancelled their ${booking.bookedWeight}kg booking.`,
      type: 'WARNING',
      category: 'Marketplace',
      priority: 'Medium',
      relatedEntityId: booking.trip._id,
      entityType: 'Trip',
      link: '/driver-trips'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, shipper: req.user._id, isDeleted: false }).populate('trip');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'CONFIRMED' && booking.status !== 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot delete booking that is currently in transit or delivered.' });
    }

    booking.isDeleted = true;
    if (booking.status !== 'CANCELLED') {
      booking.status = 'CANCELLED';
      booking.trip.availableCapacity += booking.bookedWeight;
      await booking.trip.save();
    }
    await booking.save();
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user._id, isDeleted: false });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    if (trip.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot cancel completed trip.' });
    }
    if (trip.isStarted) {
      return res.status(400).json({ message: 'Cannot cancel trip after it has started. Complete the trip instead.' });
    }

    trip.status = 'CANCELLED';
    await trip.save();

    // Cancel all active bookings
    const bookings = await Booking.find({ trip: trip._id, status: { $nin: ['CANCELLED', 'COMPLETED'] }, isDeleted: false });
    const shipperIds = [];
    for (const b of bookings) {
      b.status = 'CANCELLED';
      await b.save();
      shipperIds.push(b.shipper.toString());
    }

    res.json({ message: 'Trip cancelled' });
    
    if (shipperIds.length > 0) {
      await createNotification(req, [...new Set(shipperIds)], {
        title: `Trip Cancelled`,
        message: `A trip you booked capacity on has been cancelled by the driver.`,
        type: 'ERROR',
        category: 'Marketplace',
        priority: 'High',
        relatedEntityId: trip._id,
        entityType: 'Trip',
        link: '/marketplace'
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {
  createTrip,
  searchTrips,
  bookTrip,
  getMyTrips,
  getMyBookings,
  getTripBookings,
  updateTripStatus,
  getDriverTripStats,
  getLocations,
  acceptBooking,
  updateLocation,
  startTrip,
  updateBookingStatus,
  updateBooking,
  cancelBooking,
  deleteBooking,
  cancelTrip,
};
