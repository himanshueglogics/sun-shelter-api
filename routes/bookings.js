const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Beach = require('../models/Beach');
const { protect } = require('../middleware/auth');

// @route   GET /api/bookings/stats
// @desc    Get booking statistics (total, active, cancelled)
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, active, cancelled] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ 
        status: { $in: ['confirmed', 'pending', 'completed'] } 
      }),
      Booking.countDocuments({ status: 'cancelled' })
    ]);
    
    res.json({ total, active, cancelled });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/bookings
// @desc    Get all bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, beach, checkInFrom, checkInTo } = req.query;
    const query = {};
    if (status) query.status = status;
    if (beach) query.beach = beach;
    if (checkInFrom || checkInTo) {
      query.checkInDate = {};
      if (checkInFrom) query.checkInDate.$gte = new Date(checkInFrom);
      if (checkInTo) query.checkInDate.$lte = new Date(checkInTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Booking.find(query)
        .populate('beach', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(query)
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('beach');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/bookings
// @desc    Create a booking
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    
    // Update beach occupancy
    const beach = await Beach.findById(booking.beach);
    if (beach) {
      beach.currentBookings += 1;
      beach.occupancyRate = (beach.currentBookings / beach.totalCapacity) * 100;
      await beach.save();
    }
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('beach');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Delete booking
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Update beach occupancy
    const beach = await Beach.findById(booking.beach);
    if (beach && beach.currentBookings > 0) {
      beach.currentBookings -= 1;
      beach.occupancyRate = (beach.currentBookings / beach.totalCapacity) * 100;
      await beach.save();
    }
    
    await booking.deleteOne();
    res.json({ message: 'Booking removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/bookings/upcoming/count
// @desc    Get upcoming bookings count
// @access  Private
router.get('/stats/upcoming', protect, async (req, res) => {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const count = await Booking.countDocuments({
      checkInDate: { $gte: new Date(), $lte: sevenDaysFromNow },
      status: { $ne: 'cancelled' }
    });
    
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
