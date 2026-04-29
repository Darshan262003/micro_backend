const express = require('express');
const mongoose = require('mongoose');

const { router: authRouter } = require('./auth.routes');
const { router: employerRouter } = require('./employer.routes');
const { router: workerRouter } = require('./worker.routes');
const { router: userRouter } = require('./user.routes');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/employer', employerRouter);
router.use('/worker', workerRouter);
router.use('/user', userRouter);

/**
 * @openapi
 * /:
 *   get:
 *     tags:
 *       - System
 *     summary: API root
 *     security: []
 *     responses:
 *       200:
 *         description: Service info
 */
router.get('/', (req, res) => {
  res.status(200).json({ service: 'API is running' });
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check
 *     security: []
 *     responses:
 *       200:
 *         description: API health
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 db:
 *                   type: string
 *                 uptime:
 *                   type: number
 */
router.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'OK', db, uptime: process.uptime() });
});

module.exports = { router };
