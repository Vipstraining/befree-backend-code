// TypeScript interfaces for Health Profile API

export interface HealthConditions {
  diabetes?: {
    type: 'type1' | 'type2' | 'gestational' | 'prediabetes';
    severity: 'mild' | 'moderate' | 'severe';
    diagnosedDate?: string;
    medications?: string[];
    targetBloodSugar?: {
      fasting: number;
      postMeal: number;
    };
  };
  hypertension?: {
    severity: 'mild' | 'moderate' | 'severe';
    systolic: number;
    diastolic: number;
    medications?: string[];
  };
  heartDisease?: {
    type: 'coronary' | 'arrhythmia' | 'heart_failure';
    severity: 'mild' | 'moderate' | 'severe';
    lastEvent?: string;
  };
  kidneyDisease?: {
    stage: '1' | '2' | '3a' | '3b' | '4' | '5';
    egfr: number;
    dialysis: boolean;
  };
  digestiveIssues?: {
    ibs: boolean;
    crohns: boolean;
    colitis: boolean;
    celiac: boolean;
    lactoseIntolerant: boolean;
  };
  autoimmune?: {
    rheumatoidArthritis: boolean;
    lupus: boolean;
    hashimotos: boolean;
    graves: boolean;
  };
}

export interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction: 'hives' | 'swelling' | 'anaphylaxis' | 'rash' | 'nausea';
  lastReaction?: string;
}

export interface MedicationAllergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction: string;
}

export interface Allergies {
  food: Allergy[];
  medication: MedicationAllergy[];
}

export interface DietaryRestrictions {
  vegetarian: boolean;
  vegan: boolean;
  keto: boolean;
  paleo: boolean;
  lowCarb: boolean;
  lowSodium: boolean;
  lowSugar: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  religious: {
    halal: boolean;
    kosher: boolean;
    hindu: boolean;
  };
}

export interface WeightManagement {
  goal: 'lose' | 'maintain' | 'gain';
  targetWeight: number;
  currentWeight: number;
  timeframe: '1_month' | '3_months' | '6_months' | '1_year';
}

export interface BloodSugarGoal {
  goal: 'control' | 'prevent' | 'reverse';
  targetHbA1c: number;
  currentHbA1c: number;
}

export interface BloodPressureGoal {
  goal: 'lower' | 'maintain';
  targetSystolic: number;
  targetDiastolic: number;
}

export interface CholesterolGoal {
  goal: 'lower' | 'maintain';
  targetLDL: number;
  currentLDL: number;
}

export interface EnergyGoal {
  goal: 'increase' | 'maintain';
  currentLevel: 'low' | 'moderate' | 'high';
}

export interface SleepGoal {
  goal: 'improve' | 'maintain';
  currentHours: number;
  targetHours: number;
}

export interface HealthGoals {
  weightManagement?: WeightManagement;
  bloodSugar?: BloodSugarGoal;
  bloodPressure?: BloodPressureGoal;
  cholesterol?: CholesterolGoal;
  energy?: EnergyGoal;
  sleep?: SleepGoal;
}

export interface Injury {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  affectsExercise: boolean;
}

export interface ActivityLevel {
  current: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  exerciseFrequency: 'none' | '1-2' | '3-4' | '5-6' | 'daily';
  exerciseType: ('cardio' | 'strength' | 'yoga' | 'walking' | 'swimming' | 'cycling' | 'running')[];
  injuries: Injury[];
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'as_needed';
  purpose: 'diabetes' | 'blood_pressure' | 'heart_disease' | 'cholesterol' | 'pain' | 'other';
  interactions: string[];
}

export interface Supplement {
  name: string;
  dosage: string;
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'as_needed';
  purpose: string;
}

export interface TimeConstraints {
  mealPrep: boolean;
  quickMeals: boolean;
  cookingTime: '15_minutes' | '30_minutes' | '45_minutes' | '1_hour' | 'flexible';
}

export interface Accessibility {
  groceryStores: ('whole_foods' | 'local_market' | 'chain_store' | 'online_only')[];
  onlineShopping: boolean;
  delivery: boolean;
}

export interface Preferences {
  cuisine: ('mediterranean' | 'asian' | 'mexican' | 'indian' | 'italian' | 'american' | 'middle_eastern')[];
  cookingSkill: 'beginner' | 'intermediate' | 'advanced';
  timeConstraints: TimeConstraints;
  budget: 'low' | 'medium' | 'high';
  accessibility: Accessibility;
}

export interface HealthProfile {
  id: string;
  userId: string;
  healthConditions: HealthConditions;
  allergies: Allergies;
  dietaryRestrictions: DietaryRestrictions;
  healthGoals: HealthGoals;
  activityLevel: ActivityLevel;
  medications: Medication[];
  supplements: Supplement[];
  preferences: Preferences;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealthProfileSummary {
  conditions: string[];
  allergies: string[];
  restrictions: string[];
  goals: string[];
  medications: string[];
  activityLevel: string;
}

// API Request/Response Types
export interface CreateHealthProfileRequest {
  healthConditions?: HealthConditions;
  allergies?: Allergies;
  dietaryRestrictions?: DietaryRestrictions;
  healthGoals?: HealthGoals;
  activityLevel?: ActivityLevel;
  medications?: Medication[];
  supplements?: Supplement[];
  preferences?: Preferences;
}

export interface UpdateHealthProfileRequest {
  healthConditions?: Partial<HealthConditions>;
  allergies?: Partial<Allergies>;
  dietaryRestrictions?: Partial<DietaryRestrictions>;
  healthGoals?: Partial<HealthGoals>;
  activityLevel?: Partial<ActivityLevel>;
  medications?: Medication[];
  supplements?: Supplement[];
  preferences?: Partial<Preferences>;
}

export interface HealthProfileResponse {
  success: boolean;
  message: string;
  profile?: HealthProfile;
  summary?: HealthProfileSummary;
}

export interface HealthProfileError {
  success: false;
  message: string;
  error: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Validation Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  success: false;
  message: string;
  errors: ValidationError[];
}

// API Endpoints
export const HEALTH_PROFILE_ENDPOINTS = {
  CREATE: 'POST /api/profile/health',
  GET: 'GET /api/profile/health',
  UPDATE: 'PUT /api/profile/health',
  DELETE: 'DELETE /api/profile/health',
  SUMMARY: 'GET /api/profile/health/summary'
} as const;

// Field Validation Rules
export const VALIDATION_RULES = {
  DIABETES_TYPES: ['type1', 'type2', 'gestational', 'prediabetes'] as const,
  SEVERITY_LEVELS: ['mild', 'moderate', 'severe'] as const,
  ALLERGY_SEVERITY: ['mild', 'moderate', 'severe', 'life_threatening'] as const,
  ALLERGY_REACTIONS: ['hives', 'swelling', 'anaphylaxis', 'rash', 'nausea'] as const,
  WEIGHT_GOALS: ['lose', 'maintain', 'gain'] as const,
  BLOOD_SUGAR_GOALS: ['control', 'prevent', 'reverse'] as const,
  BLOOD_PRESSURE_GOALS: ['lower', 'maintain'] as const,
  ACTIVITY_LEVELS: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'] as const,
  EXERCISE_FREQUENCY: ['none', '1-2', '3-4', '5-6', 'daily'] as const,
  MEDICATION_FREQUENCY: ['once_daily', 'twice_daily', 'three_times_daily', 'as_needed'] as const,
  MEDICATION_PURPOSES: ['diabetes', 'blood_pressure', 'heart_disease', 'cholesterol', 'pain', 'other'] as const,
  COOKING_SKILLS: ['beginner', 'intermediate', 'advanced'] as const,
  BUDGET_LEVELS: ['low', 'medium', 'high'] as const,
  COOKING_TIMES: ['15_minutes', '30_minutes', '45_minutes', '1_hour', 'flexible'] as const,
  KIDNEY_STAGES: ['1', '2', '3a', '3b', '4', '5'] as const,
  HEART_DISEASE_TYPES: ['coronary', 'arrhythmia', 'heart_failure'] as const,
  EXERCISE_TYPES: ['cardio', 'strength', 'yoga', 'walking', 'swimming', 'cycling', 'running'] as const,
  CUISINE_TYPES: ['mediterranean', 'asian', 'mexican', 'indian', 'italian', 'american', 'middle_eastern'] as const,
  GROCERY_STORES: ['whole_foods', 'local_market', 'chain_store', 'online_only'] as const
} as const;

// Numeric Ranges
export const NUMERIC_RANGES = {
  SYSTOLIC_BP: { min: 70, max: 250 },
  DIASTOLIC_BP: { min: 40, max: 150 },
  WEIGHT: { min: 50, max: 500 }, // kg
  HEIGHT: { min: 100, max: 250 }, // cm
  AGE: { min: 0, max: 120 },
  HB_A1C: { min: 3.0, max: 15.0 },
  LDL_CHOLESTEROL: { min: 50, max: 300 },
  SLEEP_HOURS: { min: 0, max: 24 }
} as const;


