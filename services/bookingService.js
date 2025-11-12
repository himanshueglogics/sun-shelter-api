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
      let fromDate=null;
      let toDate=null;
      if (checkInFrom){
        fromDate=new Date(checkInFrom)
        fromDate.setHours(0,0,0,0)
      }
      if (checkInTo){
        toDate=new Date(checkInTo)
        toDate.setHours(23,59,59,999)
      }
      if (fromDate && toDate){
        where.AND=[
          {checkInDate:{lte:toDate}},
          {checkOutDate:{gte:fromDate}}
        ]
      }else if (fromDate){
        where.checkInDate={gte:fromDate}
      }else if (toDate){
        where.checkOutDate={lte:toDate}
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          beach: { select: { id: true, name: true, location: true } },
          zone: { select: { id: true, name: true } },
          _count:{select : {sunbeds:true}}
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
    if (!id||isNaN(bId)){
      throw new Error("Invalid Booking Id")
    }
    const booking = await prisma.booking.findUnique({
      where: { id: bId },
      include: {
        beach: { select: { id: true, name: true, location: true } },
        zone: { select: { id: true, name: true,rows:true,cols:true,sunbeds: {select: {id:true,row:true,col:true,code:true,status:true}} } },
        sunbeds:{include:{sunbed:true}}
      }
    });
    if (!booking) throw new Error('Booking not found');
    const sunbedList = booking.sunbeds?.map(bs => bs.sunbed) || [];
    
    return { ...booking, sunbeds: sunbedList };
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
        type: 'rental_income',
        amount: Number(totalAmount || 0),
        description: `Booking for ${customerName}`,
        date: new Date(),
        bookingId: booking.id,
        beachId
      }
    });

    return booking;
  if (global.io) {
  global.io.emit('booking:created', {
    bookingId: booking.id,
    beachId,
    customerName,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
  });
}
  }

  // Update booking
  async updateBooking(id, updateData) {
     const bId = Number(id);
  if (!bId || isNaN(bId)) throw new Error("Invalid booking ID");

  // Extract only valid scalar fields
  const safeData = {
    customerName: updateData.customerName,
    customerEmail: updateData.customerEmail,
    customerPhone: updateData.customerPhone,
    checkInDate: updateData.checkInDate ? new Date(updateData.checkInDate) : undefined,
    checkOutDate: updateData.checkOutDate ? new Date(updateData.checkOutDate) : undefined,
    numberOfGuests: Number(updateData.numberOfGuests || 0),
    totalAmount: Number(updateData.totalAmount || 0),
    status: updateData.status,
    paymentStatus: updateData.paymentStatus,
    beachId: updateData.beach?.id || updateData.beachId,
    zoneId: updateData.zone?.id || updateData.zoneId,
  };

  // Remove undefined/null keys
  Object.keys(safeData).forEach((key) => {
    if (safeData[key] === undefined) delete safeData[key];
  });

  const booking = await prisma.booking.update({
    where: { id: bId },
    data: safeData,
  });
  return booking;
  }

  // Cancel booking
  async cancelBooking(id) {
    const bId = Number(id);
    const booking=await prisma.$transaction(async(tx)=>{
      const booking = await tx.booking.findUnique({ where: { id: bId },include:{sunbeds:true} });
      if(!booking) throw new Error('Booking not found');
      const sunbedIds=booking.sunbeds.map(bs=>bs.sunbedId)
      if (sunbedIds.length){
      await tx.sunbed.updateMany({
        where : {id: {in:sunbedIds}},data:{status:'available'}
      })
    }
    await tx.booking.update({
      where: {id:bId},data:{status:"cancelled"}
    })
    return booking;
  })

  if (global.io){
    global.io.emit('booking:cancelled',{bookingId:bId,beachId:booking.beachId,freedSunbeds:booking.sunbeds.map(bs=>bs.sunbedId)})
  }
    
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
