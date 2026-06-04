const express = require('express');
const mongoose = require('mongoose');
const { config } = require('./config');
const { User } = require('./models/user.model');
const { authenticate, notFound, errorHandler } = require('./middleware');
const { validateProfileUpdate } = require('./user.validator');

const app = express();
app.use(express.json());

app.get('/user/profile', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean().exec();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    res.status(200).json(user);
  } catch (e) { next(e); }
});

app.put('/user/profile', authenticate, validateProfileUpdate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const payload = req.body;
    if (payload.name !== undefined) user.name = String(payload.name).trim();
    if (payload.age !== undefined) user.age = Number(payload.age);
    if (payload.mobileNumber !== undefined) user.mobileNumber = String(payload.mobileNumber).trim();
    if (payload.address !== undefined) user.address = String(payload.address).trim();
    if (payload.caste !== undefined) user.caste = payload.caste != null ? String(payload.caste).trim() : '';
    if (payload.profilePic !== undefined) user.profilePic = payload.profilePic != null ? String(payload.profilePic).trim() : '';
    await user.save();
    const updated = await User.findById(req.user.id).select('-password').lean().exec();
    res.status(200).json(updated);
  } catch (e) { next(e); }
});

app.get('/user/notification-preferences', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences').lean().exec();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    res.status(200).json({
      notificationPreferences: user.notificationPreferences || {
        JOB_POSTED: true,
        JOB_APPLIED: true,
        APPLICATION_CONFIRMED: true,
        APPLICATION_REJECTED: true,
      },
    });
  } catch (e) {
    next(e);
  }
});

app.put('/user/notification-preferences', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const allowed = ['JOB_POSTED', 'JOB_APPLIED', 'APPLICATION_CONFIRMED', 'APPLICATION_REJECTED'];
    const keys = Object.keys(body);
    if (!keys.length) {
      throw Object.assign(new Error('No preference fields provided'), { status: 400 });
    }
    const unknown = keys.filter((k) => !allowed.includes(k));
    if (unknown.length) {
      throw Object.assign(new Error(`Unknown preference fields: ${unknown.join(', ')}`), { status: 400 });
    }
    for (const k of keys) {
      if (typeof body[k] !== 'boolean') {
        throw Object.assign(new Error(`${k} must be boolean`), { status: 400 });
      }
    }

    const user = await User.findById(req.user.id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const current = user.notificationPreferences || {};
    user.notificationPreferences = {
      JOB_POSTED: body.JOB_POSTED ?? current.JOB_POSTED ?? true,
      JOB_APPLIED: body.JOB_APPLIED ?? current.JOB_APPLIED ?? true,
      APPLICATION_CONFIRMED: body.APPLICATION_CONFIRMED ?? current.APPLICATION_CONFIRMED ?? true,
      APPLICATION_REJECTED: body.APPLICATION_REJECTED ?? current.APPLICATION_REJECTED ?? true,
    };
    await user.save();

    res.status(200).json({ notificationPreferences: user.notificationPreferences });
  } catch (e) {
    next(e);
  }
});

// Internal endpoints for cross-service calls (job-service)
app.get('/internal/users/role/:role/ids', async (req, res, next) => {
  try {
    const role = String(req.params.role || '').trim();
    if (!['worker', 'employer'].includes(role)) {
      return res.status(400).json({ message: 'role must be employer or worker', statusCode: 400 });
    }
    const type = req.query.type ? String(req.query.type).trim() : null;
    const allowedTypes = ['JOB_POSTED', 'JOB_APPLIED', 'APPLICATION_CONFIRMED', 'APPLICATION_REJECTED'];
    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid notification type filter', statusCode: 400 });
    }

    const filters = { role };
    if (type) {
      filters[`notificationPreferences.${type}`] = { $ne: false };
    }

    const users = await User.find(filters).select('_id').lean().exec();
    res.status(200).json({ data: users.map((u) => u._id) });
  } catch (e) {
    next(e);
  }
});

app.get('/internal/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean().exec();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    res.status(200).json(user);
  } catch (e) { next(e); }
});

app.post('/internal/users/batch', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const users = await User.find({ _id: { $in: ids } }).select('-password').lean().exec();
    res.status(200).json({ data: users });
  } catch (e) { next(e); }
});

app.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'OK', db, uptime: process.uptime() });
});

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => console.log(`user-service on ${config.port}`));

mongoose
  .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  .then(() => console.log('user-service: MongoDB connected'))
  .catch((err) => {
    console.error('user-service: MongoDB connection failed:', err.message);
    process.exit(1);
  });
