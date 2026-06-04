const jwt = require('jsonwebtoken');
const { config } = require('./config');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(Object.assign(new Error('Authorization header with Bearer token required'), { status: 401 }));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
  }
}

function notFound(req, res, next) {
  next(Object.assign(new Error('Not Found'), { status: 404 }));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  if (statusCode === 500 && process.env.NODE_ENV === 'production') message = 'Internal Server Error';
  res.status(statusCode).json({ message, statusCode });
}

module.exports = { authenticate, notFound, errorHandler };
