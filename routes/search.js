const express = require('express');
const { body, validationResult } = require('express-validator');
const SearchHistory = require('../models/SearchHistory');
const HealthProfile = require('../models/HealthProfile');
const claudeService = require('../services/claudeService');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// @route   POST /api/search/
// @desc    Search and analyze product
// @access  Private
router.post('/', auth, [
  body('searchQuery')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  body('searchType')
    .isIn(['barcode', 'product_name', 'ingredient'])
    .withMessage('Search type must be barcode, product_name, or ingredient')
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

    const { searchQuery, searchType, barcode, productName } = req.body;

    logger.info('Search request received', {
      query: searchQuery,
      type: searchType,
      barcode,
      productName,
      userId: req.user?.id || 'anonymous'
    });

    // Get user health profile for personalized analysis (if available)
    let userProfile = null;
    if (req.user) {
      try {
        userProfile = await HealthProfile.findOne({ userId: req.user.id });
        if (userProfile) {
          logger.info('Health profile found for personalized analysis', {
            userId: req.user.id,
            hasConditions: !!userProfile.healthConditions,
            hasAllergies: !!userProfile.allergies,
            hasGoals: !!userProfile.healthGoals
          });
        } else {
          logger.info('No health profile found for user', { userId: req.user.id });
        }
      } catch (error) {
        logger.error('Error fetching health profile', {
          error: error.message,
          userId: req.user.id
        });
        // Continue without profile if there's an error
      }
    }

    // Call Claude AI for analysis
    const analysis = await claudeService.analyzeProduct(searchQuery, searchType, userProfile);

    // Save search history
    try {
      const searchHistory = new SearchHistory({
        userId: req.user?.id || null,
        searchType,
        searchQuery,
        barcode,
        productName,
        nutritionalAnalysis: analysis,
        userContext: userProfile,
        searchMetadata: {
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });
      
      await searchHistory.save();
      logger.info('Search history saved', { searchId: searchHistory._id });
    } catch (saveError) {
      logger.error('Failed to save search history', { error: saveError.message });
      // Don't fail the request if history saving fails
    }

    // Create personalization summary
    let personalizationSummary = null;
    if (userProfile) {
      personalizationSummary = {
        hasHealthProfile: true,
        consideredFactors: [],
        personalizedFor: []
      };

      // Health conditions considered
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

      // Allergies considered
      if (userProfile.allergies?.food?.length > 0) {
        personalizationSummary.consideredFactors.push('Food allergies');
        const allergens = userProfile.allergies.food.map(a => a.allergen).join(', ');
        personalizationSummary.personalizedFor.push(`Food allergies: ${allergens}`);
      }

      // Dietary restrictions considered
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

      // Health goals considered
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

      // Medications considered
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
        analysis: analysis,
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
// @desc    Get search history
// @access  Private
router.get('/history', async (req, res) => {
  try {
    // For now, return a mock response since we don't have auth middleware yet
    res.json({
      success: true,
      message: 'Search history endpoint - authentication required',
      history: []
    });
  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching search history'
    });
  }
});

// @route   GET /api/search/analytics
// @desc    Get search analytics
// @access  Private
router.get('/analytics', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Search analytics endpoint - authentication required',
      analytics: {
        totalSearches: 0,
        trendingSearches: [],
        healthImpactDistribution: {
          positive: 0,
          negative: 0,
          neutral: 0,
          caution: 0
        }
      }
    });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

// @route   GET /api/search/trending
// @desc    Get trending searches
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
    console.error('Trending searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending searches'
    });
  }
});

module.exports = router;
