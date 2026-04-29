const jwt = require('jsonwebtoken');
const { config } = require('../config');

/**
 * Verifies Bearer JWT and sets req.user = { id, role }.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return next(Object.assign(new Error('Authorization header with Bearer token required'), { status: 401 }));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(Object.assign(new Error('Authorization header with Bearer token required'), { status: 401 }));
  }

  if (!config.jwtSecret) {
    return next(Object.assign(new Error('JWT_SECRET is not configured'), { status: 500 }));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload.id || !payload.role) {
      return next(Object.assign(new Error('Invalid token payload'), { status: 401 }));
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
  }
}

module.exports = { authenticate };
