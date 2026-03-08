const express = require('express');
const { body, validationResult } = require('express-validator');
const SearchHistory = require('../models/SearchHistory');
const HealthProfile = require('../models/HealthProfile');
const claudeService = require('../services/claudeService');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// In-memory analytics cache: userId -> { data, timestamp }
const analyticsCache = new Map();
const ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// @route   POST /api/search/
// @desc    Search and analyze product
// @access  Private
router.post('/', auth, [
  body('searchQuery')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),
  body('searchType')
    .isIn(['barcode', 'product_name', 'ingredients', 'general'])
    .withMessage('Search type must be one of: product_name, barcode, ingredients, general')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path || e.param, message: e.msg }))
      });
    }

    const { searchQuery, searchType } = req.body;

    logger.info('Search request received', {
      query: searchQuery,
      type: searchType,
      userId: req.user.id
    });

    // Get user health profile for personalized analysis (if available)
    let userProfile = null;
    try {
      userProfile = await HealthProfile.findOne({ userId: req.user.id });
      if (userProfile) {
        logger.info('Health profile found for personalized analysis', { userId: req.user.id });
      } else {
        logger.info('No health profile found for user', { userId: req.user.id });
      }
    } catch (profileError) {
      logger.error('Error fetching health profile', { error: profileError.message, userId: req.user.id });
      // Continue without profile
    }

    // Call Claude AI for analysis
    const analysis = await claudeService.analyzeProduct(searchQuery, searchType, userProfile);

    // Non-blocking save — never let history failure affect the response
    SearchHistory.create({
      userId: req.user._id,
      deviceId: req.session?.deviceId || 'unknown',
      searchQuery,
      searchType,
      result: {
        healthImpact: analysis.healthImpact,
        score: analysis.score,
        simpleSummary: analysis.simpleSummary || analysis.analysis || '',
        isFallback: analysis.isFallback || false,
        isPersonalized: !!userProfile
      }
    }).then(() => {
      // Invalidate analytics cache for this user on new search
      analyticsCache.delete(req.user._id.toString());
    }).catch(err => logger.error('Failed to save search history', { error: err.message }));

    // Create personalization summary
    let personalizationSummary = null;
    if (userProfile) {
      personalizationSummary = {
        hasHealthProfile: true,
        consideredFactors: [],
        personalizedFor: []
      };

      if (userProfile.healthConditions) {
        if (userProfile.healthConditions.diabetes?.type) {
          personalizationSummary.consideredFactors.push('Diabetes management');
          personalizationSummary.personalizedFor.push(`Type 2 diabetes (${userProfile.healthConditions.diabetes.severity} severity)`);
        }
        if (userProfile.healthConditions.hypertension?.severity) {
          personalizationSummary.consideredFactors.push('Blood pressure control');
          personalizationSummary.personalizedFor.push(`High blood pressure (${userProfile.healthConditions.hypertension.severity} severity)`);
        }
        if (userProfile.healthConditions.heartDisease?.type) {
          personalizationSummary.consideredFactors.push('Heart health');
          personalizationSummary.personalizedFor.push(`Heart disease (${userProfile.healthConditions.heartDisease.type})`);
        }
        if (userProfile.healthConditions.kidneyDisease?.stage) {
          personalizationSummary.consideredFactors.push('Kidney function');
          personalizationSummary.personalizedFor.push(`Kidney disease (Stage ${userProfile.healthConditions.kidneyDisease.stage})`);
        }
        if (userProfile.healthConditions.digestiveIssues) {
          const digestiveIssues = [];
          if (userProfile.healthConditions.digestiveIssues.ibs) digestiveIssues.push('IBS');
          if (userProfile.healthConditions.digestiveIssues.celiac) digestiveIssues.push('Celiac Disease');
          if (userProfile.healthConditions.digestiveIssues.lactoseIntolerant) digestiveIssues.push('Lactose Intolerant');
          if (digestiveIssues.length > 0) {
            personalizationSummary.consideredFactors.push('Digestive health');
            personalizationSummary.personalizedFor.push(`Digestive issues: ${digestiveIssues.join(', ')}`);
          }
        }
      }

      if (userProfile.allergies?.food?.length > 0) {
        personalizationSummary.consideredFactors.push('Food allergies');
        const allergens = userProfile.allergies.food.map(a => a.allergen).join(', ');
        personalizationSummary.personalizedFor.push(`Food allergies: ${allergens}`);
      }

      if (userProfile.dietaryRestrictions) {
        const restrictions = [];
        if (userProfile.dietaryRestrictions.vegetarian) restrictions.push('Vegetarian');
        if (userProfile.dietaryRestrictions.vegan) restrictions.push('Vegan');
        if (userProfile.dietaryRestrictions.keto) restrictions.push('Keto');
        if (userProfile.dietaryRestrictions.lowCarb) restrictions.push('Low Carb');
        if (userProfile.dietaryRestrictions.lowSodium) restrictions.push('Low Sodium');
        if (userProfile.dietaryRestrictions.lowSugar) restrictions.push('Low Sugar');
        if (userProfile.dietaryRestrictions.glutenFree) restrictions.push('Gluten Free');
        if (userProfile.dietaryRestrictions.dairyFree) restrictions.push('Dairy Free');
        if (restrictions.length > 0) {
          personalizationSummary.consideredFactors.push('Dietary preferences');
          personalizationSummary.personalizedFor.push(`Dietary restrictions: ${restrictions.join(', ')}`);
        }
      }

      if (userProfile.healthGoals) {
        if (userProfile.healthGoals.weightManagement?.goal) {
          personalizationSummary.consideredFactors.push('Weight management');
          personalizationSummary.personalizedFor.push(`Weight goal: ${userProfile.healthGoals.weightManagement.goal} weight`);
        }
        if (userProfile.healthGoals.bloodSugar?.goal) {
          personalizationSummary.consideredFactors.push('Blood sugar control');
          personalizationSummary.personalizedFor.push(`Blood sugar goal: ${userProfile.healthGoals.bloodSugar.goal}`);
        }
        if (userProfile.healthGoals.bloodPressure?.goal) {
          personalizationSummary.consideredFactors.push('Blood pressure management');
          personalizationSummary.personalizedFor.push(`Blood pressure goal: ${userProfile.healthGoals.bloodPressure.goal}`);
        }
      }

      if (userProfile.medications?.length > 0) {
        personalizationSummary.consideredFactors.push('Current medications');
        const meds = userProfile.medications.map(m => m.name).join(', ');
        personalizationSummary.personalizedFor.push(`Current medications: ${meds}`);
      }
    } else {
      personalizationSummary = {
        hasHealthProfile: false,
        message: 'No health profile found. Analysis is general, not personalized.',
        suggestion: 'Create a health profile in your account settings for personalized food recommendations.'
      };
    }

    res.json({
      success: true,
      message: 'Search completed successfully',
      searchResult: {
        query: searchQuery,
        type: searchType,
        analysis,
        personalization: personalizationSummary,
        timestamp: new Date(),
        isPersonalized: !!userProfile,
        isFallback: analysis.isFallback || false
      }
    });

  } catch (error) {
    logger.error('Search error', {
      error: error.message,
      stack: error.stack,
      query: req.body?.searchQuery,
      type: req.body?.searchType
    });
    res.status(500).json({
      success: false,
      message: 'Server error during search'
    });
  }
});

// @route   GET /api/search/history
// @desc    Get paginated search history for current user
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const [history, total] = await Promise.all([
      SearchHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('searchQuery searchType result createdAt')
        .lean(),
      SearchHistory.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Search history retrieved',
      history: history.map(h => ({
        id: h._id,
        searchQuery: h.searchQuery,
        searchType: h.searchType,
        result: h.result,
        createdAt: h.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    logger.error('Search history error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching search history'
    });
  }
});

// @route   GET /api/search/analytics
// @desc    Get search analytics for current user (aggregated, cached 5 min)
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = userId.toString();

    // Serve from cache if fresh
    const cached = analyticsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL) {
      return res.json({
        success: true,
        message: 'Search analytics retrieved',
        analytics: cached.data
      });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      basicStats,
      weekCount,
      monthCount,
      topSearches,
      impactDist,
      typeDist
    ] = await Promise.all([
      // Total searches + average health score
      SearchHistory.aggregate([
        { $match: { userId } },
        { $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          averageHealthScore: { $avg: '$result.score' }
        }}
      ]),
      // Searches this week
      SearchHistory.countDocuments({ userId, createdAt: { $gte: oneWeekAgo } }),
      // Searches this month
      SearchHistory.countDocuments({ userId, createdAt: { $gte: oneMonthAgo } }),
      // Top searches (by frequency, lowercase-normalized)
      SearchHistory.aggregate([
        { $match: { userId } },
        { $group: {
          _id: { $toLower: '$searchQuery' },
          count: { $sum: 1 },
          lastSearched: { $max: '$createdAt' },
          originalQuery: { $last: '$searchQuery' }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      // Health impact distribution
      SearchHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: '$result.healthImpact', count: { $sum: 1 } } }
      ]),
      // Search type distribution
      SearchHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: '$searchType', count: { $sum: 1 } } }
      ])
    ]);

    const stats = basicStats[0] || { totalSearches: 0, averageHealthScore: 0 };

    const healthImpactDistribution = { positive: 0, negative: 0, neutral: 0, caution: 0 };
    impactDist.forEach(item => {
      if (item._id && Object.prototype.hasOwnProperty.call(healthImpactDistribution, item._id)) {
        healthImpactDistribution[item._id] = item.count;
      }
    });

    const searchTypeDistribution = { product_name: 0, barcode: 0, ingredients: 0, general: 0 };
    typeDist.forEach(item => {
      if (item._id && Object.prototype.hasOwnProperty.call(searchTypeDistribution, item._id)) {
        searchTypeDistribution[item._id] = item.count;
      }
    });

    const analytics = {
      totalSearches: stats.totalSearches,
      searchesThisWeek: weekCount,
      searchesThisMonth: monthCount,
      averageHealthScore: stats.averageHealthScore
        ? Math.round(stats.averageHealthScore * 10) / 10
        : 0,
      trendingSearches: topSearches.slice(0, 5).map(s => ({
        query: s._id,
        count: s.count
      })),
      healthImpactDistribution,
      searchTypeDistribution,
      topSearches: topSearches.map(s => ({
        query: s.originalQuery,
        count: s.count,
        lastSearched: s.lastSearched
      }))
    };

    // Store in cache
    analyticsCache.set(cacheKey, { data: analytics, timestamp: Date.now() });

    res.json({
      success: true,
      message: 'Search analytics retrieved',
      analytics
    });
  } catch (error) {
    logger.error('Search analytics error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

// @route   GET /api/search/trending
// @desc    Get trending searches (public)
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Trending searches',
      trending: [
        'organic apples',
        'quinoa salad',
        'greek yogurt',
        'avocado toast',
        'green smoothie'
      ]
    });
  } catch (error) {
    logger.error('Trending searches error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending searches'
    });
  }
});

module.exports = router;
