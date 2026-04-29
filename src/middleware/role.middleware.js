/**
 * Requires req.user.role to be one of the allowed roles.
 */
function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(Object.assign(new Error('Unauthorized'), { status: 401 }));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(Object.assign(new Error('Forbidden'), { status: 403 }));
    }
    next();
  };
}

const requireEmployer = requireRole('employer');
const requireWorker = requireRole('worker');

module.exports = { requireRole, requireEmployer, requireWorker };
