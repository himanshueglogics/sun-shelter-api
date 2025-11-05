const express = require('express');
const router = express.Router();
const Beach = require('../models/Beach');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/beaches
// @desc    Get beaches (paginated)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Beach.find(filter)
        .populate('admins', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Beach.countDocuments(filter)
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/beaches/:id
// @desc    Get beach by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const beach = await Beach.findById(req.params.id).populate('admins', 'name email');
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

// ---------- Zones & Sunbeds Management ----------

// Helper to build sunbeds grid
function buildSunbeds(rows = 0, cols = 0) {
  const beds = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      beds.push({ code: `R${r}C${c}`, status: 'available' });
    }
  }
  return beds;
}

// @route   POST /api/beaches/:id/zones
// @desc    Add a zone
// @access  Private
router.post('/:id/zones', protect, async (req, res) => {
  try {
    const { name, rows = 0, cols = 0, sunbeds } = req.body;
    const beach = await Beach.findById(req.params.id);
    if (!beach) return res.status(404).json({ message: 'Beach not found' });
    
    // Use provided sunbeds if available, otherwise generate default ones
    const zoneSunbeds = sunbeds && sunbeds.length > 0 
      ? sunbeds.map(bed => ({
          code: bed.code || `R${bed.row}C${bed.col}`,
          status: bed.status || 'available',
          priceModifier: bed.priceModifier || 0
        }))
      : buildSunbeds(rows, cols);
    
    const zone = { name, rows, cols, sunbeds: zoneSunbeds };
    beach.zones.push(zone);
    beach.recomputeCapacity();
    await beach.save();
    res.status(201).json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/beaches/:id/zones/:zoneId
// @desc    Update zone (rows/cols -> regenerate sunbeds)
// @access  Private
router.put('/:id/zones/:zoneId', protect, async (req, res) => {
  try {
    const { name, rows, cols } = req.body;
    const beach = await Beach.findById(req.params.id);
    if (!beach) return res.status(404).json({ message: 'Beach not found' });
    const zone = beach.zones.id(req.params.zoneId);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    if (name !== undefined) zone.name = name;
    if (rows !== undefined) zone.rows = rows;
    if (cols !== undefined) zone.cols = cols;
    if (rows !== undefined || cols !== undefined) {
      zone.sunbeds = buildSunbeds(zone.rows, zone.cols);
    }
    beach.recomputeCapacity();
    await beach.save();
    res.json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/beaches/:id/zones/:zoneId
// @desc    Remove zone
// @access  Private
router.delete('/:id/zones/:zoneId', protect, async (req, res) => {
  try {
    const beach = await Beach.findById(req.params.id);
    if (!beach) return res.status(404).json({ message: 'Beach not found' });
    const zone = beach.zones.id(req.params.zoneId);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    zone.remove();
    beach.recomputeCapacity();
    await beach.save();
    res.json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/beaches/:id/zones/:zoneId/sunbeds/:sunbedId
// @desc    Update a sunbed status
// @access  Private
router.put('/:id/zones/:zoneId/sunbeds/:sunbedId', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const beach = await Beach.findById(req.params.id);
    if (!beach) return res.status(404).json({ message: 'Beach not found' });
    const zone = beach.zones.id(req.params.zoneId);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    const bed = zone.sunbeds.id(req.params.sunbedId);
    if (!bed) return res.status(404).json({ message: 'Sunbed not found' });
    if (status) bed.status = status;
    await beach.save();
    res.json(beach);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- Admins Assignment ----------

// @route   POST /api/beaches/:id/admins
// @desc    Assign an admin (userId) to a beach
// @access  Private
router.post('/:id/admins', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const beach = await Beach.findById(req.params.id);
    if (!beach) return res.status(404).json({ message: 'Beach not found' });
    if (!beach.admins.find(a => a.toString() === userId)) {
      beach.admins.push(userId);
      await beach.save();
    }
    const populated = await Beach.findById(beach._id).populate('admins', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/beaches/:id/admins/:userId
// @desc    Remove an admin from a beach
// @access  Private
router.delete('/:id/admins/:userId', protect, async (req, res) => {
  try {
    const beach = await Beach.findById(req.params.id);
    if (!beach) return res.status(404).json({ message: 'Beach not found' });
    beach.admins = beach.admins.filter(a => a.toString() !== req.params.userId);
    await beach.save();
    const populated = await Beach.findById(beach._id).populate('admins', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/beaches/stats
// @desc    Quick stats for UI
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const [totalBeaches, activeAdmins] = await Promise.all([
      Beach.countDocuments({}),
      User.countDocuments({})
    ]);
    res.json({ totalBeaches, activeAdmins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
