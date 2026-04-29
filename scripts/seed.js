require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/db');
const { User } = require('../src/models/user.model');
const { Job } = require('../src/models/job.model');
const { Application } = require('../src/models/application.model');

async function run() {
  await connectDatabase();

  const timestamp = Date.now();
  const employerEmail = `seed_employer_${timestamp}@example.com`;
  const worker1Email = `seed_worker1_${timestamp}@example.com`;
  const worker2Email = `seed_worker2_${timestamp}@example.com`;
  const password = 'SeedPass123';

  const employer = await User.create({
    email: employerEmail,
    password,
    role: 'employer',
  });

  const worker1 = await User.create({
    email: worker1Email,
    password,
    role: 'worker',
  });

  const worker2 = await User.create({
    email: worker2Email,
    password,
    role: 'worker',
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const jobs = await Job.insertMany([
    {
      employerId: employer._id,
      title: 'Seed Catering Shift',
      description: 'Serving support for event',
      location: 'City Center',
      scheduledDate: tomorrow,
      paymentAmount: 800,
      requiredWorkers: 2,
      confirmedCount: 0,
      status: 'posted',
    },
    {
      employerId: employer._id,
      title: 'Seed Logistics Helper',
      description: 'Loading and unloading support',
      location: 'Industrial Area',
      scheduledDate: dayAfter,
      paymentAmount: 900,
      requiredWorkers: 3,
      confirmedCount: 0,
      status: 'posted',
    },
  ]);

  await Application.create({
    jobId: jobs[0]._id,
    workerId: worker1._id,
    status: 'pending',
  });

  await Application.create({
    jobId: jobs[1]._id,
    workerId: worker2._id,
    status: 'pending',
  });

  console.log('Seed complete');
  console.log(
    JSON.stringify(
      {
        employer: { email: employerEmail, password },
        workers: [
          { email: worker1Email, password },
          { email: worker2Email, password },
        ],
        jobs: jobs.map((job) => ({ id: job._id.toString(), title: job.title })),
      },
      null,
      2
    )
  );

  await mongoose.connection.close(false);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

