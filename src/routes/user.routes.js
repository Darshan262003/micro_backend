const express = require('express');

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateProfileUpdate } = require('../validators/user.validator');

const router = express.Router();

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', validateProfileUpdate, userController.updateProfile);

module.exports = { router };

