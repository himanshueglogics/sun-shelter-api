import authService from '../services/authService.js';

class AuthController {
  // @route   POST /api/auth/register
  // @desc    Register user
  // @access  Public
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'User already exists') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   POST /api/auth/login
  // @desc    Login user
  // @access  Public
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ message: error.message });
      }
      if (error.message === 'Not authorized') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   GET /api/auth/me
  // @desc    Get current user
  // @access  Private
  async getCurrentUser(req, res) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.json(user);
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   POST /api/auth/forgot-password
  // @desc    Forgot password
  // @access  Public
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Please provide an email' });
      }

      const result = await authService.forgotPassword(email);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Email could not be sent') {
        return res.status(500).json({ message: error.message });
      }
      if (error.message === 'Not authorized') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   PUT /api/auth/reset-password/:resetToken
  // @desc    Reset password
  // @access  Public
  async resetPassword(req, res) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Please provide a password' });
      }

      const result = await authService.resetPassword(req.params.resetToken, password);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid or expired token') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AuthController();

