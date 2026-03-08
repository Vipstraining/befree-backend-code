const mongoose = require('mongoose');

const SESSION_DURATION_HOURS = 120; // 5 days rolling window

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  deviceId: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// One active session per user per device
SessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// MongoDB TTL index — auto-removes fully expired documents from DB
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static helpers
SessionSchema.statics.SESSION_DURATION_HOURS = SESSION_DURATION_HOURS;

SessionSchema.statics.newExpiresAt = function () {
  return new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
};

module.exports = mongoose.model('Session', SessionSchema);
