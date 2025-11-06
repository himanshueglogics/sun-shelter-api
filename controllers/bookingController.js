import bookingService from '../services/bookingService.js';

class BookingController {
  // @route   GET /api/bookings/stats
  // @desc    Get booking statistics
  // @access  Private
  async getStats(req, res) {
    try {
      const stats = await bookingService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // @route   GET /api/bookings
  // @desc    Get all bookings
  // @access  Private
  async getAllBookings(req, res) {
    try {
      const result = await bookingService.getAllBookings(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // @route   GET /api/bookings/:id
  // @desc    Get single booking
  // @access  Private
  async getBookingById(req, res) {
    try {
      const booking = await bookingService.getBookingById(req.params.id);
      res.json(booking);
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   POST /api/bookings
  // @desc    Create new booking
  // @access  Private
  async createBooking(req, res) {
    try {
      const booking = await bookingService.createBooking(req.body);
      res.status(201).json(booking);
    } catch (error) {
      if (error.message === 'Beach not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   PUT /api/bookings/:id
  // @desc    Update booking
  // @access  Private
  async updateBooking(req, res) {
    try {
      const booking = await bookingService.updateBooking(req.params.id, req.body);
      res.json(booking);
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   PUT /api/bookings/:id/cancel
  // @desc    Cancel booking
  // @access  Private
  async cancelBooking(req, res) {
    try {
      const booking = await bookingService.cancelBooking(req.params.id);
      res.json(booking);
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   DELETE /api/bookings/:id
  // @desc    Delete booking
  // @access  Private
  async deleteBooking(req, res) {
    try {
      const result = await bookingService.deleteBooking(req.params.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }
}

export default new BookingController();
