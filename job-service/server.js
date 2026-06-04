const express = require('express');
const mongoose = require('mongoose');
const { config } = require('./config');
const { authenticate, requireEmployer, requireWorker, notFound, errorHandler } = require('./middleware');
const { validateCreateJob, validateUpdateJob, validateJobIdParam, validateApplicationIdParam } = require('./validators');
const jobService = require('./job.service');
const appService = require('./application.service');
const notificationService = require('./notification.service');

const app = express();
app.use(express.json());

app.use('/employer', authenticate, requireEmployer);
app.post('/employer/jobs', validateCreateJob, async (req, res, next) => { try { res.status(201).json(await jobService.createJob(req.user.id, req.body)); } catch (e) { next(e); } });
app.get('/employer/jobs', async (req, res, next) => { try { res.status(200).json(await jobService.listJobsByEmployer(req.user.id, req.query)); } catch (e) { next(e); } });
app.patch('/employer/jobs/:jobId/complete', validateJobIdParam, async (req, res, next) => { try { res.status(200).json(await jobService.completeJobForEmployer(req.user.id, req.params.jobId)); } catch (e) { next(e); } });
app.get('/employer/jobs/:jobId', validateJobIdParam, async (req, res, next) => { try { res.status(200).json(await jobService.getJobForEmployer(req.user.id, req.params.jobId)); } catch (e) { next(e); } });
app.patch('/employer/jobs/:jobId', validateJobIdParam, validateUpdateJob, async (req, res, next) => { try { res.status(200).json(await jobService.updateJobForEmployer(req.user.id, req.params.jobId, req.body)); } catch (e) { next(e); } });
app.get('/employer/jobs/:jobId/applications', validateJobIdParam, async (req, res, next) => {
  try { res.status(200).json(await appService.listApplicationsForEmployerJob(req.user.id, req.params.jobId, req.query)); } catch (e) { next(e); }
});
app.post('/employer/jobs/:jobId/applications/:applicationId/confirm', validateJobIdParam, validateApplicationIdParam, async (req, res, next) => {
  try { res.status(200).json(await appService.confirmApplication(req.user.id, req.params.jobId, req.params.applicationId)); } catch (e) { next(e); }
});
app.post('/employer/jobs/:jobId/applications/:applicationId/reject', validateJobIdParam, validateApplicationIdParam, async (req, res, next) => {
  try { res.status(200).json(await appService.rejectApplication(req.user.id, req.params.jobId, req.params.applicationId)); } catch (e) { next(e); }
});
app.get('/employer/notifications', async (req, res, next) => {
  try { res.status(200).json(await notificationService.listNotifications(req.user.id, 'employer', req.query)); } catch (e) { next(e); }
});
app.get('/employer/notifications/unread-count', async (req, res, next) => {
  try { res.status(200).json(await notificationService.getUnreadCount(req.user.id, 'employer')); } catch (e) { next(e); }
});
app.patch('/employer/notifications/:notificationId/read', async (req, res, next) => {
  try { res.status(200).json(await notificationService.markNotificationRead(req.user.id, 'employer', req.params.notificationId)); } catch (e) { next(e); }
});
app.patch('/employer/notifications/read-all', async (req, res, next) => {
  try { res.status(200).json(await notificationService.markAllNotificationsRead(req.user.id, 'employer')); } catch (e) { next(e); }
});

app.use('/worker', authenticate, requireWorker);
app.get('/worker/jobs', async (req, res, next) => { try { res.status(200).json(await jobService.listPostedJobsForWorker(req.query)); } catch (e) { next(e); } });
app.get('/worker/jobs/:jobId', validateJobIdParam, async (req, res, next) => { try { res.status(200).json(await jobService.getPostedJobByIdForWorker(req.params.jobId)); } catch (e) { next(e); } });
app.post('/worker/jobs/:jobId/applications', validateJobIdParam, async (req, res, next) => {
  try { res.status(201).json(await appService.applyToJob(req.user.id, req.params.jobId)); } catch (e) { next(e); }
});
app.get('/worker/applications', async (req, res, next) => { try { res.status(200).json(await appService.listMyApplications(req.user.id, req.query)); } catch (e) { next(e); } });
app.get('/worker/notifications', async (req, res, next) => {
  try { res.status(200).json(await notificationService.listNotifications(req.user.id, 'worker', req.query)); } catch (e) { next(e); }
});
app.get('/worker/notifications/unread-count', async (req, res, next) => {
  try { res.status(200).json(await notificationService.getUnreadCount(req.user.id, 'worker')); } catch (e) { next(e); }
});
app.patch('/worker/notifications/:notificationId/read', async (req, res, next) => {
  try { res.status(200).json(await notificationService.markNotificationRead(req.user.id, 'worker', req.params.notificationId)); } catch (e) { next(e); }
});
app.patch('/worker/notifications/read-all', async (req, res, next) => {
  try { res.status(200).json(await notificationService.markAllNotificationsRead(req.user.id, 'worker')); } catch (e) { next(e); }
});

app.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'OK', db, uptime: process.uptime() });
});

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => console.log(`job-service on ${config.port}`));

mongoose
  .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('job-service: MongoDB connected');

    const runCleanup = async () => {
      try {
        const result = await notificationService.cleanupOldNotifications(
          config.notificationRetentionDays
        );
        if (result.deletedCount > 0) {
          console.log(
            `job-service: cleanup deleted ${result.deletedCount} notifications older than ${result.retentionDays} days`
          );
        }
      } catch (e) {
        console.error('job-service: notification cleanup failed:', e.message);
      }
    };

    runCleanup();
    const intervalMs = Math.max(
      5,
      Number(config.notificationCleanupIntervalMinutes) || 1440
    ) * 60 * 1000;
    const timer = setInterval(runCleanup, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
  })
  .catch((err) => {
    console.error('job-service: MongoDB connection failed:', err.message);
    process.exit(1);
  });
