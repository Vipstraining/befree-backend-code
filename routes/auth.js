const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const { registerLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

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
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .trim()
    .normalizeEmail({ all_lowercase: true, gmail_remove_dots: false }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('deviceId')
    .notEmpty()
    .withMessage('deviceId is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('deviceId must be between 1 and 200 characters'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('mobile')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Mobile must not exceed 20 characters')
], async (req, res) => {
  const registrationStartTime = Date.now();

  try {
    logger.info('🔐 REGISTRATION ATTEMPT', {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      deviceId: req.body.deviceId,
      hasMobile: !!req.body.mobile,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ REGISTRATION VALIDATION FAILED', {
        email: req.body.email,
        errors: errors.array(),
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path || e.param, message: e.msg }))
      });
    }

    const { email, password, firstName, lastName, mobile, deviceId } = req.body;

    // Normalize email to lowercase
    const emailToStore = email.toLowerCase().trim();

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${emailToStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingUser) {
      logger.warn('❌ REGISTRATION FAILED - EMAIL EXISTS', {
        email: emailToStore,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Auto-generate username from firstName + random timestamp
    const firstNamePart = firstName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const timestamp = Date.now().toString().slice(-8);
    let username = `${firstNamePart}_${timestamp}`;

    if (username.length > 30) {
      username = username.substring(0, 30);
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Generated username is too short. Please use a longer first name.'
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

    const user = await User.create({
      username,
      email: emailToStore,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile || ''
    });

    logger.info('✅ USER CREATED', {
      userId: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasMobile: !!user.mobile
    });

    const session = await Session.create({
      userId: user._id,
      username: user.username,
      deviceId,
      expiresAt: Session.newExpiresAt()
    });

    logger.info('✅ SESSION CREATED', {
      userId: user._id,
      sessionId: session._id,
      deviceId: session.deviceId,
      expiresAt: session.expiresAt
    });

    const token = generateToken(user._id, session._id);
    const registrationDuration = Date.now() - registrationStartTime;

    logger.info('✅ REGISTRATION SUCCESSFUL', {
      userId: user._id,
      username: user.username,
      email: user.email,
      sessionId: session._id,
      deviceId: session.deviceId,
      duration: `${registrationDuration}ms`,
      ip: req.ip
    });

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
    const registrationDuration = Date.now() - registrationStartTime;

    logger.error('❌ REGISTRATION ERROR', {
      email: req.body.email,
      error: error.message,
      stack: error.stack,
      duration: `${registrationDuration}ms`,
      ip: req.ip
    });

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
  const loginStartTime = Date.now();

  try {
    const { email, password, deviceId } = req.body;

    logger.info('🔐 LOGIN ATTEMPT', {
      email: email,
      deviceId: deviceId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Email is required' }]
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Please provide a valid email' }]
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'password', message: 'Password is required' }]
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'deviceId', message: 'deviceId is required' }]
      });
    }

    // Normalize email to lowercase before lookup
    const emailToSearch = email.toLowerCase().trim();

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${emailToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).select('+password');

    if (!user) {
      logger.warn('❌ LOGIN FAILED - USER NOT FOUND', { email: emailToSearch, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    if (!user.isActive) {
      logger.warn('❌ LOGIN FAILED - ACCOUNT DEACTIVATED', { userId: user._id, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('❌ LOGIN FAILED - INVALID PASSWORD', { userId: user._id, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    logger.info('✅ PASSWORD VERIFIED', { userId: user._id, email: user.email });

    const now = new Date();
    let session = await Session.findOne({ userId: user._id, deviceId });
    let isResumed = false;

    if (session && session.isActive && session.expiresAt > now) {
      session.expiresAt = Session.newExpiresAt();
      session.lastAccessedAt = now;
      session.lastUsedAt = now;
      await session.save();
      isResumed = true;

      logger.info('♻️  SESSION RESUMED', {
        userId: user._id,
        sessionId: session._id,
        deviceId,
        expiresAt: session.expiresAt
      });
    } else if (session) {
      session.isActive = true;
      session.expiresAt = Session.newExpiresAt();
      session.lastAccessedAt = now;
      session.lastUsedAt = now;
      await session.save();

      logger.info('🔄 SESSION REACTIVATED', {
        userId: user._id,
        sessionId: session._id,
        deviceId,
        expiresAt: session.expiresAt
      });
    } else {
      session = await Session.create({
        userId: user._id,
        username: user.username,
        deviceId,
        expiresAt: Session.newExpiresAt()
      });

      logger.info('✅ NEW SESSION CREATED', {
        userId: user._id,
        sessionId: session._id,
        deviceId,
        expiresAt: session.expiresAt
      });
    }

    const token = generateToken(user._id, session._id);
    const loginDuration = Date.now() - loginStartTime;

    logger.info('✅ LOGIN SUCCESSFUL', {
      userId: user._id,
      username: user.username,
      email: user.email,
      sessionId: session._id,
      deviceId: session.deviceId,
      isResumed,
      duration: `${loginDuration}ms`,
      ip: req.ip
    });

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
    const loginDuration = Date.now() - loginStartTime;

    logger.error('❌ LOGIN ERROR', {
      email: req.body.email,
      error: error.message,
      stack: error.stack,
      duration: `${loginDuration}ms`,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Return current user from token — fast session validator, no AI or profile lookups
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    const session = req.session;

    res.json({
      success: true,
      message: 'User retrieved successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile
      },
      session: {
        id: session._id,
        deviceId: session.deviceId,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    logger.error('❌ GET /me ERROR', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Invalidate current device session (sets isActive = false, does not delete)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const session = req.session;

    // Only invalidate the session for this device
    session.isActive = false;
    await session.save();

    logger.info('✅ LOGOUT SUCCESSFUL', {
      userId: req.user._id,
      sessionId: session._id,
      deviceId: session.deviceId
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('❌ LOGOUT ERROR', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

module.exports = router;
