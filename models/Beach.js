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

module.exports = mongoose.model('Beach', beachSchema);
