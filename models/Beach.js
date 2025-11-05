const mongoose = require('mongoose');

const sunbedSchema = new mongoose.Schema({
  code: { type: String, required: true },
  status: { type: String, enum: ['available', 'reserved', 'unavailable'], default: 'available' },
  priceModifier: { type: Number, default: 0 }
}, { _id: true });

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rows: { type: Number, default: 0 },
  cols: { type: Number, default: 0 },
  sunbeds: { type: [sunbedSchema], default: [] }
}, { _id: true });

const beachSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true
  },
  occupancyRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalCapacity: {
    type: Number,
    required: true,
    default: 100
  },
  currentBookings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  amenities: [String],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  services: { type: [String], default: [] },
  zones: { type: [zoneSchema], default: [] },
  pricePerDay: {
    type: Number,
    required: true
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper method to recalculate capacity from zones/sunbeds
beachSchema.methods.recomputeCapacity = function() {
  try {
    const sum = (this.zones || []).reduce((acc, z) => acc + (z.sunbeds ? z.sunbeds.length : 0), 0);
    if (sum > 0) this.totalCapacity = sum;
  } catch (_) {}
};

// Helper method to calculate occupancy rate based on sunbed statuses
beachSchema.methods.calculateOccupancy = function() {
  try {
    let totalSunbeds = 0;
    let reservedSunbeds = 0;
    
    (this.zones || []).forEach(zone => {
      if (zone.sunbeds && zone.sunbeds.length > 0) {
        zone.sunbeds.forEach(bed => {
          // Count available and reserved sunbeds (exclude unavailable)
          if (bed.status === 'available' || bed.status === 'reserved' || bed.status === 'selected') {
            totalSunbeds++;
            if (bed.status === 'reserved' || bed.status === 'selected') {
              reservedSunbeds++;
            }
          }
        });
      }
    });
    
    if (totalSunbeds > 0) {
      this.occupancyRate = Math.round((reservedSunbeds / totalSunbeds) * 100);
      this.currentBookings = reservedSunbeds;
    } else {
      this.occupancyRate = 0;
      this.currentBookings = 0;
    }
  } catch (err) {
    console.error('Error calculating occupancy:', err);
  }
};

// Pre-save hook to automatically update occupancy
beachSchema.pre('save', function(next) {
  this.recomputeCapacity();
  this.calculateOccupancy();
  next();
});

module.exports = mongoose.model('Beach', beachSchema);
