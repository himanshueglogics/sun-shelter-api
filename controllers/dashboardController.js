import dashboardService from '../services/dashboardService.js';

class DashboardController {
  // @route   GET /api/dashboard/stats
  // @desc    Get dashboard statistics
  // @access  Private
  async getStats(req, res) {
    try {
      const stats = await dashboardService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new DashboardController();
