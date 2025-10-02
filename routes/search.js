const express = require('express');
const { body, validationResult } = require('express-validator');
const SearchHistory = require('../models/SearchHistory');

const router = express.Router();

// @route   POST /api/search/
// @desc    Search and analyze product
// @access  Private
router.post('/', [
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

    // For now, return a mock analysis since we don't have Claude integration yet
    const mockAnalysis = {
      healthImpact: 'neutral',
      score: 75,
      analysis: 'This is a mock analysis. Claude AI integration is required for real analysis.',
      recommendations: [
        'Consider portion size',
        'Check for allergens',
        'Balance with other nutrients'
      ],
      warnings: [],
      benefits: [
        'Provides essential nutrients',
        'Good source of energy'
      ]
    };

    res.json({
      success: true,
      message: 'Search completed successfully',
      searchResult: {
        query: searchQuery,
        type: searchType,
        analysis: mockAnalysis,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Search error:', error);
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
