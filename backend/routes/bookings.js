const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getApprovedBookings,
  getAllBookings,
  getPendingBookings,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { authenticate, authorizeAdmin, authorizeCollege } = require('../middleware/auth');

// Common: anyone logged in can see approved bookings (for calendar)
router.get('/calendar', authenticate, getApprovedBookings);

// College routes
router.post('/', authenticate, authorizeCollege, createBooking);
router.get('/my', authenticate, authorizeCollege, getMyBookings);

// Admin routes
router.get('/', authenticate, authorizeAdmin, getAllBookings);
router.get('/pending', authenticate, authorizeAdmin, getPendingBookings);
router.patch('/:id/status', authenticate, authorizeAdmin, updateBookingStatus);

module.exports = router;
