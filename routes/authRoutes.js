const express = require('express');
const router = express.Router();
const passport = require('passport');
const { signup, login, verifyOtp, resendOtp, refreshToken, logout, googleCallback } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/logout', logout);

router.post('/refresh-token', refreshToken)

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleCallback
);

module.exports = router;
