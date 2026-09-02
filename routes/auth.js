const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const UserProfile = require('../models/UserProfile');
const HealthProfile = require('../models/HealthProfile');
const SearchHistory = require('../models/SearchHistory');
const { registerLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// JWT carries userId + sessionId — 30d so the token itself never expires
// before the rolling session does (session DB is the real gate)
const generateToken = (userId, sessionId) => {
  // No hardcoded fallback — see middleware/auth.js for why: validateConfig()
  // already guarantees JWT_SECRET is set before any request is served.
  return jwt.sign(
    { id: userId, sessionId },
    process.env.JWT_SECRET,
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

    // Only invalidate the session for this device. Also drop the push token —
    // an inactive session otherwise keeps it until the TTL expiry (up to
    // 120h), which is dead weight now and a real bug the day push sending
    // gets built, if that code doesn't also check isActive.
    session.isActive = false;
    session.pushToken = null;
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

// @route   PUT /api/auth/push-token
// @desc    Register (or clear) the FCM token for the calling device
// @access  Private
//
// Stored on the session, not the user: push delivery is per-device, and the
// session row is already the per-(user, device) record. Called by the web
// layer after it receives the `befree:pushToken` event from the native
// bridge — the shells never talk to `/api/*` directly (see STORE_COMPLIANCE
// §5: "push tokens are registered by the web layer, not the shell").
router.put('/push-token', auth, [
  // min: 1 rejects '' explicitly — optional({nullable:true}) only skips
  // undefined/null, so an empty string would otherwise sail through and
  // silently clear a working token (`'' || null` below) with no error signal.
  body('token')
    .optional({ nullable: true })
    .isString()
    .isLength({ min: 1, max: 4096 })
    .withMessage('token must be a non-empty string up to 4096 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    // Atomic update instead of load-mutate-save: if a concurrent request
    // (e.g. DELETE /account on another device) deleted this session in
    // between, findByIdAndUpdate returns null instead of `save()`'s
    // silent no-op success on a document that's no longer in the collection.
    const updatedSession = await Session.findByIdAndUpdate(
      req.session._id,
      { pushToken: req.body.token ?? null },
      { new: true }
    );

    if (!updatedSession) {
      return res.status(401).json({
        success: false,
        message: 'Session no longer exists — please log in again',
        error: 'SESSION_NOT_FOUND'
      });
    }

    res.json({ success: true, message: 'Push token updated' });
  } catch (error) {
    logger.error('❌ PUSH TOKEN UPDATE ERROR', {
      userId: req.user._id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Server error updating push token' });
  }
});

// @route   DELETE /api/auth/account
// @desc    Permanently delete the account and all personal data
// @access  Private
//
// Required by App Store Review Guideline 5.1.1(v): any app offering account
// creation must offer in-app account deletion. Apple is explicit that
// deactivating or disabling an account does NOT satisfy this — the account and
// its personal data must actually be removed. Google Play carries an equivalent
// requirement via its Data deletion policy.
//
// Deletion is irreversible by design. The client is responsible for confirming
// intent before calling this; the native shells show a system confirmation
// dialog (BridgeHost.confirmAccountDeletion) and wipe local state afterwards.
router.delete('/account', auth, async (req, res) => {
  const userId = req.user._id;

  // Every delete below runs in one transaction: either the whole cascade
  // commits or none of it does, so a mid-cascade failure (crash, network
  // blip) can never leave the account active with its profile/health/search
  // data silently gone — the previous non-transactional version could.
  //
  // Ordering within the transaction still matters for a *pre-commit* error
  // path (e.g. a validation throw before commit): User goes before Session,
  // so if something fails before we reach the transaction's commit, the
  // session — and thus the caller's still-valid token — was never touched
  // and the retry path stays simple. (With a transaction this mostly matters
  // for readability/intent, not correctness, since a partial failure here
  // aborts the whole transaction rather than leaving a partial state.)
  const dbSession = await mongoose.startSession();
  let profiles, healthProfiles, searches, user, sessions;

  try {
    await dbSession.withTransaction(async () => {
      // This list is hardcoded and NOT enforced anywhere — if a new
      // user-scoped collection is added to models/ later, it must be added
      // here too, or this route will keep reporting success while silently
      // leaving that collection's data behind (a 5.1.1(v)/data-deletion
      // compliance regression, not just a bug).
      [profiles, healthProfiles, searches] = await Promise.all([
        UserProfile.deleteMany({ userId }, { session: dbSession }),
        HealthProfile.deleteMany({ userId }, { session: dbSession }),
        SearchHistory.deleteMany({ userId }, { session: dbSession })
      ]);

      user = await User.deleteOne({ _id: userId }, { session: dbSession });
      sessions = await Session.deleteMany({ userId }, { session: dbSession });
    });

    if (user.deletedCount === 0) {
      logger.warn('⚠️ DELETE ACCOUNT — user already gone', { userId });
    }

    // Deliberately logs counts only. Writing the deleted email or profile
    // contents into the log would defeat the point of the deletion.
    logger.info('✅ ACCOUNT DELETED', {
      userId,
      deleted: {
        user: user.deletedCount,
        profiles: profiles.deletedCount,
        healthProfiles: healthProfiles.deletedCount,
        searches: searches.deletedCount,
        sessions: sessions.deletedCount
      }
    });

    res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted'
    });
  } catch (error) {
    logger.error('❌ DELETE ACCOUNT ERROR', {
      userId,
      error: error.message,
      stack: error.stack
    });
    // The transaction guarantees an all-or-nothing outcome, so on any error
    // here nothing was deleted — the account and all its data survive intact,
    // and retrying is safe.
    res.status(500).json({
      success: false,
      message: 'Server error deleting account. Your account still exists — please try again.'
    });
  } finally {
    await dbSession.endSession();
  }
});

module.exports = router;
