const express = require('express');
const router = express.Router();
const Finance = require('../models/Finance');
const { protect } = require('../middleware/auth');

// @route   GET /api/finance
// @desc    Get all finance records
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const finances = await Finance.find()
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

module.exports = router;
