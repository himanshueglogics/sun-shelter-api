const express = require('express');
const router = express.Router();
const Beach = require('../models/Beach');
const { protect } = require('../middleware/auth');

// @route   GET /api/beaches
// @desc    Get all beaches
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const beaches = await Beach.find().sort({ createdAt: -1 });
    res.json(beaches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/beaches/:id
// @desc    Get beach by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const beach = await Beach.findById(req.params.id);
    if (!beach) {
      return res.status(404).json({ message: 'Beach not found' });
    }
    res.json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/beaches
// @desc    Create a beach
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const beach = await Beach.create(req.body);
    res.status(201).json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/beaches/:id
// @desc    Update beach
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const beach = await Beach.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!beach) {
      return res.status(404).json({ message: 'Beach not found' });
    }
    res.json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/beaches/:id
// @desc    Delete beach
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const beach = await Beach.findByIdAndDelete(req.params.id);
    if (!beach) {
      return res.status(404).json({ message: 'Beach not found' });
    }
    res.json({ message: 'Beach removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
