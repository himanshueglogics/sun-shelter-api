const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');
const { protect } = require('../middleware/auth');

// @route   GET /api/integrations
// @desc    List integrations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const list = await Integration.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   POST /api/integrations
// @desc    Create integration
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const integration = await Integration.create(req.body);
    res.status(201).json(integration);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   PUT /api/integrations/:id
// @desc    Update integration
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    res.json(integration);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   DELETE /api/integrations/:id
// @desc    Delete integration
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    await integration.deleteOne();
    res.json({ message: 'Integration removed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
