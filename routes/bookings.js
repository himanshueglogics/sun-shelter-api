const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Beach = require('../models/Beach');
const Finance = require('../models/Finance');
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
    
    // Update sunbed statuses to 'reserved' if sunbeds are specified
    if (booking.sunbeds && booking.sunbeds.length > 0 && booking.zone) {
      const beach = await Beach.findById(booking.beach);
      if (beach) {
        const zone = beach.zones.id(booking.zone);
        if (zone) {
          booking.sunbeds.forEach(sunbedId => {
            const sunbed = zone.sunbeds.id(sunbedId);
            if (sunbed && sunbed.status === 'available') {
              sunbed.status = 'reserved';
            }
          });
          await beach.save(); // This will trigger pre-save hook to update occupancy
        }
      }
    } else {
      // Fallback: Update beach occupancy manually if no sunbeds specified
      const beach = await Beach.findById(booking.beach);
      if (beach) {
        beach.currentBookings += 1;
        await beach.save(); // This will trigger pre-save hook
      }
    }
    
    // Create finance records for the booking
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      const rentalIncome = booking.totalAmount * 0.93; // 93% rental income
      const serviceFee = booking.totalAmount * 0.07; // 7% service fee
      
      await Finance.create([
        {
          type: 'rental_income',
          amount: rentalIncome,
          description: `Rental income from booking ${booking._id}`,
          booking: booking._id,
          beach: booking.beach,
          date: booking.checkInDate
        },
        {
          type: 'service_fee',
          amount: serviceFee,
          description: `Service fee from booking ${booking._id}`,
          booking: booking._id,
          beach: booking.beach,
          date: booking.checkInDate
        }
      ]);
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
    const oldBooking = await Booking.findById(req.params.id);
    if (!oldBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('beach');
    
    // If status changed to cancelled, free up the sunbeds
    if (oldBooking.status !== 'cancelled' && booking.status === 'cancelled') {
      if (booking.sunbeds && booking.sunbeds.length > 0 && booking.zone) {
        const beach = await Beach.findById(booking.beach);
        if (beach) {
          const zone = beach.zones.id(booking.zone);
          if (zone) {
            booking.sunbeds.forEach(sunbedId => {
              const sunbed = zone.sunbeds.id(sunbedId);
              if (sunbed && sunbed.status === 'reserved') {
                sunbed.status = 'available';
              }
            });
            await beach.save(); // This will trigger pre-save hook
          }
        }
      }
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
    
    // Free up sunbeds if they were reserved
    if (booking.sunbeds && booking.sunbeds.length > 0 && booking.zone) {
      const beach = await Beach.findById(booking.beach);
      if (beach) {
        const zone = beach.zones.id(booking.zone);
        if (zone) {
          booking.sunbeds.forEach(sunbedId => {
            const sunbed = zone.sunbeds.id(sunbedId);
            if (sunbed && sunbed.status === 'reserved') {
              sunbed.status = 'available';
            }
          });
          await beach.save(); // This will trigger pre-save hook
        }
      }
    } else {
      // Fallback: Update beach occupancy manually if no sunbeds specified
      const beach = await Beach.findById(booking.beach);
      if (beach && beach.currentBookings > 0) {
        beach.currentBookings -= 1;
        await beach.save(); // This will trigger pre-save hook
      }
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
