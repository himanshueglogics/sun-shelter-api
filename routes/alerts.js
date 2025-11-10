import express from 'express';
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get all alerts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      include: { beach: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/alerts
// @desc    Create an alert
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, message, beachId } = req.body;
    const alert = await prisma.alert.create({
      data: {
        type,
        message,
        beachId: beachId ? Number(beachId) : null,
        isRead: false,
        createdAt: new Date()
      }
    });
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const alert = await prisma.alert.update({ where: { id }, data: { isRead: true } });
    res.json(alert);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Alert not found' });
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete alert
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.alert.delete({ where: { id } });
    res.json({ message: 'Alert removed' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Alert not found' });
    res.status(500).json({ message: error.message });
  }
});

export default router;
