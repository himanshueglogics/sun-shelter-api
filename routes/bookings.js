import express from 'express';
import { protect } from '../middleware/auth.js';
import bookingController from '../controllers/bookingController.js';

const router = express.Router();

// @route   GET /api/bookings/stats
// @desc    Get booking statistics
// @access  Private
router.get('/stats', protect, bookingController.getStats.bind(bookingController));

// @route   GET /api/bookings
// @desc    Get all bookings
// @access  Private
router.get('/', protect, bookingController.getAllBookings.bind(bookingController));

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get('/:id', protect, bookingController.getBookingById.bind(bookingController));

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private
router.post('/', protect, bookingController.createBooking.bind(bookingController));

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private
router.put('/:id', protect, bookingController.updateBooking.bind(bookingController));

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', protect, bookingController.cancelBooking.bind(bookingController));

// @route   DELETE /api/bookings/:id
// @desc    Delete booking
// @access  Private
router.delete('/:id', protect, bookingController.deleteBooking.bind(bookingController));

export default router;
