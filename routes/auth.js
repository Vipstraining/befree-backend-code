const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const { registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// JWT carries userId + sessionId — 30d so the token itself never expires
// before the rolling session does (session DB is the real gate)
const generateToken = (userId, sessionId) => {
  return jwt.sign(
    { id: userId, sessionId },
    process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production',
    { expiresIn: '30d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register user and create a new session
// @access  Public
router.post('/register', registerLimiter, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 22 })
    .withMessage('Username base must be between 3 and 22 characters (timestamp will be appended)')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('deviceId')
    .notEmpty()
    .withMessage('deviceId is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('deviceId must be between 1 and 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let { username, email, password, name, deviceId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate username from name and email if not provided
    if (!username) {
      const namePart = name ? name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : '';
      const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
      username = namePart ? `${namePart}_${emailPart}` : emailPart;
    }

    // Always append timestamp suffix to ensure uniqueness
    const timestamp = Date.now().toString().slice(-8);
    const baseUsername = username.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 22);
    username = `${baseUsername}_${timestamp}`;

    if (username.length > 30) {
      username = username.substring(0, 30);
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Generated username is too short'
      });
    }

    // Resolve username collision (rare due to timestamp suffix)
    let usernameExists = await User.findOne({ username });
    let attempts = 0;
    const originalUsername = username;

    while (usernameExists && attempts < 5) {
      const additionalDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const base = originalUsername.substring(0, 27);
      username = `${base}_${additionalDigits}`;
      usernameExists = await User.findOne({ username });
      attempts++;
    }

    // Create user
    const user = await User.create({ username, email, password });

    // Create session for this device
    const session = await Session.create({
      userId: user._id,
      username: user.username,
      deviceId,
      expiresAt: Session.newExpiresAt()
    });

    const token = generateToken(user._id, session._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      session: {
        id: session._id,
        deviceId: session.deviceId,
        expiresAt: session.expiresAt,
        isResumed: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user — creates new session or resumes existing one for same device
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    // Validate email format first
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is invalid'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email is invalid'
      });
    }

    // deviceId is required
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check user exists
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    // Check account active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password provided
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email is valid and password is invalid'
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // --- Session management ---
    const now = new Date();
    let session = await Session.findOne({ userId: user._id, deviceId });
    let isResumed = false;

    if (session && session.isActive && session.expiresAt > now) {
      // Same device, valid session — resume and extend by 120 hours
      session.expiresAt = Session.newExpiresAt();
      session.lastAccessedAt = now;
      await session.save();
      isResumed = true;
    } else if (session) {
      // Same device but session expired or was terminated — reactivate
      session.isActive = true;
      session.expiresAt = Session.newExpiresAt();
      session.lastAccessedAt = now;
      await session.save();
    } else {
      // New device — create a fresh session
      session = await Session.create({
        userId: user._id,
        username: user.username,
        deviceId,
        expiresAt: Session.newExpiresAt()
      });
    }

    const token = generateToken(user._id, session._id);

    res.json({
      success: true,
      message: isResumed ? 'Session resumed successfully' : 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        lastLogin: user.lastLogin
      },
      session: {
        id: session._id,
        deviceId: session.deviceId,
        expiresAt: session.expiresAt,
        isResumed
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

module.exports = router;
