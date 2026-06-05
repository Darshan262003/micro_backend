const admin = require('firebase-admin');

let initialized = false;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('job-service: FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON:', err.message);
    return null;
  }
}

function initFirebase() {
  if (initialized) return true;
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return false;
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log('job-service: Firebase Admin initialized');
    return true;
  } catch (err) {
    console.error('job-service: Firebase Admin init failed:', err.message);
    return false;
  }
}

function isEnabled() {
  return initFirebase();
}

function stringifyData(data) {
  return Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [key, value == null ? '' : String(value)])
  );
}

async function sendPush({ token, title, message, data }) {
  if (!isEnabled()) return null;
  if (!token || !String(token).trim()) return null;

  return admin.messaging().send({
    token: String(token).trim(),
    notification: {
      title: String(title || '').trim(),
      body: String(message || '').trim(),
    },
    data: stringifyData(data),
  });
}

module.exports = {
  isEnabled,
  sendPush,
};
