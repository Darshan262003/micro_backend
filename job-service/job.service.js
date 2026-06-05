const mongoose = require('mongoose');
const { Job } = require('./models/job.model');
const notificationDelivery = require('./notification.delivery');

function notFoundError() {
  return Object.assign(new Error('Job not found'), { status: 404 });
}
function badRequestError(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfDayLocal(raw) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDayLocal(raw) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}
function normalizePagination(rawPage, rawLimit) {
  const hasPage = rawPage !== undefined;
  const hasLimit = rawLimit !== undefined;
  const pageParsed = Number(rawPage);
  const limitParsed = Number(rawLimit);
  if (hasPage && (!Number.isInteger(pageParsed) || pageParsed <= 0)) throw badRequestError('page must be a positive integer');
  if (hasLimit && (!Number.isInteger(limitParsed) || limitParsed <= 0)) throw badRequestError('limit must be a positive integer');
  const page = hasPage ? pageParsed : 1;
  const limit = hasLimit ? Math.min(limitParsed, 50) : 10;
  return { page, limit, skip: (page - 1) * limit };
}

async function createJob(employerId, payload) {
  const job = new Job({
    employerId: new mongoose.Types.ObjectId(employerId),
    title: String(payload.title).trim(),
    description: payload.description != null ? String(payload.description) : '',
    location: payload.location != null ? String(payload.location) : '',
    scheduledDate: new Date(payload.scheduledDate),
    paymentAmount: payload.paymentAmount !== undefined && payload.paymentAmount !== null ? Number(payload.paymentAmount) : 0,
    requiredWorkers: Number(payload.requiredWorkers),
    confirmedCount: 0,
    status: 'posted',
  });
  await job.save();

  try {
    await notificationDelivery.deliverJobPostedNotifications(job, employerId);
  } catch (e) {
    console.error('job-service: createJob notification failed:', e.message);
  }

  return job.toObject();
}

async function listJobsByEmployer(employerId, query = {}) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const filters = { employerId: new mongoose.Types.ObjectId(employerId) };
  if (query.status !== undefined) {
    const allowed = new Set(['posted', 'filled', 'completed']);
    if (!allowed.has(String(query.status))) throw badRequestError('status must be one of: posted, filled, completed');
    filters.status = String(query.status);
  }
  if (query.date !== undefined) {
    const start = startOfDayLocal(query.date);
    const end = endOfDayLocal(query.date);
    if (!start || !end) throw badRequestError('date must be a valid date');
    filters.scheduledDate = { $gte: start, $lte: end };
  }
  const [items, total] = await Promise.all([
    Job.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Job.countDocuments(filters).exec(),
  ]);
  const data = items.map((job) => ({ ...job, remainingSlots: Math.max(0, Number(job.requiredWorkers) - Number(job.confirmedCount)) }));
  return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getJobForEmployer(employerId, jobId) {
  const job = await Job.findOne({ _id: new mongoose.Types.ObjectId(jobId), employerId: new mongoose.Types.ObjectId(employerId) }).lean().exec();
  if (!job) throw notFoundError();
  return job;
}

const UPDATE_ALLOWED = new Set(['title', 'description', 'location', 'scheduledDate', 'paymentAmount', 'requiredWorkers', 'status']);
async function updateJobForEmployer(employerId, jobId, body) {
  const job = await Job.findOne({ _id: new mongoose.Types.ObjectId(jobId), employerId: new mongoose.Types.ObjectId(employerId) });
  if (!job) throw notFoundError();
  if (job.status !== 'posted') throw badRequestError('Job can only be updated while status is posted');
  const updates = {};
  for (const key of Object.keys(body)) {
    if (!UPDATE_ALLOWED.has(key) || body[key] === undefined) continue;
    updates[key] = body[key];
  }
  if (updates.title !== undefined) job.title = String(updates.title).trim();
  if (updates.description !== undefined) job.description = updates.description != null ? String(updates.description) : '';
  if (updates.location !== undefined) job.location = updates.location != null ? String(updates.location) : '';
  if (updates.scheduledDate !== undefined) job.scheduledDate = new Date(updates.scheduledDate);
  if (updates.paymentAmount !== undefined) job.paymentAmount = Number(updates.paymentAmount);
  if (updates.requiredWorkers !== undefined) job.requiredWorkers = Number(updates.requiredWorkers);
  if (updates.status === 'cancelled') job.status = 'cancelled';
  await job.save();
  return job.toObject();
}

async function completeJobForEmployer(employerId, jobId) {
  const job = await Job.findOne({ _id: new mongoose.Types.ObjectId(jobId), employerId: new mongoose.Types.ObjectId(employerId) });
  if (!job) throw notFoundError();
  if (job.status === 'completed' || job.status === 'cancelled') throw badRequestError('Job cannot be marked completed in its current status');
  job.status = 'completed';
  await job.save();
  return job.toObject();
}

async function listPostedJobsForWorker(query = {}) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const filters = { status: 'posted', $expr: { $lt: ['$confirmedCount', '$requiredWorkers'] } };
  if (query.status !== undefined && String(query.status) !== 'posted') throw badRequestError('Workers can only query status=posted');
  if (query.location && String(query.location).trim()) filters.location = { $regex: String(query.location).trim(), $options: 'i' };
  if (query.date !== undefined) {
    const start = startOfDayLocal(query.date);
    const end = endOfDayLocal(query.date);
    if (!start || !end) throw badRequestError('date must be a valid date');
    filters.scheduledDate = { $gte: start, $lte: end };
  } else {
    filters.scheduledDate = { $gte: startOfTodayLocal() };
  }
  const [items, total] = await Promise.all([
    Job.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Job.countDocuments(filters).exec(),
  ]);
  const jobs = items.map((job) => ({ ...job, remainingSlots: Math.max(0, Number(job.requiredWorkers) - Number(job.confirmedCount)) }));
  return { data: jobs, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getPostedJobByIdForWorker(jobId) {
  const job = await Job.findOne({ _id: new mongoose.Types.ObjectId(jobId), status: 'posted', scheduledDate: { $gte: startOfTodayLocal() }, $expr: { $lt: ['$confirmedCount', '$requiredWorkers'] } }).lean().exec();
  if (!job) throw notFoundError();
  return { ...job, remainingSlots: Math.max(0, Number(job.requiredWorkers) - Number(job.confirmedCount)) };
}

module.exports = {
  createJob,
  listJobsByEmployer,
  getJobForEmployer,
  updateJobForEmployer,
  completeJobForEmployer,
  listPostedJobsForWorker,
  getPostedJobByIdForWorker,
};
