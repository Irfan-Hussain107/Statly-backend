require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');

const app = express();

require('./config/passport-setup'); 

app.use(cors({
  origin: process.env.CLIENT_URL, 
  credentials: true, 
}));
app.use(express.json());
app.use(cookieParser()); 
app.use(passport.initialize()); 

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is awake.' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/platforms', require('./routes/platforms'));

module.exports = app;
