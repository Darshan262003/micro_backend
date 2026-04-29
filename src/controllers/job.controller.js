const jobService = require('../services/job.service');

async function createJob(req, res, next) {
  try {
    const job = await jobService.createJob(req.user.id, req.body);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

async function listJobs(req, res, next) {
  try {
    const result = await jobService.listJobsByEmployer(req.user.id, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getJobById(req, res, next) {
  try {
    const job = await jobService.getJobForEmployer(req.user.id, req.params.jobId);
    res.status(200).json(job);
  } catch (err) {
    next(err);
  }
}

async function updateJob(req, res, next) {
  try {
    const job = await jobService.updateJobForEmployer(req.user.id, req.params.jobId, req.body);
    res.status(200).json(job);
  } catch (err) {
    next(err);
  }
}

async function completeJob(req, res, next) {
  try {
    const job = await jobService.completeJobForEmployer(req.user.id, req.params.jobId);
    res.status(200).json(job);
  } catch (err) {
    next(err);
  }
}

async function listPostedJobsForWorker(req, res, next) {
  try {
    const result = await jobService.listPostedJobsForWorker(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getPostedJobByIdForWorker(req, res, next) {
  try {
    const job = await jobService.getPostedJobByIdForWorker(req.params.jobId);
    res.status(200).json(job);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  completeJob,
  listPostedJobsForWorker,
  getPostedJobByIdForWorker,
};
