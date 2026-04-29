require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('./config/db');
const { app } = require('./app');
const { config } = require('./config');

let server;
let shuttingDown = false;

async function start() {
  await connectDatabase();
  require('./models/user.model');
  require('./models/job.model');
  require('./models/application.model');

  server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close(false);
    console.log('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
