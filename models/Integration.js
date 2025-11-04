const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., Stripe, PayPal, MapBox
  type: { type: String, required: true }, // payment, maps, email, webhooks, etc.
  provider: { type: String },
  enabled: { type: Boolean, default: false },
  settings: { type: Object, default: {} }, // store keys, ids, configs
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Integration', integrationSchema);
