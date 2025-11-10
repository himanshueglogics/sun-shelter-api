import beachService from '../services/beachService.js';

class BeachController {
  // @route   GET /api/beaches/occupancy-overview
  // @desc    Get occupancy overview for all beaches
  // @access  Private
  async getOccupancyOverview(req, res) {
    try {
      const overview = await beachService.getOccupancyOverview();
      res.json(overview);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // @route   GET /api/beaches/stats/summary
  // @desc    Get beach stats summary
  // @access  Private
  async getStatsSummary(req, res) {
    try {
      const stats = await beachService.getStatsSummary();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // @route   GET /api/beaches
  // @desc    Get all beaches (paginated)
  // @access  Private
  async getAllBeaches(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await beachService.getAllBeaches(page, limit, search);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // @route   GET /api/beaches/:id
  // @desc    Get single beach
  // @access  Private
  async getBeachById(req, res) {
    try {
      const beach = await beachService.getBeachById(req.params.id);
      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   POST /api/beaches
  // @desc    Create new beach
  // @access  Private
  async createBeach(req, res) {
    try {
      const beach = await beachService.createBeach(req.body);
      res.status(201).json(beach);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // @route   PUT /api/beaches/:id
  // @desc    Update beach
  // @access  Private
  async updateBeach(req, res) {
    try {
      const beach = await beachService.updateBeach(req.params.id, req.body);
      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   DELETE /api/beaches/:id
  // @desc    Delete beach
  // @access  Private
  async deleteBeach(req, res) {
    try {
      const result = await beachService.deleteBeach(req.params.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Beach not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   POST /api/beaches/:id/zones
  // @desc    Add a zone
  // @access  Private
  async addZone(req, res) {
    try {
      const beach = await beachService.addZone(req.params.id, req.body);
      // Emit occupancy update (and zone list refresh) so dashboards update immediately
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`beach:${beach.id}`).emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status
          });
          io.emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status
          });
        }
      } catch (_) { }
      res.status(201).json(beach);
    } catch (error) {
      if (error.message === 'Beach not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   PUT /api/beaches/:id/zones/:zoneId
  // @desc    Update zone (rows/cols -> regenerate sunbeds)
  // @access  Private
  async updateZone(req, res) {
    try {
      const { beach, zone } = await beachService.updateZone(
        req.params.id,
        req.params.zoneId,
        req.body
      );

      // Emit real-time updates
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`beach:${beach.id}`).emit('zone:update', {
            beachId: String(beach.id),
            zone: {
              id: Number(zone.id),
              name: zone.name,
              rows: zone.rows,
              cols: zone.cols,
              sunbeds: (zone.sunbeds || []).map(b => ({
                id: Number(b.id),
                code: b.code,
                row: b.row,
                col: b.col,
                status: b.status
              }))
            }
          });
          io.to(`beach:${beach.id}`).emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status
          });
          io.emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status
          });
        }
      } catch (_) { }

      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found' || error.message === 'Zone not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   DELETE /api/beaches/:id/zones/:zoneId
  // @desc    Remove zone
  // @access  Private
  async deleteZone(req, res) {
    try {
      const beach = await beachService.deleteZone(req.params.id, req.params.zoneId);
      // Emit occupancy update so dashboards update after deletion
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`beach:${beach.id}`).emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status
          });
          io.emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status
          });
        }
      } catch (_) { }
      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found' || error.message === 'Zone not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   POST /api/beaches/:id/admins
  // @desc    Assign an admin to a beach
  // @access  Private
  async assignAdmin(req, res) {
    try {
      const { userId, userIds } = req.body;

      if (Array.isArray(userIds) && userIds.length > 0) {
        const result = await beachService.assignAdmins(req.params.id, userIds);
        return res.json(result);
      }

      if (!userId) return res.status(400).json({ message: 'userId is required' });
      const beach = await beachService.assignAdmin(req.params.id, userId);
      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found' || error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Admin already assigned to this beach' || error.message === 'Admin already assigned to another beach') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   DELETE /api/beaches/:id/admins/:userId
  // @desc    Remove an admin from a beach
  // @access  Private
  async removeAdmin(req, res) {
    try {
      const { userId } = req.params;
      const beach = await beachService.removeAdmin(req.params.id, userId);
      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }

  // @route   PUT /api/beaches/:id/zones/:zoneId/sunbeds/:sunbedId
  // @desc    Update a sunbed status
  // @access  Private
  async updateSunbedStatus(req, res) {
    try {
      const actorId = req.headers['x-socket-id'] || null;
      const { beach, zone, bed } = await beachService.updateSunbedStatus(
        req.params.id,
        req.params.zoneId,
        req.params.sunbedId,
        req.body.status
      );

      // Emit real-time updates
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`beach:${beach.id}`).emit('sunbed:update', {
            beachId: Number(beach.id),
            zoneId: Number(zone.id),
            sunbed: {
              id: Number(bed.id),
              code: bed.code,
              row: bed.row,
              col: bed.col,
              status: bed.status
            },
            actorId
          });
          io.to(`beach:${beach.id}`).emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status,
            actorId
          });
          io.emit('beach:occupancy', {
            beachId: Number(beach.id),
            occupancyRate: beach.occupancyRate,
            currentBookings: beach.currentBookings,
            capacity: beach.totalCapacity,
            status: beach.status,
            actorId
          });
        }
      } catch (_) { }

      res.json(beach);
    } catch (error) {
      if (error.message === 'Beach not found' || error.message === 'Zone not found' || error.message === 'Sunbed not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  }
}

export default new BeachController();
