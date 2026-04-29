const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const MOBILE_REGEX = /^[0-9]{10,15}$/;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['employer', 'worker'],
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    age: {
      type: Number,
      min: 1,
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    caste: {
      type: String,
      trim: true,
      default: '',
    },
    profilePic: {
      type: String,
      trim: true,
      default: '',
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    const hasName = !!(this.name && String(this.name).trim());
    const hasValidAge = Number.isInteger(this.age) && this.age > 0;
    const hasValidMobile = !!(
      this.mobileNumber &&
      MOBILE_REGEX.test(String(this.mobileNumber).trim())
    );
    const hasAddress = !!(this.address && String(this.address).trim());
    this.profileCompleted = Boolean(hasName && hasValidAge && hasValidMobile && hasAddress);
    return;
  }
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);

  const hasName = !!(this.name && String(this.name).trim());
  const hasValidAge = Number.isInteger(this.age) && this.age > 0;
  const hasValidMobile = !!(
    this.mobileNumber &&
    MOBILE_REGEX.test(String(this.mobileNumber).trim())
  );
  const hasAddress = !!(this.address && String(this.address).trim());
  this.profileCompleted = Boolean(hasName && hasValidAge && hasValidMobile && hasAddress);
});

userSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = { User };
