const express = require('express');

const jobController = require('../controllers/job.controller');
const applicationController = require('../controllers/application.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireEmployer } = require('../middleware/role.middleware');
const {
  validateCreateJob,
  validateUpdateJob,
  validateJobIdParam,
} = require('../validators/job.validator');
const { validateApplicationIdParam } = require('../validators/application.validator');

const router = express.Router();

router.use(authenticate, requireEmployer);

/**
 * @openapi
 * /employer/jobs:
 *   post:
 *     tags: [Employer Jobs]
 *     summary: Create job
 *   get:
 *     tags: [Employer Jobs]
 *     summary: List employer jobs
 */
router.post('/jobs', validateCreateJob, jobController.createJob);
router.get('/jobs', jobController.listJobs);
router.patch('/jobs/:jobId/complete', validateJobIdParam, jobController.completeJob);
router.get('/jobs/:jobId', validateJobIdParam, jobController.getJobById);
router.patch('/jobs/:jobId', validateJobIdParam, validateUpdateJob, jobController.updateJob);

// Employer manages applications for their own job
/**
 * @openapi
 * /employer/jobs/{jobId}/applications:
 *   get:
 *     tags: [Applications]
 *     summary: List applications for a job
 */
router.get(
  '/jobs/:jobId/applications',
  validateJobIdParam,
  applicationController.listJobApplicationsForEmployer
);
router.post(
  '/jobs/:jobId/applications/:applicationId/confirm',
  validateJobIdParam,
  validateApplicationIdParam,
  applicationController.confirmApplication
);
router.post(
  '/jobs/:jobId/applications/:applicationId/reject',
  validateJobIdParam,
  validateApplicationIdParam,
  applicationController.rejectApplication
);

module.exports = { router };
