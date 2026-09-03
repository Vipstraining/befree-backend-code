const rateLimit = require('express-rate-limit');

const make429Handler = (windowMs) => (req, res, next, options) => {
  const retryAfter = Math.ceil(options.windowMs / 1000);
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter
  });
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: make429Handler(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000)
});

// Authentication rate limiter (more restrictive for login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: make429Handler(15 * 60 * 1000)
});

// Registration rate limiter (more lenient for new user signups)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: make429Handler(15 * 60 * 1000)
});

// Search rate limiter
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: make429Handler(60 * 1000)
});

// Forgot-password rate limiter — deliberately stricter than the general auth
// limiter. Abuse here means spamming a real inbox with reset codes, or
// probing which emails have accounts by timing/behavior, not just noisy
// login attempts.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: make429Handler(15 * 60 * 1000)
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  searchLimiter,
  forgotPasswordLimiter
};
