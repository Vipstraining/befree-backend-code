# User Persona API - Request & Response Schemas

## Base URL
```
http://localhost:3000/api/profile/health
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. CREATE/UPDATE HEALTH PROFILE

### Endpoint
```
POST /api/profile/health
```

### Request Schema
```json
{
  "healthConditions": {
    "diabetes": {
      "type": "type2",
      "severity": "moderate",
      "diagnosedDate": "2023-01-15",
      "medications": ["metformin", "glipizide"],
      "targetBloodSugar": {
        "fasting": 80,
        "postMeal": 140
      }
    },
    "hypertension": {
      "severity": "mild",
      "systolic": 140,
      "diastolic": 90,
      "medications": ["lisinopril"]
    },
    "heartDisease": {
      "type": "coronary",
      "severity": "mild",
      "lastEvent": "2023-06-01"
    },
    "kidneyDisease": {
      "stage": "3a",
      "egfr": 45,
      "dialysis": false
    },
    "digestiveIssues": {
      "ibs": true,
      "crohns": false,
      "colitis": false,
      "celiac": true,
      "lactoseIntolerant": true
    },
    "autoimmune": {
      "rheumatoidArthritis": false,
      "lupus": false,
      "hashimotos": true,
      "graves": false
    }
  },
  "allergies": {
    "food": [
      {
        "allergen": "peanuts",
        "severity": "severe",
        "reaction": "anaphylaxis",
        "lastReaction": "2023-03-15"
      },
      {
        "allergen": "shellfish",
        "severity": "life_threatening",
        "reaction": "anaphylaxis",
        "lastReaction": "2022-11-20"
      }
    ],
    "medication": [
      {
        "allergen": "penicillin",
        "severity": "severe",
        "reaction": "rash"
      }
    ]
  },
  "dietaryRestrictions": {
    "vegetarian": false,
    "vegan": false,
    "keto": false,
    "paleo": false,
    "lowCarb": true,
    "lowSodium": true,
    "lowSugar": true,
    "glutenFree": true,
    "dairyFree": false,
    "religious": {
      "halal": false,
      "kosher": false,
      "hindu": false
    }
  },
  "healthGoals": {
    "weightManagement": {
      "goal": "lose",
      "targetWeight": 150,
      "currentWeight": 165,
      "timeframe": "6_months"
    },
    "bloodSugar": {
      "goal": "control",
      "targetHbA1c": 6.5,
      "currentHbA1c": 7.2
    },
    "bloodPressure": {
      "goal": "lower",
      "targetSystolic": 120,
      "targetDiastolic": 80
    },
    "cholesterol": {
      "goal": "lower",
      "targetLDL": 100,
      "currentLDL": 140
    },
    "energy": {
      "goal": "increase",
      "currentLevel": "low"
    },
    "sleep": {
      "goal": "improve",
      "currentHours": 6,
      "targetHours": 8
    }
  },
  "activityLevel": {
    "current": "moderately_active",
    "exerciseFrequency": "3-4",
    "exerciseType": ["cardio", "strength", "walking"],
    "injuries": [
      {
        "type": "knee",
        "severity": "mild",
        "affectsExercise": true
      }
    ]
  },
  "medications": [
    {
      "name": "metformin",
      "dosage": "500mg",
      "frequency": "twice_daily",
      "purpose": "diabetes",
      "interactions": ["alcohol", "contrast_dye"]
    },
    {
      "name": "lisinopril",
      "dosage": "10mg",
      "frequency": "daily",
      "purpose": "blood_pressure",
      "interactions": ["potassium_supplements"]
    }
  ],
  "supplements": [
    {
      "name": "vitamin_d",
      "dosage": "2000_iu",
      "frequency": "daily",
      "purpose": "bone_health"
    },
    {
      "name": "omega_3",
      "dosage": "1000mg",
      "frequency": "daily",
      "purpose": "heart_health"
    }
  ],
  "preferences": {
    "cuisine": ["mediterranean", "asian", "mexican"],
    "cookingSkill": "intermediate",
    "timeConstraints": {
      "mealPrep": true,
      "quickMeals": true,
      "cookingTime": "30_minutes"
    },
    "budget": "medium",
    "accessibility": {
      "groceryStores": ["whole_foods", "local_market"],
      "onlineShopping": true,
      "delivery": true
    }
  }
}
```

### Success Response (201 Created / 200 Updated)
```json
{
  "success": true,
  "message": "Health profile created successfully",
  "profile": {
    "id": "68e3702ca7ea3ea5b95e8a04",
    "userId": "68e2dd3bcdabcf575e260591",
    "healthConditions": {
      "diabetes": {
        "type": "type2",
        "severity": "moderate",
        "diagnosedDate": "2023-01-15T00:00:00.000Z",
        "medications": ["metformin", "glipizide"],
        "targetBloodSugar": {
          "fasting": 80,
          "postMeal": 140
        }
      },
      "hypertension": {
        "severity": "mild",
        "systolic": 140,
        "diastolic": 90,
        "medications": ["lisinopril"]
      },
      "heartDisease": {
        "type": "coronary",
        "severity": "mild",
        "lastEvent": "2023-06-01T00:00:00.000Z"
      },
      "kidneyDisease": {
        "stage": "3a",
        "egfr": 45,
        "dialysis": false
      },
      "digestiveIssues": {
        "ibs": true,
        "crohns": false,
        "colitis": false,
        "celiac": true,
        "lactoseIntolerant": true
      },
      "autoimmune": {
        "rheumatoidArthritis": false,
        "lupus": false,
        "hashimotos": true,
        "graves": false
      }
    },
    "allergies": {
      "food": [
        {
          "allergen": "peanuts",
          "severity": "severe",
          "reaction": "anaphylaxis",
          "lastReaction": "2023-03-15T00:00:00.000Z"
        },
        {
          "allergen": "shellfish",
          "severity": "life_threatening",
          "reaction": "anaphylaxis",
          "lastReaction": "2022-11-20T00:00:00.000Z"
        }
      ],
      "medication": [
        {
          "allergen": "penicillin",
          "severity": "severe",
          "reaction": "rash"
        }
      ]
    },
    "dietaryRestrictions": {
      "vegetarian": false,
      "vegan": false,
      "keto": false,
      "paleo": false,
      "lowCarb": true,
      "lowSodium": true,
      "lowSugar": true,
      "glutenFree": true,
      "dairyFree": false,
      "religious": {
        "halal": false,
        "kosher": false,
        "hindu": false
      }
    },
    "healthGoals": {
      "weightManagement": {
        "goal": "lose",
        "targetWeight": 150,
        "currentWeight": 165,
        "timeframe": "6_months"
      },
      "bloodSugar": {
        "goal": "control",
        "targetHbA1c": 6.5,
        "currentHbA1c": 7.2
      },
      "bloodPressure": {
        "goal": "lower",
        "targetSystolic": 120,
        "targetDiastolic": 80
      },
      "cholesterol": {
        "goal": "lower",
        "targetLDL": 100,
        "currentLDL": 140
      },
      "energy": {
        "goal": "increase",
        "currentLevel": "low"
      },
      "sleep": {
        "goal": "improve",
        "currentHours": 6,
        "targetHours": 8
      }
    },
    "activityLevel": {
      "current": "moderately_active",
      "exerciseFrequency": "3-4",
      "exerciseType": ["cardio", "strength", "walking"],
      "injuries": [
        {
          "type": "knee",
          "severity": "mild",
          "affectsExercise": true
        }
      ]
    },
    "medications": [
      {
        "name": "metformin",
        "dosage": "500mg",
        "frequency": "twice_daily",
        "purpose": "diabetes",
        "interactions": ["alcohol", "contrast_dye"]
      },
      {
        "name": "lisinopril",
        "dosage": "10mg",
        "frequency": "daily",
        "purpose": "blood_pressure",
        "interactions": ["potassium_supplements"]
      }
    ],
    "supplements": [
      {
        "name": "vitamin_d",
        "dosage": "2000_iu",
        "frequency": "daily",
        "purpose": "bone_health"
      },
      {
        "name": "omega_3",
        "dosage": "1000mg",
        "frequency": "daily",
        "purpose": "heart_health"
      }
    ],
    "preferences": {
      "cuisine": ["mediterranean", "asian", "mexican"],
      "cookingSkill": "intermediate",
      "timeConstraints": {
        "mealPrep": true,
        "quickMeals": true,
        "cookingTime": "30_minutes"
      },
      "budget": "medium",
      "accessibility": {
        "groceryStores": ["whole_foods", "local_market"],
        "onlineShopping": true,
        "delivery": true
      }
    },
    "version": 1,
    "createdAt": "2025-01-06T07:30:00.000Z",
    "updatedAt": "2025-01-06T07:30:00.000Z"
  }
}
```

---

## 2. GET HEALTH PROFILE

### Endpoint
```
GET /api/profile/health
```

### Request
No body required.

### Success Response (200)
```json
{
  "success": true,
  "message": "Health profile retrieved successfully",
  "profile": {
    "id": "68e3702ca7ea3ea5b95e8a04",
    "userId": "68e2dd3bcdabcf575e260591",
    "healthConditions": {
      "diabetes": {
        "type": "type2",
        "severity": "moderate",
        "diagnosedDate": "2023-01-15T00:00:00.000Z",
        "medications": ["metformin", "glipizide"],
        "targetBloodSugar": {
          "fasting": 80,
          "postMeal": 140
        }
      },
      "hypertension": {
        "severity": "mild",
        "systolic": 140,
        "diastolic": 90,
        "medications": ["lisinopril"]
      }
    },
    "allergies": {
      "food": [
        {
          "allergen": "peanuts",
          "severity": "severe",
          "reaction": "anaphylaxis",
          "lastReaction": "2023-03-15T00:00:00.000Z"
        }
      ],
      "medication": []
    },
    "dietaryRestrictions": {
      "vegetarian": false,
      "vegan": false,
      "keto": false,
      "paleo": false,
      "lowCarb": true,
      "lowSodium": true,
      "lowSugar": true,
      "glutenFree": true,
      "dairyFree": false,
      "religious": {
        "halal": false,
        "kosher": false,
        "hindu": false
      }
    },
    "healthGoals": {
      "weightManagement": {
        "goal": "lose",
        "targetWeight": 150,
        "currentWeight": 165,
        "timeframe": "6_months"
      }
    },
    "activityLevel": {
      "current": "moderately_active",
      "exerciseFrequency": "3-4",
      "exerciseType": ["cardio", "strength", "walking"],
      "injuries": []
    },
    "medications": [
      {
        "name": "metformin",
        "dosage": "500mg",
        "frequency": "twice_daily",
        "purpose": "diabetes",
        "interactions": ["alcohol", "contrast_dye"]
      }
    ],
    "supplements": [
      {
        "name": "vitamin_d",
        "dosage": "2000_iu",
        "frequency": "daily",
        "purpose": "bone_health"
      }
    ],
    "preferences": {
      "cuisine": ["mediterranean", "asian", "mexican"],
      "cookingSkill": "intermediate",
      "timeConstraints": {
        "mealPrep": true,
        "quickMeals": true,
        "cookingTime": "30_minutes"
      },
      "budget": "medium",
      "accessibility": {
        "groceryStores": ["whole_foods", "local_market"],
        "onlineShopping": true,
        "delivery": true
      }
    },
    "version": 1,
    "createdAt": "2025-01-06T07:30:00.000Z",
    "updatedAt": "2025-01-06T07:30:00.000Z"
  }
}
```

---

## 3. UPDATE HEALTH PROFILE (Partial Update)

### Endpoint
```
PUT /api/profile/health
```

### Request Schema (Partial Update)
```json
{
  "healthGoals": {
    "weightManagement": {
      "goal": "maintain",
      "targetWeight": 150,
      "currentWeight": 150,
      "timeframe": "6_months"
    }
  },
  "activityLevel": {
    "current": "very_active",
    "exerciseFrequency": "daily",
    "exerciseType": ["cardio", "strength", "yoga", "swimming"]
  }
}
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Health profile updated successfully",
  "profile": {
    "id": "68e3702ca7ea3ea5b95e8a04",
    "userId": "68e2dd3bcdabcf575e260591",
    "healthConditions": {
      "diabetes": {
        "type": "type2",
        "severity": "moderate",
        "diagnosedDate": "2023-01-15T00:00:00.000Z",
        "medications": ["metformin", "glipizide"],
        "targetBloodSugar": {
          "fasting": 80,
          "postMeal": 140
        }
      }
    },
    "healthGoals": {
      "weightManagement": {
        "goal": "maintain",
        "targetWeight": 150,
        "currentWeight": 150,
        "timeframe": "6_months"
      }
    },
    "activityLevel": {
      "current": "very_active",
      "exerciseFrequency": "daily",
      "exerciseType": ["cardio", "strength", "yoga", "swimming"],
      "injuries": []
    },
    "version": 2,
    "createdAt": "2025-01-06T07:30:00.000Z",
    "updatedAt": "2025-01-06T08:15:00.000Z"
  }
}
```

---

## 4. DELETE HEALTH PROFILE

### Endpoint
```
DELETE /api/profile/health
```

### Request
No body required.

### Success Response (200)
```json
{
  "success": true,
  "message": "Health profile deleted successfully"
}
```

---

## 5. GET HEALTH PROFILE SUMMARY (For AI Personalization)

### Endpoint
```
GET /api/profile/health/summary
```

### Request
No body required.

### Success Response (200)
```json
{
  "success": true,
  "message": "Health profile summary retrieved successfully",
  "summary": {
    "conditions": [
      "diabetes_type2",
      "hypertension_mild",
      "heart_disease_coronary",
      "kidney_disease_stage_3a"
    ],
    "allergies": [
      "peanuts_severe",
      "shellfish_life_threatening"
    ],
    "restrictions": [
      "lowCarb",
      "lowSodium",
      "lowSugar",
      "glutenFree"
    ],
    "goals": [
      "weight_lose",
      "blood_sugar_control",
      "blood_pressure_lower"
    ],
    "medications": [
      "metformin_diabetes",
      "lisinopril_blood_pressure"
    ],
    "activityLevel": "moderately_active"
  }
}
```

---

## ERROR RESPONSES

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid health profile data",
  "errors": [
    {
      "field": "healthConditions.diabetes.type",
      "message": "Invalid diabetes type. Must be one of: type1, type2, gestational, prediabetes"
    },
    {
      "field": "healthConditions.hypertension.systolic",
      "message": "Systolic blood pressure must be between 70-250"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Health profile not found",
  "error": "PROFILE_NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

---

## FIELD VALIDATION RULES

### Health Conditions
- `diabetes.type`: `type1`, `type2`, `gestational`, `prediabetes`
- `diabetes.severity`: `mild`, `moderate`, `severe`
- `hypertension.systolic`: 70-250
- `hypertension.diastolic`: 40-150
- `kidneyDisease.stage`: `1`, `2`, `3a`, `3b`, `4`, `5`

### Allergies
- `severity`: `mild`, `moderate`, `severe`, `life_threatening`
- `reaction`: `hives`, `swelling`, `anaphylaxis`, `rash`, `nausea`

### Health Goals
- `weightManagement.goal`: `lose`, `maintain`, `gain`
- `bloodSugar.goal`: `control`, `prevent`, `reverse`
- `activityLevel.current`: `sedentary`, `lightly_active`, `moderately_active`, `very_active`, `extremely_active`

### Medications
- `frequency`: `once_daily`, `twice_daily`, `three_times_daily`, `as_needed`
- `purpose`: `diabetes`, `blood_pressure`, `heart_disease`, `cholesterol`, `pain`, `other`

---

## USAGE EXAMPLES

### Create Health Profile
```bash
curl -X POST http://localhost:3000/api/profile/health \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "healthConditions": {
      "diabetes": {
        "type": "type2",
        "severity": "moderate",
        "diagnosedDate": "2023-01-15"
      }
    },
    "allergies": {
      "food": [
        {
          "allergen": "peanuts",
          "severity": "severe",
          "reaction": "anaphylaxis"
        }
      ]
    },
    "healthGoals": {
      "weightManagement": {
        "goal": "lose",
        "targetWeight": 150,
        "currentWeight": 165
      }
    }
  }'
```

### Get Health Profile
```bash
curl -X GET http://localhost:3000/api/profile/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Update Health Profile
```bash
curl -X PUT http://localhost:3000/api/profile/health \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "healthGoals": {
      "weightManagement": {
        "goal": "maintain",
        "targetWeight": 150,
        "currentWeight": 150
      }
    }
  }'
```

### Get Health Summary
```bash
curl -X GET http://localhost:3000/api/profile/health/summary \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Delete Health Profile
```bash
curl -X DELETE http://localhost:3000/api/profile/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
