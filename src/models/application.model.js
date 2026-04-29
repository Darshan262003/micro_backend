const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'rejected', 'withdrawn'],
      default: 'pending',
    },
  },
  { timestamps: true, versionKey: false }
);

// Prevent duplicate applications by the same worker to the same job.
applicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = { Application };

