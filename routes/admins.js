import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper middleware to ensure super admin
const requireSuper = (req, res, next) => {
  // Accept multiple super admin role formats
  const superAdminRoles = ['super_admin', 'Super Admin', 'superadmin', 'SUPER_ADMIN', 'admin'];
  
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  
  if (!superAdminRoles.includes(req.user.role)) {
    console.log('Access denied. User role:', req.user.role);
    return res.status(403).json({ message: `Forbidden. Super admin access required. Your role: ${req.user.role}` });
  }
  
  next();
};

// @route   GET /api/admins
// @desc    List admins
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        NOT: { role: 'super_admin' }
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true,phone:true, role: true, createdAt: true }
    });
    res.json(admins);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   POST /api/admins
// @desc    Create admin (super admin only)
// @access  Private
router.post('/', protect, requireSuper, async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name,phone, role: role || 'admin', createdAt: new Date() },
      select: { id: true, name: true, email: true,phone:true, role: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   PUT /api/admins/:id
// @desc    Update admin details/role (super admin only)
// @access  Private
router.put('/:id', protect, requireSuper, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const allowed = ['name', 'role'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const user = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true,phone:true, role: true, createdAt: true } });
    res.json(user);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'User not found' });
    res.status(500).json({ message: e.message });
  }
});

// @route   DELETE /api/admins/:id
// @desc    Delete admin (super admin only)
// @access  Private
router.delete('/:id', protect, requireSuper, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true,phone:true } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ message: 'Cannot delete super admin account' });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Admin removed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
