/**
 * Minimal manual test for User + bcrypt (requires MONGO_URI in .env).
 * Run: npm run test:user-model
 */
require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/db');
const { User } = require('../src/models/user.model');

async function main() {
  await connectDatabase();

  const email = `test_user_${Date.now()}@example.com`;
  const plain = 'myPlainPassword123';

  const user = new User({
    email,
    password: plain,
    role: 'worker',
  });
  await user.save();

  const match = await user.comparePassword(plain);
  const noMatch = await user.comparePassword('wrong-password');

  const fromDb = await User.findOne({ email }).select('+password');
  const matchFromDb = fromDb ? await fromDb.comparePassword(plain) : false;

  console.log('Saved user email:', user.email);
  console.log('comparePassword(correct):', match);
  console.log('comparePassword(wrong):', noMatch);
  console.log('comparePassword after find +select password:', matchFromDb);

  // await User.deleteOne({ email });
  // console.log('Test user removed.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
