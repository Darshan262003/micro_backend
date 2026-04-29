/**
 * Express error-handling middleware (must be registered last among middleware).
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path || 'field'}`;
  }

  // Duplicate key (MongoDB)
  if (err.code === 11000) {
    statusCode = 409;
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }

  // Error log (separate from request log)
  console.error(
    `[${new Date().toISOString()}] [${req.requestId || 'no-request-id'}] ERROR ${statusCode}: ${err.stack || err.message || err}`
  );

  res.status(statusCode).json({ message, statusCode });
}

module.exports = { errorHandler };
