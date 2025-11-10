import express from 'express'
const router = express.Router();
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

// @route   GET /api/finance
// @desc    Get all finance records
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { beach, month, year } = req.query;
    const where = {};

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      where.date = { gte: startDate, lte: endDate };
    }
    if (month && year) {
      const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      where.date = { gte: startDate, lt: endDate };
    }

    if (beach) {
      const beaches = await prisma.beach.findMany({ where: { name: { contains: beach, mode: 'insensitive' } }, select: { id: true } });
      if (beaches.length) where.beachId = { in: beaches.map(b => b.id) };
      else where.beachId = -1; // force empty
    }

    const finances = await prisma.finance.findMany({
      where,
      include: {
        beach: { select: { id: true, name: true } },
        booking: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance
// @desc    Create a finance record
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, amount, description, bookingId, beachId, date } = req.body;
    const finance = await prisma.finance.create({
      data: {
        type,
        amount: Number(amount),
        description,
        bookingId: bookingId ? Number(bookingId) : null,
        beachId: beachId ? Number(beachId) : null,
        date: date ? new Date(date) : new Date(),
        createdAt: new Date()
      }
    });
    res.status(201).json(finance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/summary
// @desc    Get finance summary
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const grouped = await prisma.finance.groupBy({
      by: ['type'],
      _sum: { amount: true }
    });
    const summary = grouped.map(g => ({ _id: g.type, total: g._sum.amount || 0 }));
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/overview
// @desc    Get finance overview
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    const [rev, exp, pendingPayouts] = await Promise.all([
      prisma.finance.aggregate({ _sum: { amount: true }, where: { type: { in: ['rental_income', 'service_fee'] } } }),
      prisma.finance.aggregate({ _sum: { amount: true }, where: { type: 'expense' } }),
      prisma.payout.count({ where: { status: 'pending' } })
    ]);
    res.json({
      totalRevenue: rev._sum.amount || 0,
      totalExpenses: exp._sum.amount || 0,
      pendingPayouts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/beach-revenue
// @desc    Get beach revenue distribution
// @access  Private
router.get('/beach-revenue', protect, async (req, res) => {
  try {
    const grouped = await prisma.finance.groupBy({
      by: ['beachId'],
      where: { type: { in: ['rental_income', 'service_fee'] } },
      _sum: { amount: true }
    });
    const beachIds = grouped.map(g => g.beachId).filter(Boolean);
    const beaches = await prisma.beach.findMany({ where: { id: { in: beachIds } }, select: { id: true, name: true } });
    const nameMap = new Map(beaches.map(b => [b.id, b.name]));
    const result = grouped
      .filter(g => g.beachId != null)
      .map(g => ({ name: nameMap.get(g.beachId) || 'Unknown', value: g._sum.amount || 0 }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/service-fees
// @desc    Get service fees by beach
// @access  Private
router.get('/service-fees', protect, async (req, res) => {
  try {
    const beaches = await prisma.beach.findMany({ select: { id: true, name: true } });
    const serviceFees = await Promise.all(beaches.map(async (beach) => {
      const [bookings, revenueAgg] = await Promise.all([
        prisma.booking.count({ where: { beachId: beach.id, status: { not: 'cancelled' } } }),
        prisma.finance.aggregate({ _sum: { amount: true }, where: { beachId: beach.id, type: { in: ['rental_income', 'service_fee'] } } })
      ]);
      const totalRev = revenueAgg._sum.amount || 0;
      return {
        beach: beach.name,
        bookings,
        vip: Math.floor(bookings * 0.4),
        guests: Math.floor(bookings * 3.5),
        revenue: `$${totalRev.toLocaleString()}`
      };
    }));
    res.json(serviceFees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/detailed-report
// @desc    Get detailed revenue report
// @access  Private
router.get('/detailed-report', protect, async (req, res) => {
  try {
    const beaches = await prisma.beach.findMany({ select: { id: true, name: true } });
    const report = await Promise.all(beaches.map(async (beach) => {
      const [bookingRev, serviceFees] = await Promise.all([
        prisma.finance.aggregate({ _sum: { amount: true }, where: { beachId: beach.id, type: 'rental_income' } }),
        prisma.finance.aggregate({ _sum: { amount: true }, where: { beachId: beach.id, type: 'service_fee' } })
      ]);
      const bookingRevenue = bookingRev._sum.amount || 0;
      const serviceFee = serviceFees._sum.amount || 0;
      return {
        beach: beach.name,
        bookingRevenue: `$${bookingRevenue.toLocaleString()}`,
        serviceFees: `$${serviceFee.toLocaleString()}`,
        totalRevenue: `$${(bookingRevenue + serviceFee).toLocaleString()}`
      };
    }));
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/finance/insights
// @desc    Get monthly revenue insights
// @access  Private
router.get('/insights', protect, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    const rows = await prisma.finance.findMany({
      where: { type: { in: ['rental_income', 'service_fee'] }, date: { gte: start, lte: end } },
      select: { amount: true, date: true }
    });
    const buckets = Array.from({ length: 12 }, () => 0);
    for (const r of rows) {
      const m = (new Date(r.date)).getMonth();
      buckets[m] += Number(r.amount || 0);
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = months.map((month, i) => ({ month, revenue: buckets[i] }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- Payout Management ----------

// @route   GET /api/finance/payouts
// @desc    Get all payouts
// @access  Private
router.get('/payouts', protect, async (req, res) => {
  try {
    const payouts = await prisma.payout.findMany({
      include: { beach: { select: { id: true, name: true } }, processedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { requestedDate: 'desc' }
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/payouts
// @desc    Create a payout request
// @access  Private
router.post('/payouts', protect, async (req, res) => {
  try {
    const { amount, beachId, notes } = req.body;
    const payout = await prisma.payout.create({
      data: {
        amount: Number(amount),
        beachId: Number(beachId),
        status: 'pending',
        notes: notes || null,
        requestedDate: new Date(),
        createdAt: new Date()
      }
    });
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/payouts/:id/approve
// @desc    Approve a payout
// @access  Private
router.post('/payouts/:id/approve', protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payout = await prisma.payout.update({
      where: { id },
      data: { status: 'approved', processedDate: new Date(), processedById: Number(req.user.id) }
    });
    res.json(payout);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Payout not found' });
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/payouts/:id/reject
// @desc    Reject a payout
// @access  Private
router.post('/payouts/:id/reject', protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payout = await prisma.payout.update({
      where: { id },
      data: { status: 'rejected', processedDate: new Date(), processedById: Number(req.user.id), notes: req.body.notes || null }
    });
    res.json(payout);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Payout not found' });
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/finance/seed
// @desc    Seed finance data with dummy records
// @access  Private
router.post('/seed', protect, async (req, res) => {
  try {
    const beaches = await prisma.beach.findMany({ select: { id: true, name: true } });
    if (!beaches.length) return res.status(400).json({ message: 'No beaches found. Please create beaches first.' });

    await prisma.finance.deleteMany({});
    await prisma.payout.deleteMany({});

    const financeRecords = [];
    const now = new Date();
    for (let m = 0; m < 12; m++) {
      const base = new Date(now);
      base.setMonth(base.getMonth() - m);
      for (const beach of beaches) {
        const bookingsCount = Math.floor(Math.random() * 16) + 15;
        for (let i = 0; i < bookingsCount; i++) {
          const bookingAmount = Math.floor(Math.random() * 300) + 100;
          const rentalIncome = bookingAmount * 0.93;
          const serviceFee = bookingAmount * 0.07;
          financeRecords.push({ type: 'rental_income', amount: rentalIncome, description: `Rental income - ${beach.name}`, beachId: beach.id, date: new Date(base.getFullYear(), base.getMonth(), Math.floor(Math.random() * 28) + 1), createdAt: new Date() });
          financeRecords.push({ type: 'service_fee', amount: serviceFee, description: `Service fee - ${beach.name}`, beachId: beach.id, date: new Date(base.getFullYear(), base.getMonth(), Math.floor(Math.random() * 28) + 1), createdAt: new Date() });
        }
        const expensesCount = Math.floor(Math.random() * 6) + 5;
        for (let i = 0; i < expensesCount; i++) {
          const expenseAmount = Math.floor(Math.random() * 500) + 50;
          financeRecords.push({ type: 'expense', amount: expenseAmount, description: `Maintenance and operations - ${beach.name}`, beachId: beach.id, date: new Date(base.getFullYear(), base.getMonth(), Math.floor(Math.random() * 28) + 1), createdAt: new Date() });
        }
      }
    }

    if (financeRecords.length) await prisma.finance.createMany({ data: financeRecords });

    const payouts = beaches.slice(0, Math.min(4, beaches.length)).map((beach, idx) => ({
      beachId: beach.id,
      amount: Math.floor(Math.random() * 10000) + 5000,
      status: 'pending',
      requestedDate: new Date(Date.now() - (idx * 86400000)),
      createdAt: new Date()
    }));
    if (payouts.length) await prisma.payout.createMany({ data: payouts });

    res.json({ message: 'Finance data seeded successfully', financeRecords: financeRecords.length, payouts: payouts.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


export default router;
