const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  searchType: {
    type: String,
    enum: ['barcode', 'product_name', 'ingredient'],
    required: true
  },
  searchQuery: {
    type: String,
    required: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  productName: {
    type: String,
    trim: true
  },
  nutritionalAnalysis: {
    healthImpact: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'caution']
    },
    score: { type: Number, min: 0, max: 100 },
    analysis: { type: String },
    recommendations: [{ type: String }],
    warnings: [{ type: String }],
    benefits: [{ type: String }]
  },
  userContext: {
    profile: { type: mongoose.Schema.Types.Mixed },
    recentSearches: [{ type: String }],
    patterns: [{ type: String }]
  },
  searchMetadata: {
    timestamp: { type: Date, default: Date.now },
    userAgent: { type: String },
    ipAddress: { type: String },
    sessionId: { type: String }
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    helpful: { type: Boolean },
    comments: { type: String, trim: true },
    submittedAt: { type: Date }
  }
}, {
  timestamps: true
});

// Index for better query performance
searchHistorySchema.index({ userId: 1, timestamp: -1 });
searchHistorySchema.index({ searchType: 1 });
searchHistorySchema.index({ 'nutritionalAnalysis.healthImpact': 1 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
