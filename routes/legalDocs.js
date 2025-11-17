import express from 'express';
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET legal document
router.get('/:type', protect, async (req, res) => {
  const { type } = req.params;

  const doc = await prisma.legalDocument.findUnique({
    where: { type }
  });

  if (!doc) return res.status(404).json({ message: 'Document not found' });

  res.json(doc);
});

// UPDATE legal document
router.put('/:type', protect, async (req, res) => {
  const { type } = req.params;
  const { content } = req.body;

  const updated = await prisma.legalDocument.upsert({
    where: { type },
    update: { content },
    create: { type, content }
  });

  res.json(updated);
});

export default router;
