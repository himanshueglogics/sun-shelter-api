import mongoose from 'mongoose';

const financeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['rental_income', 'service_fee', 'expense'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  beach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beach'
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Finance', financeSchema);
