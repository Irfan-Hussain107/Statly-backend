require('dotenv').config();
require('./config/passport-setup');

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

connectDB();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is awake.' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/user', require('./routes/user'));

module.exports = app;
