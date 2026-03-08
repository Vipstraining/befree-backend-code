const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const logger = require('../config/logger');

// Auth middleware — validates JWT and session record in DB.
// On every valid request the session's expiresAt is extended by 120 hours (rolling window).
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    // a. Token must be present
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        error: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);

    // b+c. Verify JWT signature and check expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Token expired', { error: err.message });
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          error: 'UNAUTHORIZED'
        });
      }
      logger.error('Token verification failed', {
        error: err.message,
        token: token.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'UNAUTHORIZED'
      });
    }

    // Token must contain sessionId (tokens issued before session system won't have it)
    if (!decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token — please log in again',
        error: 'UNAUTHORIZED'
      });
    }

    // d. Look up session in DB
    const session = await Session.findById(decoded.sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found — please log in again',
        error: 'SESSION_NOT_FOUND'
      });
    }

    // e. Session must be active
    if (!session.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Session has been terminated — please log in again',
        error: 'SESSION_TERMINATED'
      });
    }

    // f. Session must not be expired
    if (session.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired — please log in again',
        error: 'SESSION_EXPIRED'
      });
    }

    // g. Extend session by 120 hours on every authenticated request
    const now = new Date();
    session.expiresAt = Session.newExpiresAt();
    session.lastAccessedAt = now;
    session.lastUsedAt = now;
    await session.save();

    // Attach user to request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid — user not found',
        error: 'UNAUTHORIZED'
      });
    }

    req.user = user;
    req.session = session;
    next();

  } catch (error) {
    logger.error('Auth middleware error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: 'INTERNAL_ERROR'
    });
  }
};

module.exports = auth;
