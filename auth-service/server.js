const express = require('express');
const mongoose = require('mongoose');
const { config } = require('./config');
const { register, login } = require('./auth.service');
const { validateRegister, validateLogin } = require('./auth.validator');
const { authenticate, requireEmployer, requireWorker, notFound, errorHandler } = require('./middleware');

const app = express();
app.use(express.json());

app.post('/auth/employer/register', validateRegister, async (req, res, next) => {
  try { res.status(201).json(await register(req.body.email, req.body.password, 'employer')); } catch (e) { next(e); }
});
app.post('/auth/worker/register', validateRegister, async (req, res, next) => {
  try { res.status(201).json(await register(req.body.email, req.body.password, 'worker')); } catch (e) { next(e); }
});
app.post('/auth/employer/login', validateLogin, async (req, res, next) => {
  try { res.status(200).json(await login(req.body.email, req.body.password, 'employer')); } catch (e) { next(e); }
});
app.post('/auth/worker/login', validateLogin, async (req, res, next) => {
  try { res.status(200).json(await login(req.body.email, req.body.password, 'worker')); } catch (e) { next(e); }
});
app.get('/auth/me', authenticate, (req, res) => res.status(200).json({ user: req.user }));
app.get('/auth/employer/ping', authenticate, requireEmployer, (req, res) => res.status(200).json({ message: 'Employer access granted', user: req.user }));
app.get('/auth/worker/ping', authenticate, requireWorker, (req, res) => res.status(200).json({ message: 'Worker access granted', user: req.user }));
app.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'OK', db, uptime: process.uptime() });
});

app.use(notFound);
app.use(errorHandler);

mongoose
  .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    app.listen(config.port, () => console.log(`auth-service on ${config.port}`));
  })
  .catch((err) => {
    console.error('auth-service: MongoDB connection failed:', err.message);
    console.error('Check MONGO_URI in auth-service/.env and Atlas Network Access (IP whitelist).');
    process.exit(1);
  });
