const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date, required: true },
    paymentAmount: { type: Number, default: 0, min: 0 },
    requiredWorkers: { type: Number, required: true, min: 1 },
    confirmedCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ['posted', 'filled', 'completed', 'cancelled'],
      default: 'posted',
    },
  },
  { timestamps: true, versionKey: false }
);

const Job = mongoose.model('Job', jobSchema);
module.exports = { Job };
