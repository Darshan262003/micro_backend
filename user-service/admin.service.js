const { User } = require('./models/user.model');

const PUBLIC_FIELDS = '-password -fcmToken';

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizePagination(rawPage, rawLimit) {
  const pageParsed = Number.parseInt(rawPage, 10);
  const limitParsed = Number.parseInt(rawLimit, 10);
  const page = Number.isInteger(pageParsed) && pageParsed > 0 ? pageParsed : 1;
  const limit = Number.isInteger(limitParsed) && limitParsed > 0 ? Math.min(limitParsed, 100) : 20;
  return { page, limit, skip: (page - 1) * limit };
}

function buildSearchFilter(search) {
  if (!search || !String(search).trim()) return {};
  const term = String(search).trim();
  return {
    $or: [
      { email: { $regex: term, $options: 'i' } },
      { name: { $regex: term, $options: 'i' } },
      { mobileNumber: { $regex: term, $options: 'i' } },
    ],
  };
}

function toPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name || '',
    age: user.age ?? null,
    mobileNumber: user.mobileNumber || '',
    address: user.address || '',
    profileCompleted: Boolean(user.profileCompleted),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
  };
}

async function getStats() {
  const [employers, workers, profileCompletedWorkers] = await Promise.all([
    User.countDocuments({ role: 'employer' }),
    User.countDocuments({ role: 'worker' }),
    User.countDocuments({ role: 'worker', profileCompleted: true }),
  ]);

  return {
    employers,
    workers,
    totalUsers: employers + workers,
    profileCompletedWorkers,
  };
}

async function listUsersByRole(role, query = {}) {
  if (!['employer', 'worker'].includes(role)) throw badRequest('role must be employer or worker');

  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  const filter = { role, ...buildSearchFilter(query.search) };

  const [items, total] = await Promise.all([
    User.find(filter).select(PUBLIC_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    User.countDocuments(filter),
  ]);

  return {
    data: items.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = {
  getStats,
  listUsersByRole,
};
