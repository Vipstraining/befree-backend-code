const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  personalInfo: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    age: { type: Number, min: 1, max: 120 },
    height: { type: Number, min: 50, max: 300 }, // in cm
    weight: { type: Number, min: 20, max: 500 }, // in kg
    gender: { type: String, enum: ['male', 'female', 'other'] },
    activityLevel: { 
      type: String, 
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'] 
    }
  },
  healthInfo: {
    allergies: [{ type: String, trim: true }],
    medicalConditions: [{ type: String, trim: true }],
    dietaryRestrictions: [{ type: String, trim: true }],
    medications: [{ type: String, trim: true }]
  },
  goals: {
    primaryGoal: { 
      type: String, 
      enum: ['weight_loss', 'weight_gain', 'muscle_building', 'health_improvement', 'maintenance'] 
    },
    targetWeight: { type: Number, min: 20, max: 500 },
    targetDate: { type: Date },
    specificGoals: [{ type: String, trim: true }]
  },
  preferences: {
    cuisineTypes: [{ type: String, trim: true }],
    cookingSkill: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced', 'expert'] 
    },
    budget: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'premium'] 
    },
    mealFrequency: { type: Number, min: 1, max: 10 },
    preferredMealTimes: [{ type: String }]
  },
  isComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
