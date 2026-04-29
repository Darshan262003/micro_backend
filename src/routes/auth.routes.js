const express = require('express');

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireEmployer, requireWorker } = require('../middleware/role.middleware');
const { validateRegister, validateLogin } = require('../validators/auth.validator');

const router = express.Router();

/**
 * @openapi
 * /auth/employer/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register employer
 *     security: []
 */
router.post('/employer/register', validateRegister, authController.registerEmployer);
/**
 * @openapi
 * /auth/worker/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register worker
 *     security: []
 */
router.post('/worker/register', validateRegister, authController.registerWorker);
/**
 * @openapi
 * /auth/employer/login:
 *   post:
 *     tags: [Auth]
 *     summary: Employer login
 *     security: []
 */
router.post('/employer/login', validateLogin, authController.loginEmployer);
/**
 * @openapi
 * /auth/worker/login:
 *   post:
 *     tags: [Auth]
 *     summary: Worker login
 *     security: []
 */
router.post('/worker/login', validateLogin, authController.loginWorker);

router.get('/me', authenticate, authController.getMe);
router.get('/employer/ping', authenticate, requireEmployer, authController.employerPing);
router.get('/worker/ping', authenticate, requireWorker, authController.workerPing);

module.exports = { router };
