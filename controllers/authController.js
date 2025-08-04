const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const sendEmail = require('../utils/mailer');

const generateTokens = (user) => {
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};


exports.signup = async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user && user.isEmailVerified) {
            return res.status(400).json({ message: "User with this email already exists." });
        }

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
        const otpExpires = Date.now() + 10 * 60 * 1000; 

        if (user) { 
            user.password = await bcrypt.hash(password, 12);
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else { 
            const hashedPassword = await bcrypt.hash(password, 12);
            user = new User({ email, password: hashedPassword, otp, otpExpires });
            await user.save();
        }

        await sendEmail(email, "Verify Your Email for Codolio Clone", `Your OTP is: ${otp}`);
        res.status(201).json({ message: "OTP sent to your email. Please verify." });

    } catch (err) {
        res.status(500).json({ message: "Server error during signup." });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Email verified successfully. You can now log in." });
    } catch (err) {
        res.status(500).json({ message: "Server error during OTP verification." });
    }
};

exports.resendOtp = async (req, res) => {
    res.status(200).json({ message: "New OTP sent." });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !user.password) { 
            return res.status(400).json({ message: "Invalid credentials." });
        }
        if (!user.isEmailVerified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.json({ accessToken });
    } catch (err) {
        res.status(500).json({ message: "Server error during login." });
    }
};

exports.refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token found." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: "User not found." });

        const { accessToken } = generateTokens(user);
        res.json({ accessToken });
    } catch (err) {
        return res.status(403).json({ message: "Invalid refresh token." });
    }
};

exports.logout = (req, res) => {
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0) 
    });
    res.status(200).json({ message: "Logged out successfully." });
};

exports.googleCallback = (req, res) => {
    // Passport middleware puts user on req.user
    const { refreshToken } = generateTokens(req.user);

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
};
