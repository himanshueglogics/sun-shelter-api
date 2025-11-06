import express from 'express';
import { protect } from '../middleware/auth.js';
import dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', protect, dashboardController.getStats.bind(dashboardController));

export default router;
