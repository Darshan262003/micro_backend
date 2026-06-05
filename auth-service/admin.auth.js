const jwt = require('jsonwebtoken');
const { config } = require('./config');

function adminLogin(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw Object.assign(new Error('Admin access is not configured'), { status: 503 });
  }

  const normalized = String(email || '').trim().toLowerCase();
  if (normalized !== String(adminEmail).trim().toLowerCase() || password !== adminPassword) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = jwt.sign(
    { id: 'admin', role: 'admin' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: { id: 'admin', email: adminEmail, role: 'admin' },
  };
}

module.exports = { adminLogin };
