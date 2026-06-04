const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
    recipientRole: { type: String, required: true, enum: ['employer', 'worker'], index: true },
    type: {
      type: String,
      required: true,
      enum: ['JOB_POSTED', 'JOB_APPLIED', 'APPLICATION_CONFIRMED', 'APPLICATION_REJECTED'],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = { Notification };

