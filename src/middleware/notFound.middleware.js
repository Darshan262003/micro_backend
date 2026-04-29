/**
 * Handles requests to unknown paths (registered after all routes).
 */
function notFound(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
}

module.exports = { notFound };
