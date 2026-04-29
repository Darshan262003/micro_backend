const applicationService = require('../services/application.service');

async function applyToJob(req, res, next) {
  try {
    const application = await applicationService.applyToJob(req.user.id, req.params.jobId);
    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
}

async function listMyApplications(req, res, next) {
  try {
    const result = await applicationService.listMyApplications(req.user.id, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function listJobApplicationsForEmployer(req, res, next) {
  try {
    const result = await applicationService.listApplicationsForEmployerJob(
      req.user.id,
      req.params.jobId,
      req.query
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function confirmApplication(req, res, next) {
  try {
    const result = await applicationService.confirmApplication(
      req.user.id,
      req.params.jobId,
      req.params.applicationId
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function rejectApplication(req, res, next) {
  try {
    const application = await applicationService.rejectApplication(
      req.user.id,
      req.params.jobId,
      req.params.applicationId
    );
    res.status(200).json(application);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyToJob,
  listMyApplications,
  listJobApplicationsForEmployer,
  confirmApplication,
  rejectApplication,
};

