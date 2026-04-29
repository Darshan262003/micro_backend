const userService = require('../services/user.service');

async function getProfile(req, res, next) {
  try {
    const profile = await userService.getOwnProfile(req.user.id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const profile = await userService.updateOwnProfile(req.user.id, req.body);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };

