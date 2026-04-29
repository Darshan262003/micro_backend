const { User } = require('../models/user.model');

function notFound(message = 'User not found') {
  return Object.assign(new Error(message), { status: 404 });
}

async function getOwnProfile(userId) {
  const user = await User.findById(userId).select('-password').lean().exec();
  if (!user) throw notFound();
  return user;
}

async function updateOwnProfile(userId, payload) {
  const user = await User.findById(userId).select('-password');
  if (!user) throw notFound();

  if (payload.name !== undefined) user.name = String(payload.name).trim();
  if (payload.age !== undefined) user.age = Number(payload.age);
  if (payload.mobileNumber !== undefined) user.mobileNumber = String(payload.mobileNumber).trim();
  if (payload.address !== undefined) user.address = String(payload.address).trim();
  if (payload.caste !== undefined) user.caste = payload.caste != null ? String(payload.caste).trim() : '';
  if (payload.profilePic !== undefined) {
    user.profilePic = payload.profilePic != null ? String(payload.profilePic).trim() : '';
  }

  await user.save();
  return User.findById(userId).select('-password').lean().exec();
}

module.exports = { getOwnProfile, updateOwnProfile };

