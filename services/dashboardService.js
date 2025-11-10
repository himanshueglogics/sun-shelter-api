import prisma from '../utils/prisma.js';

class DashboardService {
  async getStats() {
    try {
      const beaches = await prisma.beach.findMany();

      let totalCapacity = 0;
      let totalOccupied = 0;
      for (const beach of beaches) {
        totalCapacity += Number(beach.totalCapacity || 0);
        totalOccupied += Number(beach.currentBookings || 0);
      }
      const averageOccupancy = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

      const [totalBookings, upcomingBookings, revenueAgg] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { checkInDate: { gte: new Date() } } }),
        prisma.finance.aggregate({ _sum: { amount: true } })
      ]);
      const totalRevenue = revenueAgg._sum.amount || 0;

      const beachOccupancy = beaches.map(b => ({
        beachId: b.id,
        name:b.name,
        occupancyRate: b.occupancyRate || 0,
        capacity: b.totalCapacity || 0,
        currentBookings: b.currentBookings || 0
      }));

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const rows = await prisma.finance.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { amount: true, date: true }
      });
      const buckets = Array.from({ length: 12 }, () => 0);
      for (const r of rows) {
        const m = (new Date(r.date)).getMonth();
        buckets[m] += Number(r.amount || 0);
      }
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const formattedRevenue = Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (now.getMonth() - 5 + i + 12) % 12;
        return { month: monthNames[monthIndex], revenue: buckets[monthIndex] };
      });

      return { totalBookings, averageOccupancy, upcomingBookings, totalRevenue, beachOccupancy, revenueBreakdown: formattedRevenue };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }
}

export default new DashboardService();
