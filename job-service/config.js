require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) throw new Error(`Missing required env: ${name}`);
  return value;
}

const config = {
  port: Number(requireEnv('PORT')),
  mongoUri: requireEnv('MONGO_URI'),
  jwtSecret: requireEnv('JWT_SECRET'),
  userServiceUrl: requireEnv('USER_SERVICE_URL'),
  notificationRetentionDays: Number(process.env.NOTIFICATION_RETENTION_DAYS || 90),
  notificationCleanupIntervalMinutes: Number(process.env.NOTIFICATION_CLEANUP_INTERVAL_MINUTES || 1440),
};

module.exports = { config };
