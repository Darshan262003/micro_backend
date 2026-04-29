const mongoose = require('mongoose');

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isScheduledDateOnOrAfterToday(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return false;
  }
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day.getTime() >= startOfTodayLocal().getTime();
}

function validateCreateJob(req, res, next) {
  const { title, description, location, scheduledDate, paymentAmount, requiredWorkers } = req.body;

  if (title === undefined || title === null || String(title).trim() === '') {
    return next(Object.assign(new Error('Title is required'), { status: 400 }));
  }
  if (typeof title !== 'string') {
    return next(Object.assign(new Error('Title must be a string'), { status: 400 }));
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return next(Object.assign(new Error('Description must be a string'), { status: 400 }));
  }
  if (location !== undefined && location !== null && typeof location !== 'string') {
    return next(Object.assign(new Error('Location must be a string'), { status: 400 }));
  }

  if (scheduledDate === undefined || scheduledDate === null || scheduledDate === '') {
    return next(Object.assign(new Error('scheduledDate is required'), { status: 400 }));
  }
  const scheduled = new Date(scheduledDate);
  if (Number.isNaN(scheduled.getTime())) {
    return next(Object.assign(new Error('scheduledDate must be a valid date'), { status: 400 }));
  }
  if (!isScheduledDateOnOrAfterToday(scheduledDate)) {
    return next(Object.assign(new Error('scheduledDate must be today or in the future'), { status: 400 }));
  }

  if (paymentAmount !== undefined && paymentAmount !== null) {
    const n = Number(paymentAmount);
    if (!Number.isFinite(n) || n < 0) {
      return next(Object.assign(new Error('paymentAmount must be a non-negative number'), { status: 400 }));
    }
  }

  if (requiredWorkers === undefined || requiredWorkers === null || requiredWorkers === '') {
    return next(Object.assign(new Error('requiredWorkers is required'), { status: 400 }));
  }
  const rw = Number(requiredWorkers);
  if (!Number.isInteger(rw) || rw < 1) {
    return next(Object.assign(new Error('requiredWorkers must be an integer greater than 0'), { status: 400 }));
  }

  next();
}

function validateUpdateJob(req, res, next) {
  const body = req.body || {};
  const allowedKeys = [
    'title',
    'description',
    'location',
    'scheduledDate',
    'paymentAmount',
    'requiredWorkers',
    'status',
  ];
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  const unknown = keys.filter((k) => !allowedKeys.includes(k));
  if (unknown.length > 0) {
    return next(
      Object.assign(new Error(`Cannot update unknown fields: ${unknown.join(', ')}`), { status: 400 })
    );
  }
  if (keys.length === 0) {
    return next(Object.assign(new Error('No fields to update'), { status: 400 }));
  }

  if (body.title !== undefined) {
    if (body.title === null || String(body.title).trim() === '') {
      return next(Object.assign(new Error('Title cannot be empty'), { status: 400 }));
    }
    if (typeof body.title !== 'string') {
      return next(Object.assign(new Error('Title must be a string'), { status: 400 }));
    }
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return next(Object.assign(new Error('Description must be a string'), { status: 400 }));
  }
  if (body.location !== undefined && body.location !== null && typeof body.location !== 'string') {
    return next(Object.assign(new Error('Location must be a string'), { status: 400 }));
  }

  if (body.scheduledDate !== undefined && body.scheduledDate !== null) {
    const scheduled = new Date(body.scheduledDate);
    if (Number.isNaN(scheduled.getTime())) {
      return next(Object.assign(new Error('scheduledDate must be a valid date'), { status: 400 }));
    }
    if (!isScheduledDateOnOrAfterToday(body.scheduledDate)) {
      return next(Object.assign(new Error('scheduledDate must be today or in the future'), { status: 400 }));
    }
  }

  if (body.paymentAmount !== undefined && body.paymentAmount !== null) {
    const n = Number(body.paymentAmount);
    if (!Number.isFinite(n) || n < 0) {
      return next(Object.assign(new Error('paymentAmount must be a non-negative number'), { status: 400 }));
    }
  }

  if (body.requiredWorkers !== undefined && body.requiredWorkers !== null) {
    const rw = Number(body.requiredWorkers);
    if (!Number.isInteger(rw) || rw < 1) {
      return next(Object.assign(new Error('requiredWorkers must be an integer greater than 0'), { status: 400 }));
    }
  }

  if (body.status !== undefined && body.status !== null) {
    if (body.status !== 'cancelled') {
      return next(
        Object.assign(new Error('status may only be set to cancelled via this endpoint'), { status: 400 })
      );
    }
  }

  next();
}

function validateJobIdParam(req, res, next) {
  const { jobId } = req.params;
  if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
    return next(Object.assign(new Error('Invalid job id'), { status: 400 }));
  }
  next();
}

module.exports = {
  validateCreateJob,
  validateUpdateJob,
  validateJobIdParam,
  isScheduledDateOnOrAfterToday,
};
