const mongoose = require('mongoose');

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

module.exports = mongoose.model('Beach', beachSchema);
