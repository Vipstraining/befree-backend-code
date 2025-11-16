const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Auth middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied',
        error: 'UNAUTHORIZED'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied',
        error: 'UNAUTHORIZED'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is not valid - user not found',
          error: 'UNAUTHORIZED'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      logger.error('Token verification failed', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token is not valid',
        error: 'UNAUTHORIZED'
      });
    }
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


