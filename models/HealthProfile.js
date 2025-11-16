const mongoose = require('mongoose');

const HealthProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Health Conditions
  healthConditions: {
    diabetes: {
      type: {
        type: String,
        enum: ['type1', 'type2', 'gestational', 'prediabetes'],
        default: null
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: null
      },
      diagnosedDate: {
        type: Date,
        default: null
      },
      medications: [String],
      targetBloodSugar: {
        fasting: Number,
        postMeal: Number
      }
    },
    hypertension: {
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: null
      },
      systolic: Number,
      diastolic: Number,
      medications: [String]
    },
    heartDisease: {
      type: {
        type: String,
        enum: ['coronary', 'arrhythmia', 'heart_failure'],
        default: null
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: null
      },
      lastEvent: Date
    },
    kidneyDisease: {
      stage: {
        type: String,
        enum: ['1', '2', '3a', '3b', '4', '5'],
        default: null
      },
      egfr: Number,
      dialysis: {
        type: Boolean,
        default: false
      }
    },
    digestiveIssues: {
      ibs: { type: Boolean, default: false },
      crohns: { type: Boolean, default: false },
      colitis: { type: Boolean, default: false },
      celiac: { type: Boolean, default: false },
      lactoseIntolerant: { type: Boolean, default: false }
    },
    autoimmune: {
      rheumatoidArthritis: { type: Boolean, default: false },
      lupus: { type: Boolean, default: false },
      hashimotos: { type: Boolean, default: false },
      graves: { type: Boolean, default: false }
    }
  },

  // Allergies
  allergies: {
    food: [{
      allergen: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life_threatening']
      },
      reaction: {
        type: String,
        enum: ['hives', 'swelling', 'anaphylaxis', 'rash', 'nausea']
      },
      lastReaction: Date
    }],
    medication: [{
      allergen: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life_threatening']
      },
      reaction: String
    }]
  },

  // Dietary Restrictions
  dietaryRestrictions: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    keto: { type: Boolean, default: false },
    paleo: { type: Boolean, default: false },
    lowCarb: { type: Boolean, default: false },
    lowSodium: { type: Boolean, default: false },
    lowSugar: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    dairyFree: { type: Boolean, default: false },
    religious: {
      halal: { type: Boolean, default: false },
      kosher: { type: Boolean, default: false },
      hindu: { type: Boolean, default: false }
    }
  },

  // Health Goals
  healthGoals: {
    weightManagement: {
      goal: {
        type: String,
        enum: ['lose', 'maintain', 'gain']
      },
      targetWeight: Number,
      currentWeight: Number,
      timeframe: {
        type: String,
        enum: ['1_month', '3_months', '6_months', '1_year']
      }
    },
    bloodSugar: {
      goal: {
        type: String,
        enum: ['control', 'prevent', 'reverse']
      },
      targetHbA1c: Number,
      currentHbA1c: Number
    },
    bloodPressure: {
      goal: {
        type: String,
        enum: ['lower', 'maintain']
      },
      targetSystolic: Number,
      targetDiastolic: Number
    },
    cholesterol: {
      goal: {
        type: String,
        enum: ['lower', 'maintain']
      },
      targetLDL: Number,
      currentLDL: Number
    },
    energy: {
      goal: {
        type: String,
        enum: ['increase', 'maintain']
      },
      currentLevel: {
        type: String,
        enum: ['low', 'moderate', 'high']
      }
    },
    sleep: {
      goal: {
        type: String,
        enum: ['improve', 'maintain']
      },
      currentHours: Number,
      targetHours: Number
    }
  },

  // Activity Level
  activityLevel: {
    current: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']
    },
    exerciseFrequency: {
      type: String,
      enum: ['none', '1-2', '3-4', '5-6', 'daily']
    },
    exerciseType: [{
      type: String,
      enum: ['cardio', 'strength', 'yoga', 'walking', 'swimming', 'cycling', 'running']
    }],
    injuries: [{
      type: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      affectsExercise: Boolean
    }]
  },

  // Medications
  medications: [{
    name: String,
    dosage: String,
    frequency: {
      type: String,
      enum: ['once_daily', 'twice_daily', 'three_times_daily', 'as_needed']
    },
    purpose: {
      type: String,
      enum: ['diabetes', 'blood_pressure', 'heart_disease', 'cholesterol', 'pain', 'other']
    },
    interactions: [String]
  }],

  // Supplements
  supplements: [{
    name: String,
    dosage: String,
    frequency: {
      type: String,
      enum: ['once_daily', 'twice_daily', 'three_times_daily', 'as_needed']
    },
    purpose: String
  }],

  // Preferences
  preferences: {
    cuisine: [{
      type: String,
      enum: ['mediterranean', 'asian', 'mexican', 'indian', 'italian', 'american', 'middle_eastern']
    }],
    cookingSkill: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    timeConstraints: {
      mealPrep: Boolean,
      quickMeals: Boolean,
      cookingTime: {
        type: String,
        enum: ['15_minutes', '30_minutes', '45_minutes', '1_hour', 'flexible']
      }
    },
    budget: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    accessibility: {
      groceryStores: [{
        type: String,
        enum: ['whole_foods', 'local_market', 'chain_store', 'online_only']
      }],
      onlineShopping: Boolean,
      delivery: Boolean
    }
  },

  // Metadata
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
HealthProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
HealthProfileSchema.index({ userId: 1 });
HealthProfileSchema.index({ 'healthConditions.diabetes.type': 1 });
HealthProfileSchema.index({ 'allergies.food.allergen': 1 });

module.exports = mongoose.model('HealthProfile', HealthProfileSchema);


