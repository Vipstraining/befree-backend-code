const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    trim: true
  },
  searchQuery: {
    type: String,
    required: true,
    trim: true
  },
  searchType: {
    type: String,
    enum: ['product_name', 'barcode', 'ingredients', 'general'],
    required: true
  },
  result: {
    healthImpact: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'caution']
    },
    score: { type: Number, min: 0, max: 100 },
    simpleSummary: { type: String },
    isFallback: { type: Boolean, default: false },
    isPersonalized: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Query index: user history sorted by time
searchHistorySchema.index({ userId: 1, createdAt: -1 });

// TTL index: auto-delete records after 90 days
searchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
