import express from 'express';
import { protect } from '../middleware/auth.js';
import authController from '../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Private (super_admin only)
router.post('/register', protect, authController.register.bind(authController));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login.bind(authController));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.getCurrentUser.bind(authController));

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', authController.forgotPassword.bind(authController));

// @route   GET /api/auth/validate-reset/:resetToken
// @desc    Validate reset token
// @access  Public
router.get('/validate-reset/:resetToken', authController.validateResetToken.bind(authController));

// @route   PUT /api/auth/reset-password/:resetToken
// @desc    Reset password (also support POST for client compatibility)
// @access  Public
router.put('/reset-password/:resetToken', authController.resetPassword.bind(authController));
router.post('/reset-password/:resetToken', authController.resetPassword.bind(authController));

export default router;
