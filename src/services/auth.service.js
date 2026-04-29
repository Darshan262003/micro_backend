const jwt = require('jsonwebtoken');
const { User } = require('../models/user.model');
const { config } = require('../config');

function signToken(user) {
  if (!config.jwtSecret) {
    const err = new Error('JWT_SECRET is not configured');
    err.status = 500;
    throw err;
  }

  const payload = { id: user._id.toString(), role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function toAuthResponse(user, token) {
  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
  };
}

async function register(email, password, role) {
  const user = new User({ email, password, role });

  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('Email already registered');
      e.status = 409;
      throw e;
    }
    throw err;
  }

  const token = signToken(user);
  return toAuthResponse(user, token);
}

async function login(email, password, expectedRole) {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  if (user.role !== expectedRole) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = signToken(user);
  return toAuthResponse(user, token);
}

module.exports = {
  register,
  login,
};
