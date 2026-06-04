const mongoose = require('mongoose');
const axios = require('axios');
const { Application } = require('./models/application.model');
const { Job } = require('./models/job.model');
const { config } = require('./config');
const notificationService = require('./notification.service');

function forbiddenError(message = 'Forbidden') { return Object.assign(new Error(message), { status: 403 }); }
function notFoundError(message = 'Not Found') { return Object.assign(new Error(message), { status: 404 }); }
function badRequestError(message) { return Object.assign(new Error(message), { status: 400 }); }
function shouldSendNotification(user, type) {
  if (!user || typeof user !== 'object') return true;
  const prefs = user.notificationPreferences || {};
  return prefs[type] !== false;
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
function parseApplicationStatusFilter(rawStatus) {
  if (rawStatus === undefined) return undefined;
  const status = String(rawStatus).trim();
  const allowed = new Set(['pending', 'confirmed', 'rejected']);
  if (!allowed.has(status)) throw badRequestError('status must be one of: pending, confirmed, rejected');
  return status;
}

async function getUser(userId) {
  const url = `${config.userServiceUrl}/internal/users/${userId}`;
  const { data } = await axios.get(url, { timeout: 5000 });
  return data;
}

async function getUsersByIds(ids) {
  const url = `${config.userServiceUrl}/internal/users/batch`;
  const { data } = await axios.post(url, { ids }, { timeout: 5000 });
  return Array.isArray(data.data) ? data.data : [];
}

async function applyToJob(workerId, jobId) {
  const worker = await getUser(workerId).catch(() => null);
  if (!worker) throw notFoundError('User not found');
  if (worker.role !== 'worker') {
    throw forbiddenError('Only worker accounts can apply to jobs. Sign in with a worker account.');
  }
  if (!worker.profileCompleted) {
    throw badRequestError(
      'Complete your profile before applying. Add your name, age, mobile number, and address.'
    );
  }

  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.status !== 'posted') throw badRequestError('Job is not accepting applications');

  try {
    const application = await Application.create({
      jobId: new mongoose.Types.ObjectId(jobId),
      workerId: new mongoose.Types.ObjectId(workerId),
      status: 'pending',
    });

    try {
      const employer = await getUser(job.employerId).catch(() => null);
      if (shouldSendNotification(employer, 'JOB_APPLIED')) {
        await notificationService.createNotification({
          recipientId: job.employerId,
          recipientRole: 'employer',
          type: 'JOB_APPLIED',
          title: `New application: ${job.title}`,
          message: `${worker.name || worker.email || 'A worker'} applied to your job.`,
          jobId: job._id,
          applicationId: application._id,
          actorId: workerId,
        });
      }
    } catch (e) {
      console.error('job-service: applyToJob notification failed:', e.message);
    }

    return application.toObject();
  } catch (err) {
    if (err && err.code === 11000) throw Object.assign(new Error('You already applied to this job'), { status: 409 });
    throw err;
  }
}

async function listMyApplications(workerId, query = {}) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const filters = { workerId: new mongoose.Types.ObjectId(workerId) };
  const status = parseApplicationStatusFilter(query.status);
  if (status) filters.status = status;
  const [items, total] = await Promise.all([
    Application.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'jobId', select: 'title description location scheduledDate status paymentAmount' })
      .lean()
      .exec(),
    Application.countDocuments(filters).exec(),
  ]);

  const data = items.map((item) => {
    const populated = item.jobId && typeof item.jobId === 'object' ? item.jobId : null;
    return {
      ...item,
      jobId: populated ? populated._id : item.jobId,
      job: populated
        ? {
            id: populated._id,
            title: populated.title,
            description: populated.description || '',
            location: populated.location || '',
            scheduledDate: populated.scheduledDate,
            status: populated.status,
            paymentAmount: populated.paymentAmount,
          }
        : null,
    };
  });

  return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function listApplicationsForEmployerJob(employerId, jobId, query = {}) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.employerId.toString() !== String(employerId)) throw forbiddenError('Forbidden');

  const filters = { jobId: new mongoose.Types.ObjectId(jobId) };
  const status = parseApplicationStatusFilter(query.status);
  if (status) filters.status = status;

  const [items, total] = await Promise.all([
    Application.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Application.countDocuments(filters).exec(),
  ]);
  const workerIds = [...new Set(items.map((x) => x.workerId.toString()))];
  const users = await getUsersByIds(workerIds).catch(() => []);
  const usersById = new Map(users.map((u) => [String(u._id), u]));
  const data = items.map((item) => {
    const u = usersById.get(String(item.workerId));
    return {
      ...item,
      worker: u
        ? {
            id: u._id,
            email: u.email,
            role: u.role,
            name: u.name || '',
            age: u.age || null,
            mobileNumber: u.mobileNumber || '',
            address: u.address || '',
            caste: u.caste || '',
            profilePic: u.profilePic || '',
          }
        : null,
    };
  });
  return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function confirmApplication(employerId, jobId, applicationId) {
  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.employerId.toString() !== String(employerId)) throw forbiddenError('Forbidden');
  if (job.status !== 'posted') throw badRequestError('Job is not accepting confirmations');

  const updatedApp = await Application.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(applicationId), jobId: new mongoose.Types.ObjectId(jobId), status: 'pending' },
    { $set: { status: 'confirmed' } },
    { returnDocument: 'after' }
  ).lean().exec();
  if (!updatedApp) throw badRequestError('Application cannot be confirmed');

  const updatedJob = await Job.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(jobId), employerId: new mongoose.Types.ObjectId(employerId), status: 'posted', $expr: { $lt: ['$confirmedCount', '$requiredWorkers'] } },
    [
      { $set: { confirmedCount: { $add: ['$confirmedCount', 1] } } },
      { $set: { status: { $cond: [{ $gte: ['$confirmedCount', '$requiredWorkers'] }, 'filled', '$status'] } } },
    ],
    { returnDocument: 'after' }
  ).lean().exec();

  if (!updatedJob) {
    await Application.updateOne({ _id: new mongoose.Types.ObjectId(applicationId), status: 'confirmed' }, { $set: { status: 'pending' } }).exec();
    throw badRequestError('Job is full');
  }

  try {
    const worker = await getUser(updatedApp.workerId).catch(() => null);
    if (shouldSendNotification(worker, 'APPLICATION_CONFIRMED')) {
      await notificationService.createNotification({
        recipientId: updatedApp.workerId,
        recipientRole: 'worker',
        type: 'APPLICATION_CONFIRMED',
        title: `Application confirmed: ${updatedJob.title}`,
        message: 'Your application was confirmed by the employer.',
        jobId: updatedJob._id,
        applicationId: updatedApp._id,
        actorId: employerId,
      });
    }
  } catch (e) {
    console.error('job-service: confirmApplication notification failed:', e.message);
  }

  return { application: updatedApp, job: updatedJob };
}

async function rejectApplication(employerId, jobId, applicationId) {
  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.employerId.toString() !== String(employerId)) throw forbiddenError('Forbidden');
  const updatedApp = await Application.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(applicationId), jobId: new mongoose.Types.ObjectId(jobId), status: 'pending' },
    { $set: { status: 'rejected' } },
    { returnDocument: 'after' }
  ).lean().exec();
  if (!updatedApp) throw badRequestError('Application cannot be rejected');

  try {
    const worker = await getUser(updatedApp.workerId).catch(() => null);
    if (shouldSendNotification(worker, 'APPLICATION_REJECTED')) {
      await notificationService.createNotification({
        recipientId: updatedApp.workerId,
        recipientRole: 'worker',
        type: 'APPLICATION_REJECTED',
        title: 'Application rejected',
        message: 'Your application was rejected by the employer.',
        jobId: job._id,
        applicationId: updatedApp._id,
        actorId: employerId,
      });
    }
  } catch (e) {
    console.error('job-service: rejectApplication notification failed:', e.message);
  }

  return updatedApp;
}

module.exports = {
  applyToJob,
  listMyApplications,
  listApplicationsForEmployerJob,
  confirmApplication,
  rejectApplication,
};
