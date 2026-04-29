const rateLimit = require('express-rate-limit');
const { config } = require('../config');

function buildLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message,
      statusCode: 429,
    },
  });
}

const authLimiter = buildLimiter(
  config.authRateLimitWindowMs,
  config.authRateLimitMax,
  'Too many authentication attempts, please try again later'
);

const applyLimiter = buildLimiter(
  config.applyRateLimitWindowMs,
  config.applyRateLimitMax,
  'Too many apply attempts, please try again later'
);

module.exports = { authLimiter, applyLimiter };

