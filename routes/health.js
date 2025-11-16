const express = require('express');
const router = express.Router();
const HealthProfile = require('../models/HealthProfile');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

// Validation helper
const validateHealthProfile = (data) => {
  const errors = [];
  
  // Validate diabetes type
  if (data.healthConditions?.diabetes?.type) {
    const validTypes = ['type1', 'type2', 'gestational', 'prediabetes'];
    if (!validTypes.includes(data.healthConditions.diabetes.type)) {
      errors.push({
        field: 'healthConditions.diabetes.type',
        message: `Invalid diabetes type. Must be one of: ${validTypes.join(', ')}`
      });
    }
  }
  
  // Validate blood pressure ranges
  if (data.healthConditions?.hypertension?.systolic) {
    if (data.healthConditions.hypertension.systolic < 70 || data.healthConditions.hypertension.systolic > 250) {
      errors.push({
        field: 'healthConditions.hypertension.systolic',
        message: 'Systolic blood pressure must be between 70-250'
      });
    }
  }
  
  if (data.healthConditions?.hypertension?.diastolic) {
    if (data.healthConditions.hypertension.diastolic < 40 || data.healthConditions.hypertension.diastolic > 150) {
      errors.push({
        field: 'healthConditions.hypertension.diastolic',
        message: 'Diastolic blood pressure must be between 40-150'
      });
    }
  }
  
  // Validate kidney disease stage
  if (data.healthConditions?.kidneyDisease?.stage) {
    const validStages = ['1', '2', '3a', '3b', '4', '5'];
    if (!validStages.includes(data.healthConditions.kidneyDisease.stage)) {
      errors.push({
        field: 'healthConditions.kidneyDisease.stage',
        message: `Invalid kidney disease stage. Must be one of: ${validStages.join(', ')}`
      });
    }
  }
  
  // Validate allergy severity
  if (data.allergies?.food) {
    data.allergies.food.forEach((allergy, index) => {
      if (allergy.severity) {
        const validSeverities = ['mild', 'moderate', 'severe', 'life_threatening'];
        if (!validSeverities.includes(allergy.severity)) {
          errors.push({
            field: `allergies.food[${index}].severity`,
            message: `Invalid allergy severity. Must be one of: ${validSeverities.join(', ')}`
          });
        }
      }
    });
  }
  
  return errors;
};

// Create or Update Health Profile
router.post('/', auth, async (req, res) => {
  try {
    logger.info('Health profile request received', {
      userId: req.user.id,
      hasHealthConditions: !!req.body.healthConditions,
      hasAllergies: !!req.body.allergies,
      hasHealthGoals: !!req.body.healthGoals
    });

    // Validate the request data
    const validationErrors = validateHealthProfile(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid health profile data',
        errors: validationErrors
      });
    }

    // Check if profile already exists
    let healthProfile = await HealthProfile.findOne({ userId: req.user.id });
    
    if (healthProfile) {
      // Update existing profile
      Object.assign(healthProfile, req.body);
      healthProfile.version += 1;
      await healthProfile.save();
      
      logger.info('Health profile updated', {
        userId: req.user.id,
        profileId: healthProfile._id,
        version: healthProfile.version
      });
      
      res.json({
        success: true,
        message: 'Health profile updated successfully',
        profile: healthProfile
      });
    } else {
      // Create new profile
      healthProfile = new HealthProfile({
        userId: req.user.id,
        ...req.body
      });
      
      await healthProfile.save();
      
      logger.info('Health profile created', {
        userId: req.user.id,
        profileId: healthProfile._id,
        version: healthProfile.version
      });
      
      res.status(201).json({
        success: true,
        message: 'Health profile created successfully',
        profile: healthProfile
      });
    }
  } catch (error) {
    logger.error('Health profile operation failed', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Get Health Profile
router.get('/', auth, async (req, res) => {
  try {
    logger.info('Health profile retrieval requested', {
      userId: req.user.id
    });

    const healthProfile = await HealthProfile.findOne({ userId: req.user.id });
    
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found',
        error: 'PROFILE_NOT_FOUND'
      });
    }
    
    logger.info('Health profile retrieved', {
      userId: req.user.id,
      profileId: healthProfile._id,
      version: healthProfile.version
    });
    
    res.json({
      success: true,
      message: 'Health profile retrieved successfully',
      profile: healthProfile
    });
  } catch (error) {
    logger.error('Health profile retrieval failed', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Update Health Profile (Partial Update)
router.put('/', auth, async (req, res) => {
  try {
    logger.info('Health profile update requested', {
      userId: req.user.id,
      updateFields: Object.keys(req.body)
    });

    // Validate the request data
    const validationErrors = validateHealthProfile(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid health profile data',
        errors: validationErrors
      });
    }

    const healthProfile = await HealthProfile.findOne({ userId: req.user.id });
    
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found',
        error: 'PROFILE_NOT_FOUND'
      });
    }
    
    // Update only provided fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        healthProfile[key] = req.body[key];
      }
    });
    
    healthProfile.version += 1;
    await healthProfile.save();
    
    logger.info('Health profile updated', {
      userId: req.user.id,
      profileId: healthProfile._id,
      version: healthProfile.version,
      updatedFields: Object.keys(req.body)
    });
    
    res.json({
      success: true,
      message: 'Health profile updated successfully',
      profile: healthProfile
    });
  } catch (error) {
    logger.error('Health profile update failed', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Delete Health Profile
router.delete('/', auth, async (req, res) => {
  try {
    logger.info('Health profile deletion requested', {
      userId: req.user.id
    });

    const healthProfile = await HealthProfile.findOneAndDelete({ userId: req.user.id });
    
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found',
        error: 'PROFILE_NOT_FOUND'
      });
    }
    
    logger.info('Health profile deleted', {
      userId: req.user.id,
      profileId: healthProfile._id
    });
    
    res.json({
      success: true,
      message: 'Health profile deleted successfully'
    });
  } catch (error) {
    logger.error('Health profile deletion failed', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Get Health Profile Summary (for AI personalization)
router.get('/summary', auth, async (req, res) => {
  try {
    logger.info('Health profile summary requested', {
      userId: req.user.id
    });

    const healthProfile = await HealthProfile.findOne({ userId: req.user.id });
    
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found',
        error: 'PROFILE_NOT_FOUND'
      });
    }
    
    // Create a summary for AI personalization
    const summary = {
      conditions: [],
      allergies: [],
      restrictions: [],
      goals: [],
      medications: [],
      activityLevel: healthProfile.activityLevel?.current || 'unknown'
    };
    
    // Extract health conditions
    if (healthProfile.healthConditions?.diabetes?.type) {
      summary.conditions.push(`diabetes_${healthProfile.healthConditions.diabetes.type}`);
    }
    if (healthProfile.healthConditions?.hypertension?.severity) {
      summary.conditions.push(`hypertension_${healthProfile.healthConditions.hypertension.severity}`);
    }
    if (healthProfile.healthConditions?.heartDisease?.type) {
      summary.conditions.push(`heart_disease_${healthProfile.healthConditions.heartDisease.type}`);
    }
    if (healthProfile.healthConditions?.kidneyDisease?.stage) {
      summary.conditions.push(`kidney_disease_stage_${healthProfile.healthConditions.kidneyDisease.stage}`);
    }
    
    // Extract allergies
    if (healthProfile.allergies?.food) {
      healthProfile.allergies.food.forEach(allergy => {
        summary.allergies.push(`${allergy.allergen}_${allergy.severity}`);
      });
    }
    
    // Extract dietary restrictions
    Object.keys(healthProfile.dietaryRestrictions || {}).forEach(key => {
      if (healthProfile.dietaryRestrictions[key] === true) {
        summary.restrictions.push(key);
      }
    });
    
    // Extract health goals
    if (healthProfile.healthGoals?.weightManagement?.goal) {
      summary.goals.push(`weight_${healthProfile.healthGoals.weightManagement.goal}`);
    }
    if (healthProfile.healthGoals?.bloodSugar?.goal) {
      summary.goals.push(`blood_sugar_${healthProfile.healthGoals.bloodSugar.goal}`);
    }
    if (healthProfile.healthGoals?.bloodPressure?.goal) {
      summary.goals.push(`blood_pressure_${healthProfile.healthGoals.bloodPressure.goal}`);
    }
    
    // Extract medications
    if (healthProfile.medications) {
      healthProfile.medications.forEach(med => {
        summary.medications.push(`${med.name}_${med.purpose}`);
      });
    }
    
    logger.info('Health profile summary created', {
      userId: req.user.id,
      summaryKeys: Object.keys(summary),
      conditionsCount: summary.conditions.length,
      allergiesCount: summary.allergies.length,
      restrictionsCount: summary.restrictions.length
    });
    
    res.json({
      success: true,
      message: 'Health profile summary retrieved successfully',
      summary: summary
    });
  } catch (error) {
    logger.error('Health profile summary failed', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;


