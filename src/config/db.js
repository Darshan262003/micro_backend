const mongoose = require('mongoose');

/**
 * Connects to MongoDB using MONGO_URI from the environment.
 * Logs success, or logs the error and exits the process on failure.
 */
async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri || !String(uri).trim()) {
    console.error('MongoDB connection failed: MONGO_URI is not set in the environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB Connected');
  } catch (err) {
    const msg = err.message || String(err);
    console.error('MongoDB connection failed:', msg);
    if (/whitelist|IP address|Atlas/i.test(msg)) {
      console.error(
        'Hint: In MongoDB Atlas → Network Access, add your current IP (or 0.0.0.0/0 for dev only).'
      );
    }
    if (msg.includes('querySrv ENOTFOUND') && msg.includes('_mongodb._tcp.')) {
      console.error(
        'Hint: URI may be split wrong — if the password contains @, : or /, URL-encode it (e.g. @ → %40).'
      );
    }
    process.exit(1);
  }
}

module.exports = { connectDatabase };
