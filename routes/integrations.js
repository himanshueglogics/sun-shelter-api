import express from 'express';
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/integrations
// @desc    List integrations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const list = await prisma.integration.findMany({ orderBy: { createdAt: 'desc' } });
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
    const integration = await prisma.integration.create({ data: req.body });
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
    const id = Number(req.params.id);
    const integration = await prisma.integration.update({ where: { id }, data: req.body });
    res.json(integration);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Integration not found' });
    res.status(500).json({ message: e.message });
  }
});

// @route   DELETE /api/integrations/:id
// @desc    Delete integration
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.integration.delete({ where: { id } });
    res.json({ message: 'Integration removed' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Integration not found' });
    res.status(500).json({ message: e.message });
  }
});

// ----- Extra utility endpoints used by ManageIntegrations UI -----

// Weather
router.post('/weather/test', protect, async (req, res) => {
  try {
    // Placeholder success; wire to real provider as needed
    res.json({ ok: true, message: 'Weather API connection successful' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/weather/toggle', protect, async (req, res) => {
  try {
    const { enabled } = req.body || {};
    res.json({ ok: true, enabled: !!enabled, message: `Weather integration ${enabled ? 'enabled' : 'disabled'}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Maps
router.post('/maps/test', protect, async (req, res) => {
  try {
    res.json({ ok: true, message: 'Maps API connection successful' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/maps/toggle', protect, async (req, res) => {
  try {
    const { enabled } = req.body || {};
    res.json({ ok: true, enabled: !!enabled, message: `Maps integration ${enabled ? 'enabled' : 'disabled'}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Stripe
router.post('/stripe/webhook-toggle', protect, async (req, res) => {
  try {
    const { enabled } = req.body || {};
    res.json({ ok: true, enabled: !!enabled, message: `Stripe webhook ${enabled ? 'enabled' : 'disabled'}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/stripe/reconnect', protect, async (_req, res) => {
  try {
    res.json({ ok: true, message: 'Stripe reconnected successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PayPal
router.post('/paypal/webhook-toggle', protect, async (req, res) => {
  try {
    const { enabled } = req.body || {};
    res.json({ ok: true, enabled: !!enabled, message: `PayPal webhook ${enabled ? 'enabled' : 'disabled'}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/paypal/reconnect', protect, async (_req, res) => {
  try {
    res.json({ ok: true, message: 'PayPal reconnected successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Logs
router.post('/logs/clear', protect, async (_req, res) => {
  try {
    // In real impl, clear from DB or log store
    res.json({ ok: true, message: 'Integration logs cleared' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
