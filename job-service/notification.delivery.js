const axios = require('axios');
const notificationService = require('./notification.service');
const fcmService = require('./fcm.service');
const { config } = require('./config');

const TARGET_ROUTES = {
  APPLICATION_CONFIRMED: '/worker/notifications',
  APPLICATION_REJECTED: '/worker/notifications',
  JOB_POSTED: '/worker/notifications',
};

function shouldSendNotification(user, type) {
  if (!user || typeof user !== 'object') return true;
  const prefs = user.notificationPreferences || {};
  return prefs[type] !== false;
}

async function sendPushToWorker(worker, notificationDoc) {
  if (!worker?.fcmToken || !String(worker.fcmToken).trim()) {
    console.warn(`job-service: FCM skipped for user ${worker?._id || 'unknown'} — no fcmToken saved`);
    return;
  }

  const type = notificationDoc.type;
  const targetRoute = TARGET_ROUTES[type] || '/worker/notifications';

  await fcmService.sendPush({
    token: worker.fcmToken,
    title: notificationDoc.title,
    message: notificationDoc.message,
    data: {
      notificationId: String(notificationDoc._id),
      type,
      title: notificationDoc.title,
      message: notificationDoc.message,
      targetRoute,
    },
  });
}

async function deliverApplicationStatusNotification(createParams, worker) {
  const doc = await notificationService.createNotification(createParams);
  try {
    await sendPushToWorker(worker, doc);
  } catch (err) {
    console.error(`job-service: FCM push failed (${createParams.type}):`, err.message);
  }
  return doc;
}

async function deliverJobPostedNotifications(job, employerId) {
  const { data } = await axios.get(`${config.userServiceUrl}/internal/users/role/worker/ids`, {
    params: { type: 'JOB_POSTED' },
    timeout: 5000,
  });
  const workerIds = Array.isArray(data?.data) ? data.data : [];

  const notifications = await Promise.all(
    workerIds.map((workerId) =>
      notificationService.createNotification({
        recipientId: workerId,
        recipientRole: 'worker',
        type: 'JOB_POSTED',
        title: `New job posted: ${job.title}`,
        message: `${job.title} is now open. Tap to apply.`,
        jobId: job._id,
        actorId: employerId,
      })
    )
  );

  try {
    const { data: pushData } = await axios.get(
      `${config.userServiceUrl}/internal/users/role/worker/push-targets`,
      { params: { type: 'JOB_POSTED' }, timeout: 10000 }
    );
    const targets = Array.isArray(pushData?.data) ? pushData.data : [];
    if (!targets.length) {
      console.warn(
        'job-service: JOB_POSTED FCM — 0 push targets (workers need fcmToken + lastLoginAt + JOB_POSTED pref). ' +
          'Ensure frontend calls POST /user/fcm-token after login.'
      );
    } else {
      console.log(`job-service: JOB_POSTED FCM — sending to ${targets.length} worker(s)`);
    }
    const notificationsByRecipient = new Map(
      notifications.map((doc) => [String(doc.recipientId), doc])
    );

    await Promise.all(
      targets.map(async (worker) => {
        const doc = notificationsByRecipient.get(String(worker._id));
        if (!doc) return;
        try {
          await sendPushToWorker(worker, doc);
        } catch (err) {
          console.error(`job-service: FCM JOB_POSTED push failed for ${worker._id}:`, err.message);
        }
      })
    );
  } catch (err) {
    console.error('job-service: createJob FCM push batch failed:', err.message);
  }
}

module.exports = {
  shouldSendNotification,
  deliverApplicationStatusNotification,
  deliverJobPostedNotifications,
};
