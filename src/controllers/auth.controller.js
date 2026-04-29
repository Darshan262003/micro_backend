const authService = require('../services/auth.service');

async function registerEmployer(req, res, next) {
  try {
    const result = await authService.register(req.body.email, req.body.password, 'employer');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function registerWorker(req, res, next) {
  try {
    const result = await authService.register(req.body.email, req.body.password, 'worker');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function loginEmployer(req, res, next) {
  try {
    const result = await authService.login(req.body.email, req.body.password, 'employer');
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function loginWorker(req, res, next) {
  try {
    const result = await authService.login(req.body.email, req.body.password, 'worker');
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function getMe(req, res) {
  res.status(200).json({ user: req.user });
}

function employerPing(req, res) {
  res.status(200).json({ message: 'Employer access granted', user: req.user });
}

function workerPing(req, res) {
  res.status(200).json({ message: 'Worker access granted', user: req.user });
}

module.exports = {
  registerEmployer,
  registerWorker,
  loginEmployer,
  loginWorker,
  getMe,
  employerPing,
  workerPing,
};
