const admin = require('firebase-admin');

let initialized = false;

function normalizeServiceAccount(account) {
  if (!account || typeof account !== 'object') return account;
  const normalized = { ...account };
  if (typeof normalized.private_key === 'string') {
    normalized.private_key = normalized.private_key.replace(/\\n/g, '\n');
  }
  return normalized;
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) return null;
  try {
    return normalizeServiceAccount(JSON.parse(raw));
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

function buildWebLink(targetRoute) {
  const base = (process.env.FRONTEND_URL || 'https://micro-frontend-drab.vercel.app').replace(/\/$/, '');
  const path = targetRoute && String(targetRoute).startsWith('/') ? targetRoute : '/worker/notifications';
  return `${base}${path}`;
}

async function sendPush({ token, title, message, data }) {
  if (!isEnabled()) {
    console.warn('job-service: FCM skipped — Firebase Admin not initialized (check FIREBASE_SERVICE_ACCOUNT_JSON)');
    return null;
  }
  if (!token || !String(token).trim()) return null;

  const safeTitle = String(title || '').trim();
  const safeMessage = String(message || '').trim();
  const safeData = stringifyData(data);
  const link = buildWebLink(safeData.targetRoute);

  try {
    const messageId = await admin.messaging().send({
      token: String(token).trim(),
      notification: {
        title: safeTitle,
        body: safeMessage,
      },
      data: safeData,
      webpush: {
        notification: {
          title: safeTitle,
          body: safeMessage,
        },
        fcmOptions: {
          link,
        },
      },
    });
    console.log(`job-service: FCM sent (${safeData.type || 'unknown'}) messageId=${messageId}`);
    return messageId;
  } catch (err) {
    console.error(`job-service: FCM send failed (${safeData.type || 'unknown'}):`, err.code || err.message);
    throw err;
  }
}

module.exports = {
  isEnabled,
  sendPush,
};
