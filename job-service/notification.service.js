const mongoose = require('mongoose');
const { Notification } = require('./models/notification.model');

async function createNotification({ recipientId, recipientRole, type, title, message, jobId, applicationId, actorId }) {
  const doc = await Notification.create({
    recipientId: new mongoose.Types.ObjectId(recipientId),
    recipientRole,
    type,
    title: String(title || '').trim(),
    message: String(message || '').trim(),
    jobId: jobId ? new mongoose.Types.ObjectId(jobId) : null,
    applicationId: applicationId ? new mongoose.Types.ObjectId(applicationId) : null,
    actorId: actorId ? new mongoose.Types.ObjectId(actorId) : null,
  });
  return doc.toObject();
}

async function listNotifications(recipientId, recipientRole, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const filter = { recipientId, recipientRole };

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function getUnreadCount(recipientId, recipientRole) {
  const count = await Notification.countDocuments({ recipientId, recipientRole, isRead: false });
  return { count };
}

async function markNotificationRead(recipientId, recipientRole, notificationId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw Object.assign(new Error('Invalid notification id'), { status: 400 });
  }
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId, recipientRole },
    { $set: { isRead: true } },
    { new: true }
  ).lean();
  if (!updated) throw Object.assign(new Error('Notification not found'), { status: 404 });
  return updated;
}

async function markAllNotificationsRead(recipientId, recipientRole) {
  const result = await Notification.updateMany(
    { recipientId, recipientRole, isRead: false },
    { $set: { isRead: true } }
  );
  return { modifiedCount: result.modifiedCount || 0 };
}

async function cleanupOldNotifications(retentionDays) {
  const days = Number(retentionDays);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 90;
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  return {
    deletedCount: result.deletedCount || 0,
    cutoff: cutoff.toISOString(),
    retentionDays: safeDays,
  };
}

module.exports = {
  createNotification,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  cleanupOldNotifications,
};

