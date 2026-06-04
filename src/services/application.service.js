const mongoose = require('mongoose');
const { Application } = require('../models/application.model');
const { Job } = require('../models/job.model');
const { User } = require('../models/user.model');

function forbiddenError(message = 'Forbidden') {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function notFoundError(message = 'Not Found') {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function badRequestError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function normalizePagination(rawPage, rawLimit) {
  const hasPage = rawPage !== undefined;
  const hasLimit = rawLimit !== undefined;
  const pageParsed = Number(rawPage);
  const limitParsed = Number(rawLimit);

  if (hasPage && (!Number.isInteger(pageParsed) || pageParsed <= 0)) {
    throw badRequestError('page must be a positive integer');
  }
  if (hasLimit && (!Number.isInteger(limitParsed) || limitParsed <= 0)) {
    throw badRequestError('limit must be a positive integer');
  }

  const page = hasPage ? pageParsed : 1;
  const limit = hasLimit ? Math.min(limitParsed, 50) : 10;

  return { page, limit, skip: (page - 1) * limit };
}

function parseApplicationStatusFilter(rawStatus) {
  if (rawStatus === undefined) {
    return undefined;
  }
  const status = String(rawStatus).trim();
  const allowed = new Set(['pending', 'confirmed', 'rejected']);
  if (!allowed.has(status)) {
    throw badRequestError('status must be one of: pending, confirmed, rejected');
  }
  return status;
}

async function applyToJob(workerId, jobId) {
  const worker = await User.findById(workerId)
    .select('profileCompleted role')
    .lean()
    .exec();
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
    return application.toObject();
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('You already applied to this job');
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

async function listMyApplications(workerId, query = {}) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const filters = { workerId: new mongoose.Types.ObjectId(workerId) };

  const status = parseApplicationStatusFilter(query.status);
  if (status) {
    filters.status = status;
  }

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

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function listApplicationsForEmployerJob(employerId, jobId, query = {}) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.employerId.toString() !== String(employerId)) throw forbiddenError('Forbidden');

  const filters = { jobId: new mongoose.Types.ObjectId(jobId) };
  const status = parseApplicationStatusFilter(query.status);
  if (status) {
    filters.status = status;
  }

  const [items, total] = await Promise.all([
    Application.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'workerId',
        select: 'email role name age mobileNumber address caste profilePic',
      })
      .lean()
      .exec(),
    Application.countDocuments(filters).exec(),
  ]);

  const data = items.map((item) => ({
    ...item,
    worker: item.workerId
      ? {
          id: item.workerId._id,
          email: item.workerId.email,
          role: item.workerId.role,
          name: item.workerId.name || '',
          age: item.workerId.age || null,
          mobileNumber: item.workerId.mobileNumber || '',
          address: item.workerId.address || '',
          caste: item.workerId.caste || '',
          profilePic: item.workerId.profilePic || '',
        }
      : null,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function confirmApplication(employerId, jobId, applicationId) {
  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.employerId.toString() !== String(employerId)) throw forbiddenError('Forbidden');
  if (job.status !== 'posted') throw badRequestError('Job is not accepting confirmations');

  const updatedApp = await Application.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(applicationId),
      jobId: new mongoose.Types.ObjectId(jobId),
      status: 'pending',
    },
    { $set: { status: 'confirmed' } },
    { returnDocument: 'after' }
  )
    .lean()
    .exec();

  if (!updatedApp) {
    throw badRequestError('Application cannot be confirmed');
  }

  const updatedJob = await Job.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(jobId),
      employerId: new mongoose.Types.ObjectId(employerId),
      status: 'posted',
      $expr: { $lt: ['$confirmedCount', '$requiredWorkers'] },
    },
    [
      {
        $set: {
          confirmedCount: { $add: ['$confirmedCount', 1] },
        },
      },
      {
        $set: {
          status: {
            $cond: [
              { $gte: ['$confirmedCount', '$requiredWorkers'] },
              'filled',
              '$status',
            ],
          },
        },
      },
    ],
    { returnDocument: 'after' }
  )
    .lean()
    .exec();

  if (!updatedJob) {
    // Job is full (or not posted) — revert application back to pending (best-effort).
    await Application.updateOne(
      { _id: new mongoose.Types.ObjectId(applicationId), status: 'confirmed' },
      { $set: { status: 'pending' } }
    ).exec();
    throw badRequestError('Job is full');
  }

  return { application: updatedApp, job: updatedJob };
}

async function rejectApplication(employerId, jobId, applicationId) {
  const job = await Job.findById(jobId).lean().exec();
  if (!job) throw notFoundError('Job not found');
  if (job.employerId.toString() !== String(employerId)) throw forbiddenError('Forbidden');

  const updatedApp = await Application.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(applicationId),
      jobId: new mongoose.Types.ObjectId(jobId),
      status: 'pending',
    },
    { $set: { status: 'rejected' } },
    { returnDocument: 'after' }
  )
    .lean()
    .exec();

  if (!updatedApp) {
    throw badRequestError('Application cannot be rejected');
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

