const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Beach = require('../models/Beach');
const { protect } = require('../middleware/auth');

// @route   GET /api/bookings
// @desc    Get all bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('beach', 'name location')
      .sort({ createdAt: -1 });
    res.json(bookings);
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
