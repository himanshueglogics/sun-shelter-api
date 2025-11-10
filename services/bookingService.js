import prisma from '../utils/prisma.js';

class BookingService {
  // Get booking statistics
  async getStats() {
    const [total, active, cancelled] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: { in: ['confirmed', 'pending', 'completed'] } } }),
      prisma.booking.count({ where: { status: 'cancelled' } })
    ]);
    
    return { total, active, cancelled };
  }

  // Get all bookings with filters and pagination
  async getAllBookings(filters) {
    const { page = 1, limit = 10, status, beach, checkInFrom, checkInTo } = filters;
    const where = {};
    if (status) where.status = status;
    if (beach) where.beachId = Number(beach);
    if (checkInFrom || checkInTo) {
      where.checkInDate = {};
      if (checkInFrom) where.checkInDate.gte = new Date(checkInFrom);
      if (checkInTo) where.checkInDate.lte = new Date(checkInTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          beach: { select: { id: true, name: true, location: true } },
          zone: { select: { id: true, name: true } },
          sunbeds: { include: { sunbed: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.booking.count({ where })
    ]);

    const mapped = items.map(b => ({
      ...b,
      sunbeds: (b.sunbeds || []).map(bs => bs.sunbed)
    }));

    return {
      bookings: mapped,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalBookings: total
    };
  }

  // Get single booking by ID
  async getBookingById(id) {
    const bId = Number(id);
    const booking = await prisma.booking.findUnique({
      where: { id: bId },
      include: {
        beach: { select: { id: true, name: true, location: true } },
        zone: { select: { id: true, name: true } },
        sunbeds: { include: { sunbed: true } }
      }
    });
    if (!booking) throw new Error('Booking not found');
    return { ...booking, sunbeds: booking.sunbeds.map(bs => bs.sunbed) };
  }

  // Create new booking
  async createBooking(bookingData) {
    const { beach, zone, sunbeds, customerName, customerEmail, customerPhone, checkInDate, checkOutDate, totalAmount } = bookingData;
    const beachId = Number(beach);
    const zoneId = zone ? Number(zone) : null;

    const exists = await prisma.beach.findUnique({ where: { id: beachId } });
    if (!exists) throw new Error('Beach not found');

    const booking = await prisma.booking.create({
      data: {
        beachId,
        zoneId,
        customerName,
        customerEmail,
        customerPhone,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        numberOfGuests: 0,
        totalAmount: Number(totalAmount || 0),
        status: 'confirmed',
        paymentStatus: 'paid'
      }
    });

    const sunbedIds = (sunbeds || []).map(Number);
    if (sunbedIds.length) {
      await prisma.bookingSunbed.createMany({
        data: sunbedIds.map(sid => ({ bookingId: booking.id, sunbedId: sid }))
      });
      await prisma.sunbed.updateMany({ where: { id: { in: sunbedIds } }, data: { status: 'reserved' } });
    }

    await prisma.finance.create({
      data: {
        type: 'booking',
        amount: Number(totalAmount || 0),
        description: `Booking for ${customerName}`,
        date: new Date(),
        bookingId: booking.id,
        beachId
      }
    });

    return booking;
  }

  // Update booking
  async updateBooking(id, updateData) {
    const bId = Number(id);
    const booking = await prisma.booking.update({ where: { id: bId }, data: updateData });
    return booking;
  }

  // Cancel booking
  async cancelBooking(id) {
    const bId = Number(id);
    const booking = await prisma.booking.update({ where: { id: bId }, data: { status: 'cancelled' } });
    const joins = await prisma.bookingSunbed.findMany({ where: { bookingId: bId } });
    const sIds = joins.map(j => j.sunbedId);
    if (sIds.length) await prisma.sunbed.updateMany({ where: { id: { in: sIds } }, data: { status: 'available' } });
    return booking;
  }

  // Delete booking
  async deleteBooking(id) {
    const bId = Number(id);
    const joins = await prisma.bookingSunbed.findMany({ where: { bookingId: bId } });
    const sIds = joins.map(j => j.sunbedId);
    if (sIds.length) await prisma.sunbed.updateMany({ where: { id: { in: sIds } }, data: { status: 'available' } });
    await prisma.bookingSunbed.deleteMany({ where: { bookingId: bId } });
    await prisma.finance.deleteMany({ where: { bookingId: bId } });
    await prisma.booking.delete({ where: { id: bId } });
    return { message: 'Booking deleted successfully' };
  }
}

export default new BookingService();
