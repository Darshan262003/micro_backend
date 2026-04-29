const mongoose = require('mongoose');

function validateApplicationIdParam(req, res, next) {
  const { applicationId } = req.params;
  if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
    return next(Object.assign(new Error('Invalid application id'), { status: 400 }));
  }
  next();
}

module.exports = { validateApplicationIdParam };

