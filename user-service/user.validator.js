const MOBILE_REGEX = /^[0-9]{10,15}$/;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validateProfileUpdate(req, res, next) {
  const body = req.body || {};
  const allowed = ['name', 'age', 'mobileNumber', 'address', 'caste', 'profilePic'];
  const keys = Object.keys(body);
  const unknown = keys.filter((k) => !allowed.includes(k));
  if (unknown.length) return next(badRequest(`Cannot update unknown fields: ${unknown.join(', ')}`));
  if (!keys.length) return next(badRequest('No fields to update'));
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) return next(badRequest('name must be a non-empty string'));
  if (body.age !== undefined) {
    const age = Number(body.age);
    if (!Number.isInteger(age) || age <= 0) return next(badRequest('age must be an integer greater than 0'));
  }
  if (body.mobileNumber !== undefined) {
    const mobile = String(body.mobileNumber || '').trim();
    if (!MOBILE_REGEX.test(mobile)) return next(badRequest('mobileNumber must contain 10 to 15 digits'));
  }
  if (body.address !== undefined && (typeof body.address !== 'string' || !body.address.trim())) return next(badRequest('address must be a non-empty string'));
  if (body.caste !== undefined && body.caste !== null && typeof body.caste !== 'string') return next(badRequest('caste must be a string'));
  if (body.profilePic !== undefined && body.profilePic !== null && (typeof body.profilePic !== 'string' || !/^https?:\/\/\S+$/i.test(body.profilePic))) {
    return next(badRequest('profilePic must be a valid http/https URL'));
  }
  next();
}

module.exports = { validateProfileUpdate };
