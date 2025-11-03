const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  beach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beach'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Alert', alertSchema);
