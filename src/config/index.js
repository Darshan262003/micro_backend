require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateEnv() {
  const mongoUri = requireEnv('MONGO_URI');
  const jwtSecret = requireEnv('JWT_SECRET');
  const rawPort = requireEnv('PORT');
  const parsedPort = Number(rawPort);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return { mongoUri, jwtSecret, port: parsedPort };
}

const validated = validateEnv();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: validated.port,
  jwtSecret: validated.jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: validated.mongoUri,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 50,
  applyRateLimitWindowMs: Number(process.env.APPLY_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
  applyRateLimitMax: Number(process.env.APPLY_RATE_LIMIT_MAX) || 30,
};

module.exports = { config, validateEnv };
