const jwt = require('jsonwebtoken');
const { User } = require('./models/user.model');
const { config } = require('./config');

function signToken(user) {
  const payload = { id: user._id.toString(), role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function toAuthResponse(user, token) {
  return {
    token,
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
}

async function register(email, password, role) {
  const user = new User({ email, password, role });
  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) throw Object.assign(new Error('Email already registered'), { status: 409 });
    throw err;
  }
  return toAuthResponse(user, signToken(user));
}

async function login(email, password, expectedRole) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  if (user.role !== expectedRole) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  const ok = await user.comparePassword(password);
  if (!ok) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  return toAuthResponse(user, signToken(user));
}

module.exports = { register, login };
