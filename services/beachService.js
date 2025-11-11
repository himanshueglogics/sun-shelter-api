import prisma from '../utils/prisma.js';

class BeachService {
  // Helper to build sunbeds grid (unique per beach by zone prefix)
  buildSunbeds(rows = 0, cols = 0, zoneId = null) {
    const beds = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const code = zoneId ? `Z${zoneId}-R${r}C${c}` : `R${r}C${c}`;
        beds.push({ code, row: r, col: c, status: 'available' });
      }
    }
    return beds;
  }

  // Get all beaches with pagination
  async getAllBeaches(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [beaches, total] = await Promise.all([
      prisma.beach.findMany({
        where,
        include: {
          beachAdmins: { include: { user: { select: { id: true, name: true, email: true, role: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.beach.count({ where })
    ]);

    const mapped = beaches.map(b => ({
      ...b,
      admins: (b.beachAdmins || []).map(ba => ba.user)
    }));

    return {
      beaches: mapped,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBeaches: total
    };
  }

  // Get occupancy overview for all beaches
  async getOccupancyOverview() {
    const beaches = await prisma.beach.findMany();
    return beaches.map(b => ({
      beachId: b.id,
      name: b.name,
      occupancyRate: b.occupancyRate || 0,
      capacity: b.totalCapacity || 0,
      currentBookings: b.currentBookings || 0
    }));
  }

  // Get beach stats summary
  async getStatsSummary() {
    const [totalBeaches, activeAdmins] = await Promise.all([
      prisma.beach.count(),
      prisma.user.count({
        where:{
          role:{in:['admin','user']}
        }
      })
    ]);
    return { totalBeaches, activeAdmins };
  }

  // Get single beach by ID
  async getBeachById(id) {
    const numericId = Number(id);
    const beach = await prisma.beach.findUnique({
      where: { id: numericId },
      include: {
        beachAdmins: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        zones: {include: {sunbeds: true}}  
      }
    });
    if (!beach) throw new Error('Beach not found');
    return { ...beach, admins: beach.beachAdmins.map(ba => ba.user) };
    
  }

  async assignAdmin(beachId, userId) {
    const bId = Number(beachId);
    const uId = Number(userId);
    const [beach, user] = await Promise.all([
      prisma.beach.findUnique({ where: { id: bId } }),
      prisma.user.findUnique({ where: { id: uId } })
    ]);
    if (!beach) throw new Error('Beach not found');
    if (!user) throw new Error('User not found');

    const existsHere = await prisma.beachAdmin.findUnique({ where: { beachId_userId: { beachId: bId, userId: uId } } });
    if (existsHere) throw new Error('Admin already assigned to this beach');

    const other = await prisma.beachAdmin.findFirst({ where: { userId: uId, beachId: { not: bId } } });
    if (other) throw new Error('Admin already assigned to another beach');

    await prisma.beachAdmin.create({ data: { beachId: bId, userId: uId } });
    const updated = await prisma.beach.findUnique({
      where: { id: bId },
      include: { beachAdmins: { include: { user: { select: { id: true, name: true, email: true, role: true } } } } }
    });
    return { ...updated, admins: updated.beachAdmins.map(ba => ba.user) };
  }

  async assignAdmins(beachId, userIds = []) {
    const bId = Number(beachId);
    const uniqueIds = [...new Set(userIds.map(u => Number(u)))];
    const assigned = [];
    const skipped = [];

    const beach = await prisma.beach.findUnique({ where: { id: bId } });
    if (!beach) throw new Error('Beach not found');

    for (const uId of uniqueIds) {
      console.log('assignAdmins called with:', { beachId, userIds });

      const user = await prisma.user.findUnique({ where: { id: uId } });
      if (!user) { skipped.push({ userId: uId, reason: 'User not found' }); continue; }
      const existsHere = await prisma.beachAdmin.findUnique({ where: { beachId_userId: { beachId: bId, userId: uId } } });
      if (existsHere) { skipped.push({ userId: uId, reason: 'Admin already assigned to this beach' }); continue; }
      const other = await prisma.beachAdmin.findFirst({ where: { userId: uId, beachId: { not: bId } } });
      if (other) { skipped.push({ userId: uId, reason: 'Admin already assigned to another beach' }); continue; }
      await prisma.beachAdmin.create({ data: { beachId: bId, userId: uId } });
      assigned.push(uId);
    }

    const updated = await prisma.beach.findUnique({
      where: { id: bId },
      include: { beachAdmins: { include: { user: { select: { id: true, name: true, email: true, role: true } } } } }
    });
    return { beach: { ...updated, admins: updated.beachAdmins.map(ba => ba.user) }, assigned, skipped };
  }

  // Remove an admin user from a beach
  async removeAdmin(beachId, userId) {
    const bId = Number(beachId);
    const uId = Number(userId);
    await prisma.beachAdmin.delete({ where: { beachId_userId: { beachId: bId, userId: uId } } });
    const updated = await prisma.beach.findUnique({
      where: { id: bId },
      include: { beachAdmins: { include: { user: { select: { id: true, name: true, email: true, role: true } } } } }
    });
    return { ...updated, admins: updated.beachAdmins.map(ba => ba.user) };
  }

  // Create new beach
  async createBeach(data) {
    const created = await prisma.beach.create({ data });
    return created;
  }

  // Update beach
  async updateBeach(id, data) {
    const numericId = Number(id);
    const updated = await prisma.beach.update({ where: { id: numericId }, data });
    return updated;
  }

  // Delete beach (transactional: clear dependent rows to satisfy FKs)
  async deleteBeach(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new Error('Invalid beach id');

    // In MySQL, relations without onDelete will RESTRICT; we must delete dependents first.
    try {
      await prisma.$transaction(async (tx) => {
        // Collect booking ids for this beach
        const bookings = await tx.booking.findMany({
          where: { beachId: numericId },
          select: { id: true },
        });
        const bookingIds = bookings.map(b => b.id);

        if (bookingIds.length) {
          // Delete finance rows linked to these bookings first (avoid RESTRICT on Booking)
          await tx.finance.deleteMany({ where: { bookingId: { in: bookingIds } } });
          // BookingSunbed rows are set to onDelete: Cascade from Booking, so removing bookings will clear them
          await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
        }

        // Beach-level dependents
        await tx.finance.deleteMany({ where: { beachId: numericId } });
        await tx.payout.deleteMany({ where: { beachId: numericId } });
        await tx.alert.deleteMany({ where: { beachId: numericId } });

        // Zones, Sunbeds, BeachAdmins have onDelete: Cascade in schema
        await tx.beach.delete({ where: { id: numericId } });
      });
      return { message: 'Beach deleted successfully' };
    } catch (e) {
      if (e.code === 'P2025') {
        throw new Error('Beach not found');
      }
      throw e;
    }
  }

  // Add zone to beach
  async addZone(beachId, zoneData) {
    const bId = Number(beachId);
    const beach = await prisma.beach.findUnique({ where: { id: bId } });
    if (!beach) throw new Error('Beach not found');

    const { name, rows, cols, sunbeds } = zoneData;
    const createdZone = await prisma.zone.create({ data: { name, rows: rows || 0, cols: cols || 0, beachId: bId } });

    const beds = (sunbeds && sunbeds.length > 0 ? sunbeds : this.buildSunbeds(rows, cols, createdZone.id)).map(b => ({
      code: b.code || `Z${createdZone.id}-R${b.row}C${b.col}`,
      row: b.row,
      col: b.col,
      status: b.status || 'available',
      priceModifier: b.priceModifier || 0,
      beachId: bId,
      zoneId: createdZone.id
    }));
    if (beds.length) await prisma.sunbed.createMany({ data: beds });

    const newCapacity = await prisma.sunbed.count({ where: { beachId: bId } });
    await prisma.beach.update({ where: { id: bId }, data: { totalCapacity: newCapacity } });
    // Recompute occupancyRate based on occupied sunbeds (reserved/selected)
    const occupiedAdd = await prisma.sunbed.count({ where: { beachId: bId, status: { in: ['reserved', 'selected'] } } });
    const denomAdd = Number(newCapacity || 0);
    const newOccAdd = denomAdd > 0 ? Math.round((occupiedAdd / denomAdd) * 100) : 0;
    await prisma.beach.update({ where: { id: bId }, data: { occupancyRate: newOccAdd } });

    const updated = await prisma.beach.findUnique({ where: { id: bId }, include: { zones: true, sunbeds: true } });
    return updated;
  }

  // Update zone
  async updateZone(beachId, zoneId, updateData) {
    const bId = Number(beachId);
    const zId = Number(zoneId);
    const zone = await prisma.zone.findUnique({ where: { id: zId } });
    if (!zone || zone.beachId !== bId) throw new Error('Zone not found');

    const { name, rows, cols, sunbeds } = updateData;
    if (name !== undefined || rows !== undefined || cols !== undefined) {
      await prisma.zone.update({ where: { id: zId }, data: { name, rows, cols } });
    }

    if (sunbeds && Array.isArray(sunbeds)) {
      await prisma.sunbed.deleteMany({ where: { zoneId: zId } });
      const beds = sunbeds.map(b => ({
        code: b.code || `Z${zId}-R${b.row}C${b.col}`,
        row: b.row,
        col: b.col,
        status: b.status || 'available',
        priceModifier: b.priceModifier || 0,
        beachId: bId,
        zoneId: zId
      }));
      if (beds.length) await prisma.sunbed.createMany({ data: beds });
    } else if (rows !== undefined || cols !== undefined) {
      await prisma.sunbed.deleteMany({ where: { zoneId: zId } });
      const z = await prisma.zone.findUnique({ where: { id: zId } });
      const beds = this.buildSunbeds(z.rows, z.cols, zId).map(b => ({
        code: b.code,
        row: b.row,
        col: b.col,
        status: b.status,
        priceModifier: 0,
        beachId: bId,
        zoneId: zId
      }));
      if (beds.length) await prisma.sunbed.createMany({ data: beds });
    }

    const newCapacity = await prisma.sunbed.count({ where: { beachId: bId } });
    await prisma.beach.update({ where: { id: bId }, data: { totalCapacity: newCapacity } });

    // Recompute occupancyRate based on occupied sunbeds (reserved/selected)
    const occupied = await prisma.sunbed.count({ where: { beachId: bId, status: { in: ['reserved', 'selected'] } } });
    const denom = Number(newCapacity || 0);
    const newOcc = denom > 0 ? Math.round((occupied / denom) * 100) : 0;
    await prisma.beach.update({ where: { id: bId }, data: { occupancyRate: newOcc } });

    const updatedBeach = await prisma.beach.findUnique({ where: { id: bId }, include: { zones: true } });
    const updatedZone = await prisma.zone.findUnique({ where: { id: zId }, include: { sunbeds: true } });
    return { beach: updatedBeach, zone: updatedZone };
  }

  // Delete zone
  async deleteZone(beachId, zoneId) {
    const bId = Number(beachId);
    const zId = Number(zoneId);
    const zone = await prisma.zone.findUnique({ where: { id: zId } });
    if (!zone || zone.beachId !== bId) throw new Error('Zone not found');
    await prisma.sunbed.deleteMany({ where: { zoneId: zId } });
    await prisma.zone.delete({ where: { id: zId } });
    const newCapacity = await prisma.sunbed.count({ where: { beachId: bId } });
    await prisma.beach.update({ where: { id: bId }, data: { totalCapacity: newCapacity } });
    // Recompute occupancyRate after capacity change based on occupied sunbeds
    const occupiedDel = await prisma.sunbed.count({ where: { beachId: bId, status: { in: ['reserved', 'selected'] } } });
    const denomDel = Number(newCapacity || 0);
    const newOccDel = denomDel > 0 ? Math.round((occupiedDel / denomDel) * 100) : 0;
    await prisma.beach.update({ where: { id: bId }, data: { occupancyRate: newOccDel } });
    const updated = await prisma.beach.findUnique({ where: { id: bId }, include: { zones: true, sunbeds: true } });
    return updated;
  }

  // Update sunbed status
  async updateSunbedStatus(beachId, zoneId, sunbedId, status) {
    const bId = Number(beachId);
    const zId = Number(zoneId);
    const sId = Number(sunbedId);
    const bed = await prisma.sunbed.findUnique({ where: { id: sId } });
    if (!bed || bed.beachId !== bId || bed.zoneId !== zId) throw new Error('Sunbed not found');
    const updated = await prisma.sunbed.update({ where: { id: sId }, data: { status } });
    // Recompute occupancyRate after a bed status change
    const [total, occupied] = await Promise.all([
      prisma.sunbed.count({ where: { beachId: bId } }),
      prisma.sunbed.count({ where: { beachId: bId, status: { in: ['reserved', 'selected'] } } })
    ]);
    const newOcc = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const beach = await prisma.beach.update({ where: { id: bId }, data: { occupancyRate: newOcc } });
    const zone = await prisma.zone.findUnique({ where: { id: zId } });
    return { beach, zone, bed: updated };
  }
}

export default new BeachService();
