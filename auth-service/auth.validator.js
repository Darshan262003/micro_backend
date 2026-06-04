const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function validateRegister(req, res, next) {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string') return next(Object.assign(new Error('Email is required'), { status: 400 }));
  const normalized = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalized)) return next(Object.assign(new Error('Invalid email format'), { status: 400 }));
  if (!password || typeof password !== 'string') return next(Object.assign(new Error('Password is required'), { status: 400 }));
  if (password.length < 8) return next(Object.assign(new Error('Password must be at least 8 characters'), { status: 400 }));
  req.body.email = normalized;
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string') return next(Object.assign(new Error('Email is required'), { status: 400 }));
  const normalized = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalized)) return next(Object.assign(new Error('Invalid email format'), { status: 400 }));
  if (!password || typeof password !== 'string') return next(Object.assign(new Error('Password is required'), { status: 400 }));
  req.body.email = normalized;
  next();
}

module.exports = { validateRegister, validateLogin };
