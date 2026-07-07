const express = require('express');
const router = express.Router();
const {
  createTrip, searchTrips, bookTrip, getMyTrips, getMyBookings, getTripBookings,
  updateTripStatus, getDriverTripStats, getLocations, acceptBooking, updateLocation, startTrip, updateBookingStatus,
  updateBooking, cancelBooking, deleteBooking, cancelTrip,
} = require('../controllers/tripController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createTrip);
router.get('/search', searchTrips);
router.get('/driver-stats', getDriverTripStats);
router.get('/locations', getLocations);
router.get('/my-trips', getMyTrips);
router.get('/my-bookings', getMyBookings);
router.post('/book', bookTrip);
router.post('/accept-booking', acceptBooking);
router.get('/:id/bookings', getTripBookings);
router.put('/:id/status', updateTripStatus);
router.put('/:id/location', updateLocation);
router.put('/:id/start', startTrip);
router.put('/:id/cancel', cancelTrip);

// Booking actions for driver
router.put('/booking/:id/status', updateBookingStatus);

// CRUD for bookings
router.put('/bookings/:id/cancel', cancelBooking);
router.route('/bookings/:id')
  .put(updateBooking)
  .delete(deleteBooking);

module.exports = router;
