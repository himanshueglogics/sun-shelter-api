import Booking from '../models/Booking.js';
import Beach from '../models/Beach.js';
import Finance from '../models/Finance.js';

class BookingService {
  // Get booking statistics
  async getStats() {
    const [total, active, cancelled] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ 
        status: { $in: ['confirmed', 'pending', 'completed'] } 
      }),
      Booking.countDocuments({ status: 'cancelled' })
    ]);
    
    return { total, active, cancelled };
  }

  // Get all bookings with filters and pagination
  async getAllBookings(filters) {
    const { page = 1, limit = 10, status, beach, checkInFrom, checkInTo } = filters;
    const query = {};
    
    if (status) query.status = status;
    if (beach) query.beach = beach;
    if (checkInFrom || checkInTo) {
      query.checkInDate = {};
      if (checkInFrom) query.checkInDate.$gte = new Date(checkInFrom);
      if (checkInTo) query.checkInDate.$lte = new Date(checkInTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Booking.find(query)
        .populate('beach', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(query)
    ]);

    return {
      bookings: items,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalBookings: total
    };
  }

  // Get single booking by ID
  async getBookingById(id) {
    const booking = await Booking.findById(id)
      .populate('beach', 'name location')
      .populate('zone', 'name')
      .populate('sunbeds');
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    return booking;
  }

  // Create new booking
  async createBooking(bookingData) {
    const { beach, zone, sunbeds, customerName, customerEmail, checkInDate, checkOutDate, totalPrice } = bookingData;
    
    // Validate beach exists
    const beachDoc = await Beach.findById(beach);
    if (!beachDoc) {
      throw new Error('Beach not found');
    }

    // Create booking
    const booking = await Booking.create({
      beach,
      zone,
      sunbeds,
      customerName,
      customerEmail,
      checkInDate,
      checkOutDate,
      totalPrice,
      status: 'confirmed'
    });

    // Update sunbed statuses to reserved
    const zoneDoc = beachDoc.zones.id(zone);
    if (zoneDoc) {
      sunbeds.forEach(sunbedId => {
        const sunbed = zoneDoc.sunbeds.id(sunbedId);
        if (sunbed) {
          sunbed.status = 'reserved';
        }
      });
      await beachDoc.save();
    }

    // Create finance record
    await Finance.create({
      type: 'booking',
      amount: totalPrice,
      description: `Booking for ${customerName}`,
      booking: booking._id,
      beach: beach,
      date: new Date()
    });

    return booking;
  }

  // Update booking
  async updateBooking(id, updateData) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    Object.assign(booking, updateData);
    await booking.save();
    
    return booking;
  }

  // Cancel booking
  async cancelBooking(id) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.status = 'cancelled';
    await booking.save();

    // Free up sunbeds
    const beach = await Beach.findById(booking.beach);
    if (beach) {
      const zone = beach.zones.id(booking.zone);
      if (zone) {
        booking.sunbeds.forEach(sunbedId => {
          const sunbed = zone.sunbeds.id(sunbedId);
          if (sunbed && sunbed.status === 'reserved') {
            sunbed.status = 'available';
          }
        });
        await beach.save();
      }
    }

    return booking;
  }

  // Delete booking
  async deleteBooking(id) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Free up sunbeds before deleting
    const beach = await Beach.findById(booking.beach);
    if (beach) {
      const zone = beach.zones.id(booking.zone);
      if (zone) {
        booking.sunbeds.forEach(sunbedId => {
          const sunbed = zone.sunbeds.id(sunbedId);
          if (sunbed && sunbed.status === 'reserved') {
            sunbed.status = 'available';
          }
        });
        await beach.save();
      }
    }

    await booking.deleteOne();
    return { message: 'Booking deleted successfully' };
  }
}

export default new BookingService();
