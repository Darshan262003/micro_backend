const express = require('express');

const applicationController = require('../controllers/application.controller');
const jobController = require('../controllers/job.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireWorker } = require('../middleware/role.middleware');
const { validateJobIdParam } = require('../validators/job.validator');

const router = express.Router();

router.use(authenticate, requireWorker);

// Browse all open jobs posted by employers
/**
 * @openapi
 * /worker/jobs:
 *   get:
 *     tags: [Worker Jobs]
 *     summary: List posted jobs for workers
 */
router.get('/jobs', jobController.listPostedJobsForWorker);
router.get('/jobs/:jobId', validateJobIdParam, jobController.getPostedJobByIdForWorker);

// Worker applies to a job (creates an Application)
/**
 * @openapi
 * /worker/jobs/{jobId}/applications:
 *   post:
 *     tags: [Applications]
 *     summary: Apply to a job
 */
router.post('/jobs/:jobId/applications', validateJobIdParam, applicationController.applyToJob);

// List worker's own applications
router.get('/applications', applicationController.listMyApplications);

module.exports = { router };

