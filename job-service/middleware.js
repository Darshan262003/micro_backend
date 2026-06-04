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

function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(Object.assign(new Error('Please sign in to continue'), { status: 401 }));
    }
    if (!allowedRoles.includes(req.user.role)) {
      const needWorker = allowedRoles.includes('worker');
      const needEmployer = allowedRoles.includes('employer');
      let message = 'You do not have access to this resource.';
      if (needWorker && req.user.role === 'employer') {
        message = 'This action is for worker accounts only. Sign in as a worker to continue.';
      } else if (needEmployer && req.user.role === 'worker') {
        message = 'This action is for employer accounts only. Sign in as an employer to continue.';
      }
      return next(Object.assign(new Error(message), { status: 403 }));
    }
    next();
  };
}

const requireEmployer = requireRole('employer');
const requireWorker = requireRole('worker');

function notFound(req, res, next) {
  next(Object.assign(new Error('Not Found'), { status: 404 }));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  if (err.code === 11000) {
    statusCode = 409;
    message = 'You already applied to this job';
  }
  if (statusCode === 500 && process.env.NODE_ENV === 'production') message = 'Internal Server Error';
  res.status(statusCode).json({ message, statusCode });
}

module.exports = { authenticate, requireEmployer, requireWorker, notFound, errorHandler };
