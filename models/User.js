const mongoose = require('mongoose');

const platformDataSchema = new mongoose.Schema({
  rating: { type: Number, default: 0 },
  maxRating: { type: Number, default: 0 },
  problemsSolved: { type: Number, default: 0 },
  easy: { type: Number, default: 0 },
  medium: { type: Number, default: 0 },
  hard: { type: Number, default: 0 },
  contests: { type: Number, default: 0 },
  rank: { type: String },
  totalSubmissions: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  public_repos: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },
  total_stars: { type: Number, default: 0 },
  problemRatings: { type: Map, of: Number },
  lastFetched: { type: Date }
}, { _id: false });

const platformSchema = new mongoose.Schema({
  username: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  verificationCode: { type: String, default: null },
  data: platformDataSchema
}, { _id: false });


const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String }, 
  
  googleId: { type: String },

  isEmailVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },

  platforms: {
    type: Map,
    of: platformSchema
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
