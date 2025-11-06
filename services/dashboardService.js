import Beach from '../models/Beach.js';
import Booking from '../models/Booking.js';
import Finance from '../models/Finance.js';

class DashboardService {
  async getStats() {
    try {
      // Get all beaches
      const beaches = await Beach.find();
      
      // Calculate total capacity and current bookings
      let totalCapacity = 0;
      let totalOccupied = 0;
      
      beaches.forEach(beach => {
        totalCapacity += beach.capacity || 0;
        totalOccupied += beach.currentBookings || 0;
      });
      
      // Calculate average occupancy
      const averageOccupancy = totalCapacity > 0 
        ? Math.round((totalOccupied / totalCapacity) * 100) 
        : 0;
      
      // Get total bookings count
      const totalBookings = await Booking.countDocuments();
      
      // Get upcoming bookings (future dates)
      const upcomingBookings = await Booking.countDocuments({
        date: { $gte: new Date() }
      });
      
      // Get revenue data
      const revenueData = await Finance.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' }
          }
        }
      ]);
      
      const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
      
      // Get beach occupancy overview
      const beachOccupancy = beaches.map(beach => ({
        name: beach.name,
        occupancyRate: beach.occupancyRate || 0,
        capacity: beach.capacity || 0,
        currentBookings: beach.currentBookings || 0
      }));
      
      // Get revenue breakdown by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const revenueBreakdown = await Finance.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$amount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      
      // Format revenue breakdown
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedRevenue = revenueBreakdown.map(item => ({
        month: monthNames[item._id.month - 1],
        revenue: item.revenue
      }));
      
      return {
        totalBookings,
        averageOccupancy,
        upcomingBookings,
        totalRevenue,
        beachOccupancy,
        revenueBreakdown: formattedRevenue
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }
}

export default new DashboardService();
