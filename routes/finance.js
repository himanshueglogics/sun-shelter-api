const express = require('express');
const router = express.Router();
const Finance = require('../models/Finance');
const Payout = require('../models/Payout');
const Beach = require('../models/Beach');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

// @route   GET /api/finance
// @desc    Get all finance records
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { beach, month, year } = req.query;
    const filter = {};
    
    if (beach) {
      const beaches = await Beach.find({ name: { $regex: beach, $options: 'i' } });
      filter.beach = { $in: beaches.map(b => b._id) };
    }
    
    if (month || year) {
      filter.date = {};
      if (year) {
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);
        filter.date.$gte = startDate;
        filter.date.$lte = endDate;
      }
      if (month && year) {
        const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        filter.date.$gte = startDate;
        filter.date.$lt = endDate;
      }
    }
    
    const finances = await Finance.find(filter)
      .populate('beach', 'name')
      .populate('booking')
      .sort({ date: -1 });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance
// @desc    Create a finance record
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const finance = await Finance.create(req.body);
    res.status(201).json(finance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/summary
// @desc    Get finance summary
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await Finance.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/overview
// @desc    Get finance overview
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    const [revenue, expenses, pendingPayouts] = await Promise.all([
      Finance.aggregate([
        { $match: { type: { $in: ['rental_income', 'service_fee'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Finance.aggregate([
        { $match: { type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payout.countDocuments({ status: 'pending' })
    ]);
    
    res.json({
      totalRevenue: revenue[0]?.total || 0,
      totalExpenses: expenses[0]?.total || 0,
      pendingPayouts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/beach-revenue
// @desc    Get beach revenue distribution
// @access  Private
router.get('/beach-revenue', protect, async (req, res) => {
  try {
    const revenueByBeach = await Finance.aggregate([
      { $match: { type: { $in: ['rental_income', 'service_fee'] } } },
      { $group: { _id: '$beach', total: { $sum: '$amount' } } },
      { $lookup: { from: 'beaches', localField: '_id', foreignField: '_id', as: 'beachInfo' } },
      { $unwind: '$beachInfo' },
      { $project: { name: '$beachInfo.name', value: '$total' } }
    ]);
    
    res.json(revenueByBeach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/service-fees
// @desc    Get service fees by beach
// @access  Private
router.get('/service-fees', protect, async (req, res) => {
  try {
    const beaches = await Beach.find().select('name');
    const serviceFees = await Promise.all(beaches.map(async (beach) => {
      const bookings = await Booking.countDocuments({ beach: beach._id, status: { $ne: 'cancelled' } });
      const revenue = await Finance.aggregate([
        { $match: { beach: beach._id, type: { $in: ['rental_income', 'service_fee'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      return {
        beach: beach.name,
        bookings,
        vip: Math.floor(bookings * 0.4),
        guests: Math.floor(bookings * 3.5),
        revenue: `$${(revenue[0]?.total || 0).toLocaleString()}`
      };
    }));
    
    res.json(serviceFees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/detailed-report
// @desc    Get detailed revenue report
// @access  Private
router.get('/detailed-report', protect, async (req, res) => {
  try {
    const beaches = await Beach.find().select('name');
    const report = await Promise.all(beaches.map(async (beach) => {
      const [bookingRev, serviceFees] = await Promise.all([
        Finance.aggregate([
          { $match: { beach: beach._id, type: 'rental_income' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Finance.aggregate([
          { $match: { beach: beach._id, type: 'service_fee' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);
      
      const bookingRevenue = bookingRev[0]?.total || 0;
      const serviceFee = serviceFees[0]?.total || 0;
      
      return {
        beach: beach.name,
        bookingRevenue: `$${bookingRevenue.toLocaleString()}`,
        serviceFees: `$${serviceFee.toLocaleString()}`,
        totalRevenue: `$${(bookingRevenue + serviceFee).toLocaleString()}`
      };
    }));
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/insights
// @desc    Get monthly revenue insights
// @access  Private
router.get('/insights', protect, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const insights = await Finance.aggregate([
      {
        $match: {
          type: { $in: ['rental_income', 'service_fee'] },
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = months.map((month, idx) => {
      const data = insights.find(i => i._id === idx + 1);
      return { month, revenue: data?.revenue || 0 };
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- Payout Management ----------

// @route   GET /api/finance/payouts
// @desc    Get all payouts
// @access  Private
router.get('/payouts', protect, async (req, res) => {
  try {
    const payouts = await Payout.find()
      .populate('beach', 'name')
      .populate('processedBy', 'name email')
      .sort({ requestedDate: -1 });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/payouts
// @desc    Create a payout request
// @access  Private
router.post('/payouts', protect, async (req, res) => {
  try {
    const payout = await Payout.create(req.body);
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/payouts/:id/approve
// @desc    Approve a payout
// @access  Private
router.post('/payouts/:id/approve', protect, async (req, res) => {
  try {
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        processedDate: new Date(),
        processedBy: req.user._id
      },
      { new: true }
    ).populate('beach', 'name');
    
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }
    
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/payouts/:id/reject
// @desc    Reject a payout
// @access  Private
router.post('/payouts/:id/reject', protect, async (req, res) => {
  try {
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        processedDate: new Date(),
        processedBy: req.user._id,
        notes: req.body.notes
      },
      { new: true }
    ).populate('beach', 'name');
    
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }
    
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/seed
// @desc    Seed finance data with dummy records
// @access  Private
router.post('/seed', protect, async (req, res) => {
  try {
    const beaches = await Beach.find();
    
    if (beaches.length === 0) {
      return res.status(400).json({ message: 'No beaches found. Please create beaches first.' });
    }

    // Clear existing finance and payout data
    await Finance.deleteMany({});
    await Payout.deleteMany({});

    // Generate finance records for the past 12 months
    const financeRecords = [];
    const currentDate = new Date();
    
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - month);
      
      beaches.forEach((beach) => {
        // Generate 15-30 bookings per beach per month
        const bookingsCount = Math.floor(Math.random() * 16) + 15;
        
        for (let i = 0; i < bookingsCount; i++) {
          const bookingAmount = Math.floor(Math.random() * 300) + 100;
          const rentalIncome = bookingAmount * 0.93;
          const serviceFee = bookingAmount * 0.07;
          
          financeRecords.push({
            type: 'rental_income',
            amount: rentalIncome,
            description: `Rental income - ${beach.name}`,
            beach: beach._id,
            date: new Date(date.getFullYear(), date.getMonth(), Math.floor(Math.random() * 28) + 1)
          });
          
          financeRecords.push({
            type: 'service_fee',
            amount: serviceFee,
            description: `Service fee - ${beach.name}`,
            beach: beach._id,
            date: new Date(date.getFullYear(), date.getMonth(), Math.floor(Math.random() * 28) + 1)
          });
        }
        
        // Add expenses
        const expensesCount = Math.floor(Math.random() * 6) + 5;
        for (let i = 0; i < expensesCount; i++) {
          const expenseAmount = Math.floor(Math.random() * 500) + 50;
          financeRecords.push({
            type: 'expense',
            amount: expenseAmount,
            description: `Maintenance and operations - ${beach.name}`,
            beach: beach._id,
            date: new Date(date.getFullYear(), date.getMonth(), Math.floor(Math.random() * 28) + 1)
          });
        }
      });
    }

    await Finance.insertMany(financeRecords);

    // Create pending payout requests
    const payouts = beaches.slice(0, Math.min(4, beaches.length)).map((beach, idx) => ({
      beach: beach._id,
      amount: Math.floor(Math.random() * 10000) + 5000,
      status: 'pending',
      requestedDate: new Date(Date.now() - (idx * 86400000))
    }));

    await Payout.insertMany(payouts);

    res.json({ 
      message: 'Finance data seeded successfully',
      financeRecords: financeRecords.length,
      payouts: payouts.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
