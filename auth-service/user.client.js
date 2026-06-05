const axios = require('axios');

async function touchLastLogin(userId) {
  const base = process.env.USER_SERVICE_URL;
  if (!base || !String(base).trim()) return;

  const url = `${String(base).replace(/\/$/, '')}/internal/users/${userId}/last-login`;
  try {
    await axios.patch(url, {}, { timeout: 5000 });
  } catch (err) {
    console.error('auth-service: lastLoginAt update failed:', err.message);
  }
}

module.exports = { touchLastLogin };
