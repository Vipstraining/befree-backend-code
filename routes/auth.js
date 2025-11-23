const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register user
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
    .withMessage('Password must be at least 6 characters long')
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

    let { username, email, password, name } = req.body;

    // Check if user already exists (only email needs to be unique)
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate username from name and email if username is not provided
    if (!username) {
      const namePart = name ? name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : '';
      const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
      
      // Generate base username from name and email
      username = namePart ? `${namePart}_${emailPart}` : emailPart;
    }

    // Always append timestamp to username to ensure uniqueness
    // Use last 8 digits of timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-8);
    const baseUsername = username.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 22); // Leave room for timestamp
    username = `${baseUsername}_${timestamp}`;

    // Ensure username doesn't exceed max length (30 chars)
    if (username.length > 30) {
      username = username.substring(0, 30);
    }

    // Validate final username meets requirements
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Generated username is too short'
      });
    }

    // Check if generated username already exists (unlikely but possible)
    let usernameExists = await User.findOne({ username });
    let attempts = 0;
    const originalUsername = username;
    
    while (usernameExists && attempts < 5) {
      // If username exists, append additional random digits
      const additionalDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const base = originalUsername.substring(0, 27); // Leave room for additional digits
      username = `${base}_${additionalDigits}`;
      usernameExists = await User.findOne({ username });
      attempts++;
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
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
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Priority 1: Validate email format first (don't check password if email is invalid)
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is invalid'
      });
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email is invalid'
      });
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Priority 2: Check if user exists (email is valid at this point)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    // Priority 3: Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Priority 4: Validate password is provided
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Priority 5: Check password (email is valid and user exists)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email is valid and password is invalid'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        lastLogin: user.lastLogin
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
