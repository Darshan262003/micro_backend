/**
 * Requires req.user.role to be one of the allowed roles.
 */
function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(Object.assign(new Error('Unauthorized'), { status: 401 }));
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

module.exports = { requireRole, requireEmployer, requireWorker };
