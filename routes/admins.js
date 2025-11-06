import express from 'express';
import User from '../models/User.js';
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
    const admins = await User.find({}, '-password').sort({ createdAt: -1 });
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
    const { email, password, name, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ email, password, name, role: role || 'admin' });
    const json = user.toObject();
    delete json.password;
    res.status(201).json(json);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   PUT /api/admins/:id
// @desc    Update admin details/role (super admin only)
// @access  Private
router.put('/:id', protect, requireSuper, async (req, res) => {
  try {
    const allowed = ['name', 'role'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// @route   DELETE /api/admins/:id
// @desc    Delete admin (super admin only)
// @access  Private
router.delete('/:id', protect, requireSuper, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent deleting super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete super admin account' });
    }
    
    await user.deleteOne();
    res.json({ message: 'Admin removed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
