import Beach from '../models/Beach.js';
import User from '../models/User.js';

class BeachService {
  // Helper to build sunbeds grid
  buildSunbeds(rows = 0, cols = 0) {
    const beds = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        beds.push({ code: `R${r}C${c}`, row: r, col: c, status: 'available' });
      }
    }
    return beds;
  }

  // Get all beaches with pagination
  async getAllBeaches(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    
    const beaches = await Beach.find(query)
      .populate('admins', '-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Beach.countDocuments(query);
    
    return {
      beaches,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBeaches: total
    };
  }

  // Get occupancy overview for all beaches
  async getOccupancyOverview() {
    const beaches = await Beach.find();
    return beaches.map(b => ({
      beachId: b._id,
      name: b.name,
      occupancyRate: b.occupancyRate || 0,
      capacity: b.capacity || 0,
      currentBookings: b.currentBookings || 0
    }));
  }

  // Get beach stats summary
  async getStatsSummary() {
    const totalBeaches = await Beach.countDocuments();
    const activeAdmins = await User.countDocuments();
    return { totalBeaches, activeAdmins };
  }

  // Get single beach by ID
  async getBeachById(id) {
    const beach = await Beach.findById(id).populate('admins', '-password');
    if (!beach) {
      throw new Error('Beach not found');
    }
    return beach;
  }

  // Assign an admin user to a beach
  async assignAdmin(beachId, userId) {
    const beach = await Beach.findById(beachId);
    if (!beach) throw new Error('Beach not found');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const exists = (beach.admins || []).some(a => String(a) === String(userId));
    if (!exists) {
      beach.admins.push(userId);
      await beach.save();
    }
    // Return populated beach
    return await Beach.findById(beachId).populate('admins', '-password');
  }

  // Remove an admin user from a beach
  async removeAdmin(beachId, userId) {
    const beach = await Beach.findById(beachId);
    if (!beach) throw new Error('Beach not found');
    beach.admins = (beach.admins || []).filter(a => String(a) !== String(userId));
    await beach.save();
    return await Beach.findById(beachId).populate('admins', '-password');
  }

  // Create new beach
  async createBeach(data) {
    const beach = new Beach(data);
    await beach.save();
    return beach;
  }

  // Update beach
  async updateBeach(id, data) {
    const beach = await Beach.findById(id);
    if (!beach) {
      throw new Error('Beach not found');
    }
    
    Object.assign(beach, data);
    await beach.save();
    return beach;
  }

  // Delete beach
  async deleteBeach(id) {
    const beach = await Beach.findById(id);
    if (!beach) {
      throw new Error('Beach not found');
    }
    
    await beach.deleteOne();
    return { message: 'Beach deleted successfully' };
  }

  // Add zone to beach
  async addZone(beachId, zoneData) {
    const beach = await Beach.findById(beachId);
    if (!beach) {
      throw new Error('Beach not found');
    }

    const { name, rows, cols, sunbeds } = zoneData;
    
    // Use provided sunbeds if available, otherwise generate default ones
    const zoneSunbeds = sunbeds && sunbeds.length > 0 
      ? sunbeds.map(bed => ({
          code: bed.code || `R${bed.row}C${bed.col}`,
          row: bed.row,
          col: bed.col,
          status: bed.status || 'available',
          priceModifier: bed.priceModifier || 0
        }))
      : this.buildSunbeds(rows, cols);
    
    const zone = { name, rows, cols, sunbeds: zoneSunbeds };
    beach.zones.push(zone);
    beach.recomputeCapacity();
    await beach.save();
    
    return beach;
  }

  // Update zone
  async updateZone(beachId, zoneId, updateData) {
    const beach = await Beach.findById(beachId);
    if (!beach) {
      throw new Error('Beach not found');
    }
    
    const zone = beach.zones.id(zoneId);
    if (!zone) {
      throw new Error('Zone not found');
    }

    const { name, rows, cols, sunbeds } = updateData;
    
    if (name !== undefined) zone.name = name;
    if (rows !== undefined) zone.rows = rows;
    if (cols !== undefined) zone.cols = cols;
    
    // If sunbeds are provided, use them directly
    if (sunbeds && Array.isArray(sunbeds) && sunbeds.length > 0) {
      zone.sunbeds = sunbeds.map(bed => ({
        _id: bed._id, // Preserve existing _id if available
        code: bed.code || `R${bed.row}C${bed.col}`,
        row: bed.row,
        col: bed.col,
        status: bed.status || 'available',
        priceModifier: bed.priceModifier || 0
      }));
    } else if (rows !== undefined || cols !== undefined) {
      // Preserve existing sunbed selections when dimensions change
      const existingBeds = zone.sunbeds || [];
      const newBeds = [];
      for (let r = 1; r <= zone.rows; r++) {
        for (let c = 1; c <= zone.cols; c++) {
          const existing = existingBeds.find(b => b.row === r && b.col === c);
          if (existing) {
            // Keep existing bed with its status
            newBeds.push(existing);
          } else {
            // Add new bed as available
            newBeds.push({ code: `R${r}C${c}`, row: r, col: c, status: 'available' });
          }
        }
      }
      zone.sunbeds = newBeds;
    }
    
    beach.recomputeCapacity();
    await beach.save();
    
    return { beach, zone };
  }

  // Delete zone
  async deleteZone(beachId, zoneId) {
    const beach = await Beach.findById(beachId);
    if (!beach) {
      throw new Error('Beach not found');
    }
    
    const zone = beach.zones.id(zoneId);
    if (!zone) {
      throw new Error('Zone not found');
    }
    
    zone.remove();
    beach.recomputeCapacity();
    await beach.save();
    
    return beach;
  }

  // Update sunbed status
  async updateSunbedStatus(beachId, zoneId, sunbedId, status) {
    const beach = await Beach.findById(beachId);
    if (!beach) {
      throw new Error('Beach not found');
    }
    
    const zone = beach.zones.id(zoneId);
    if (!zone) {
      throw new Error('Zone not found');
    }
    
    const bed = zone.sunbeds.id(sunbedId);
    if (!bed) {
      throw new Error('Sunbed not found');
    }
    
    if (status) bed.status = status;
    await beach.save();
    
    return { beach, zone, bed };
  }
}

export default new BeachService();
