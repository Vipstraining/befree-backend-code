# Befree Food Catalog API — Documentation

**Version:** 1.0.0
**Last Updated:** March 2026
**Base URL (Development):** `http://localhost:3000`
**Base URL (Production):** `https://api.befree.fit`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Session Model](#authentication--session-model)
3. [Session Lifecycle](#session-lifecycle)
4. [Rate Limits](#rate-limits)
5. [Standard Response Format](#standard-response-format)
6. [Error Codes](#error-codes)
7. [Endpoints — Utility](#endpoints--utility)
8. [Endpoints — Authentication](#endpoints--authentication)
9. [Endpoints — User Profile](#endpoints--user-profile)
10. [Endpoints — Health Profile](#endpoints--health-profile)
11. [Endpoints — Search](#endpoints--search)
12. [Frontend Integration Guide](#frontend-integration-guide)
13. [CORS](#cors)
14. [Environment Variables](#environment-variables)

---

## Overview

The Befree API is a Node.js/Express backend that provides:
- User registration and login with **device-based session management**
- Health profile management (conditions, allergies, dietary restrictions, goals)
- AI-powered food/product analysis via Claude AI
- Search history and analytics

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express 4 |
| Database | MongoDB (Mongoose) |
| Auth | JWT + DB session table |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) |
| Security | Helmet, CORS, bcryptjs, express-rate-limit |

---

## Authentication & Session Model

### How it works

Every authenticated user action is backed by a **Session record** stored in the database. The JWT token is a signed credential that carries the session reference — the database session is the **source of truth** for access validity.

```
Client                         Server
  |                              |
  | POST /api/auth/login         |
  |  { email, password,          |
  |    deviceId }  ──────────►  |
  |                              | 1. Validate credentials
  |                              | 2. Find/create Session (userId + deviceId)
  |                              | 3. Sign JWT { userId, sessionId }
  |  ◄── { token, session } ──  |
  |                              |
  | GET /api/search/ (Bearer)    |
  |  Authorization: Bearer <tok> |
  |  ──────────────────────────► |
  |                              | 1. Verify JWT signature
  |                              | 2. Extract sessionId from token
  |                              | 3. Lookup Session in DB
  |                              | 4. Check isActive + expiresAt
  |                              | 5. Extend expiresAt +120 hours
  |  ◄── { result }  ─────────  |
```

### Token format

The JWT payload contains:
```json
{
  "id": "<userId>",
  "sessionId": "<sessionId>",
  "iat": 1741900800,
  "exp": 1744492800
}
```

### How to send the token

Include the token in every protected request:
```
Authorization: Bearer <jwt_token>
```

---

## Session Lifecycle

### Key rules

| Rule | Detail |
|------|--------|
| **Default duration** | 5 days (120 hours) from last activity |
| **Extension on lookup** | Every authenticated API call adds 120 hours to `expiresAt` |
| **Unique constraint** | One session per `userId + deviceId` pair |
| **New device** | A new session record is created for each new device |
| **Same device, valid session** | Session is resumed; journey continues |
| **Same device, expired session** | Session is reactivated with a fresh 5-day window |
| **JWT expiry** | 30 days (upper bound) — DB session is the real gate |
| **Auto-cleanup** | MongoDB TTL index removes expired session documents automatically |

### Session states

```
[Login / Register]
       │
       ▼
  ┌─────────┐   every API call   ┌─────────────────────────┐
  │  ACTIVE │ ─────────────────► │ expiresAt += 120 hours   │
  └─────────┘                    └─────────────────────────┘
       │
       │  no activity for 120 hours
       ▼
  ┌─────────┐
  │ EXPIRED │ ──── next login on same device ────► ACTIVE (reactivated)
  └─────────┘
       │
       │  MongoDB TTL (background)
       ▼
  [Document deleted from DB]
```

### What `deviceId` is

`deviceId` is a string the **client generates and stores persistently** on the device. It uniquely identifies the device across app restarts. It must be:
- Stable (same value every time the app opens on that device)
- Unique per device
- Sent on every login and register call

Recommended generation strategies:
- **Mobile:** use device UUID / `react-native-device-info` `getUniqueId()`
- **Web:** generate a UUID once, store in `localStorage`, reuse forever

---

## Rate Limits

| Scope | Window | Max Requests |
|-------|--------|-------------|
| All `/api/*` | 15 min | 100 (prod) / 1000 (dev) |
| Auth `/api/auth/*` | 15 min | 10 (prod) / 50 (dev) |
| Register `/api/auth/register` | 15 min | 20 (prod) / 20 (dev) |
| Search `/api/search/*` | 1 min | 10 (prod) / 200 (dev) |

**Rate limit exceeded (`429`):**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Standard Response Format

### Success
```json
{
  "success": true,
  "message": "Human-readable description",
  "fieldName": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": "ERROR_CODE",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" }
  ]
}
```

---

## Error Codes

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized |
| `404` | Not Found |
| `429` | Rate Limited |
| `500` | Internal Server Error |

### Auth Error Codes (in `error` field)

| Code | Meaning | Action |
|------|---------|--------|
| `UNAUTHORIZED` | Missing, invalid, or expired JWT | Redirect to login |
| `SESSION_NOT_FOUND` | Session was deleted from DB | Redirect to login |
| `SESSION_TERMINATED` | Session was explicitly deactivated | Redirect to login |
| `SESSION_EXPIRED` | 120 hours passed without any activity | Redirect to login |
| `PROFILE_NOT_FOUND` | Health profile doesn't exist yet | Show create profile flow |
| `INTERNAL_ERROR` | Server-side error | Show generic error message |

---

## Endpoints — Utility

### `GET /`
Root API info.

**Access:** Public

```json
{
  "success": true,
  "message": "Befree Food Catalog API",
  "version": "1.0.0",
  "environment": "development"
}
```

---

### `GET /health`
Server health check. Use this to verify the API is reachable before making other calls.

**Access:** Public

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-08T00:00:00.000Z",
  "environment": "development",
  "version": "1.0.0",
  "uptime": 123.45,
  "memory": { "rss": 0, "heapTotal": 0, "heapUsed": 0 },
  "config": {
    "rateLimit": { "window": 900000, "max": 100 },
    "database": { "connected": true, "uri": "configured" }
  }
}
```

---

### `GET /api/test`
Test endpoint for verifying CORS and connectivity.

**Access:** Public

---

## Endpoints — Authentication

### `POST /api/auth/register`

Register a new user. Automatically creates a session for the device.

**Access:** Public
**Rate Limit:** 20 req / 15 min

#### Request Body

```json
{
  "email": "User@Example.com",
  "password": "mypassword",
  "deviceId": "device-uuid-abc123",
  "firstName": "John",
  "lastName": "Doe",
  "mobile": "+1234567890"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `email` | Yes | Valid email, must be unique. **Email is stored exactly as submitted** (not normalized or lowercased). |
| `password` | Yes | Minimum 6 characters |
| `deviceId` | Yes | 1–200 chars, stable device identifier (UUID, device fingerprint, etc.) |
| `firstName` | Yes | 1-50 chars. Used to auto-generate username. Whitespace and special chars are stripped for username. |
| `lastName` | Yes | 1-50 chars. User's last name. |
| `mobile` | No | Phone number. **Can be blank/empty string or omitted entirely.** Stored as-is in database. |

#### Important Notes

- **Email Handling**: Email addresses are stored exactly as you submit them. `User@Example.com` will be stored as `User@Example.com`, not `user@example.com`.
- **Mobile Field**: The mobile field is optional and can be:
  - Omitted from the request body entirely
  - Sent as an empty string `""`
  - Sent with a valid phone number
- **Username Auto-Generation**: Username is automatically generated from firstName + random timestamp. Users cannot provide custom usernames.

#### Username Generation Rules

Username is **automatically generated** from `firstName` + random timestamp:
1. `firstName` is converted to lowercase
2. Spaces are replaced with underscores
3. Special characters are removed (only alphanumeric and underscore allowed)
4. Random 8-digit timestamp suffix is appended (`_XXXXXXXX`)
5. Final username is capped at 30 characters

**Examples:**
- `firstName="John"` → `john_12345678`
- `firstName="Mary Jane"` → `mary_jane_12345678`
- `firstName="José"` → `jos_12345678`

**Note**: Username field is NOT accepted in the request body. It is always auto-generated.

#### Success Response `201`

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64abc123def456",
    "username": "john_12345678",
    "email": "User@Example.com"
  },
  "session": {
    "id": "64session789xyz",
    "deviceId": "device-uuid-abc123",
    "expiresAt": "2026-03-13T00:00:00.000Z",
    "isResumed": false
  }
}
```

**Response Fields:**
- `token`: JWT token to use for authenticated requests (expires in 30 days)
- `user.username`: The generated/assigned username (includes timestamp suffix)
- `user.email`: The email address exactly as submitted
- `session.expiresAt`: Session expiration (rolling 120 hours from last activity)
- `session.isResumed`: Always `false` for new registrations

#### Error Responses

`400` Validation failed:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "path": "email", "msg": "Please provide a valid email" },
    { "path": "password", "msg": "Password must be at least 6 characters long" },
    { "path": "deviceId", "msg": "deviceId is required" }
  ]
}
```

`400` Email already registered:
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

`400` Missing firstName when username not provided:
```json
{
  "success": false,
  "message": "firstName is required to generate username"
}
```

`400` Generated username too short:
```json
{
  "success": false,
  "message": "Generated username is too short"
}
```

`500` Server error:
```json
{
  "success": false,
  "message": "Server error during registration"
}
```

#### Complete Examples

**Example 1: Registration with all fields**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Sarah.Johnson@Example.com",
    "password": "securePass123",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "mobile": "+1-555-123-4567"
  }'
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YWJjMTIz...",
  "user": {
    "id": "65abc123def456",
    "username": "sarah_17098765",
    "email": "Sarah.Johnson@Example.com"
  },
  "session": {
    "id": "65session789xyz",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": "2026-03-14T12:30:00.000Z",
    "isResumed": false
  }
}
```

**Example 2: Registration without mobile**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "password": "myPassword456",
    "deviceId": "device-abc-123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65def789abc123",
    "username": "john_17098766",
    "email": "john.doe@company.com"
  },
  "session": {
    "id": "65xyz456session",
    "deviceId": "device-abc-123",
    "expiresAt": "2026-03-14T12:35:00.000Z",
    "isResumed": false
  }
}
```

**Example 3: Registration with blank mobile**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@startup.io",
    "password": "strongPass789",
    "deviceId": "mobile-device-xyz",
    "firstName": "Alex",
    "lastName": "Martinez",
    "mobile": ""
  }'
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65ghi789jkl012",
    "username": "alex_17098767",
    "email": "alex@startup.io"
  },
  "session": {
    "id": "65abc111session",
    "deviceId": "mobile-device-xyz",
    "expiresAt": "2026-03-14T12:40:00.000Z",
    "isResumed": false
  }
}
```

**Example 4: Email case sensitivity demonstration**

Registering with `User@Example.com`:
```json
{
  "email": "User@Example.com",
  "password": "pass123",
  "deviceId": "device-1",
  "firstName": "Test",
  "lastName": "User"
}
```
✅ Stored as: `User@Example.com`

Later, trying to register with `user@example.com`:
```json
{
  "email": "user@example.com",
  "password": "pass456",
  "deviceId": "device-2",
  "firstName": "Test",
  "lastName": "User2"
}
```
❌ Error: Email already exists (case-insensitive duplicate check)

**Note**: While emails are stored as-is, the uniqueness check is case-insensitive to prevent duplicate accounts with different casing.

---

### `POST /api/auth/login`

Login with email and password. Creates a new session for a new device, or resumes an existing valid session for a returning device.

**Access:** Public
**Rate Limit:** 10 req / 15 min

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "deviceId": "device-uuid-abc123"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `email` | Yes | Email stored as-is during registration |
| `password` | Yes | — |
| `deviceId` | Yes | Must match the value used on this device since initial login |

#### Session behavior on login

| Scenario | Result |
|----------|--------|
| First login on this device | New session created |
| Login on same device, session still valid | Session resumed, `expiresAt` extended by 120 hours, `isResumed: true` |
| Login on same device, session expired | Session reactivated with fresh 120-hour window, `isResumed: false` |
| Login on a new device | New session created for that device, `isResumed: false` |

#### Error priority order

Errors are returned in this strict order:
1. Email missing or invalid format → `400`
2. `deviceId` missing → `400`
3. No account found with email → `401`
4. Account deactivated → `401`
5. Password missing → `400`
6. Password incorrect → `401`

#### Success Response `200`

```json
{
  "success": true,
  "message": "Session resumed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64abc123def456",
    "username": "john_doe_12345678",
    "email": "user@example.com",
    "lastLogin": "2026-03-08T10:00:00.000Z"
  },
  "session": {
    "id": "64session789xyz",
    "deviceId": "device-uuid-abc123",
    "expiresAt": "2026-03-13T10:00:00.000Z",
    "isResumed": true
  }
}
```

> `message` is `"Session resumed successfully"` when `isResumed: true`, otherwise `"Login successful"`.

#### Error Responses

`400` Email invalid:
```json
{ "success": false, "message": "Email is invalid" }
```

`400` deviceId missing:
```json
{ "success": false, "message": "deviceId is required" }
```

`401` Wrong password:
```json
{ "success": false, "message": "Email is valid and password is invalid" }
```

`401` No account:
```json
{ "success": false, "message": "No account found with this email" }
```

`401` Deactivated:
```json
{ "success": false, "message": "Account is deactivated" }
```

---

## Endpoints — User Profile

> These endpoints are placeholders. Currently return stub responses. Full implementation pending.

### `GET /api/profile/`

**Access:** Private

```json
{
  "success": true,
  "message": "Profile endpoint - authentication required",
  "profile": null
}
```

### `PUT /api/profile/`

**Access:** Private

```json
{
  "success": true,
  "message": "Profile update endpoint - authentication required",
  "profile": null
}
```

---

## Endpoints — Health Profile

All health profile endpoints require a valid `Authorization: Bearer <token>` header.

### `POST /api/profile/health`

Create or update the authenticated user's health profile.
- If no profile exists → creates a new one (returns `201`)
- If profile already exists → updates it, increments `version` (returns `200`)

**Access:** Private

#### Request Body

All fields are optional. Send only the fields you want to set.

```json
{
  "healthConditions": {
    "diabetes": {
      "type": "type2",
      "severity": "moderate",
      "diagnosedDate": "2020-01-01",
      "medications": ["Metformin"],
      "targetBloodSugar": {
        "fasting": 100,
        "postMeal": 140
      }
    },
    "hypertension": {
      "severity": "mild",
      "systolic": 130,
      "diastolic": 85,
      "medications": ["Lisinopril"]
    },
    "heartDisease": {
      "type": "coronary",
      "severity": "mild",
      "lastEvent": "2021-06-15"
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
      "celiac": false,
      "lactoseIntolerant": true
    },
    "autoimmune": {
      "rheumatoidArthritis": false,
      "lupus": false,
      "hashimotos": false,
      "graves": false
    }
  },
  "allergies": {
    "food": [
      {
        "allergen": "peanuts",
        "severity": "severe",
        "reaction": "anaphylaxis",
        "lastReaction": "2023-03-01"
      }
    ],
    "medication": [
      {
        "allergen": "penicillin",
        "severity": "moderate",
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
    "glutenFree": false,
    "dairyFree": false,
    "religious": {
      "halal": true,
      "kosher": false,
      "hindu": false
    }
  },
  "healthGoals": {
    "weightManagement": {
      "goal": "lose",
      "targetWeight": 75,
      "currentWeight": 90,
      "timeframe": "6_months"
    },
    "bloodSugar": {
      "goal": "control",
      "targetHbA1c": 6.5,
      "currentHbA1c": 7.8
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
      "currentHours": 5,
      "targetHours": 8
    }
  },
  "activityLevel": {
    "current": "lightly_active",
    "exerciseFrequency": "3-4",
    "exerciseType": ["walking", "yoga"],
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
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "twice_daily",
      "purpose": "diabetes",
      "interactions": ["alcohol"]
    }
  ],
  "supplements": [
    {
      "name": "Vitamin D",
      "dosage": "1000IU",
      "frequency": "once_daily",
      "purpose": "bone health"
    }
  ],
  "preferences": {
    "cuisine": ["mediterranean", "asian"],
    "cookingSkill": "intermediate",
    "timeConstraints": {
      "mealPrep": true,
      "quickMeals": false,
      "cookingTime": "30_minutes"
    },
    "budget": "medium",
    "accessibility": {
      "groceryStores": ["local_market", "chain_store"],
      "onlineShopping": true,
      "delivery": false
    }
  }
}
```

#### Field Reference — Allowed Enum Values

| Field | Allowed Values |
|-------|---------------|
| `healthConditions.diabetes.type` | `type1` `type2` `gestational` `prediabetes` |
| `healthConditions.diabetes.severity` | `mild` `moderate` `severe` |
| `healthConditions.hypertension.severity` | `mild` `moderate` `severe` |
| `healthConditions.hypertension.systolic` | Integer between **70–250** |
| `healthConditions.hypertension.diastolic` | Integer between **40–150** |
| `healthConditions.heartDisease.type` | `coronary` `arrhythmia` `heart_failure` |
| `healthConditions.kidneyDisease.stage` | `1` `2` `3a` `3b` `4` `5` |
| `allergies.food[].severity` | `mild` `moderate` `severe` `life_threatening` |
| `allergies.food[].reaction` | `hives` `swelling` `anaphylaxis` `rash` `nausea` |
| `healthGoals.weightManagement.goal` | `lose` `maintain` `gain` |
| `healthGoals.weightManagement.timeframe` | `1_month` `3_months` `6_months` `1_year` |
| `healthGoals.bloodSugar.goal` | `control` `prevent` `reverse` |
| `healthGoals.bloodPressure.goal` | `lower` `maintain` |
| `healthGoals.cholesterol.goal` | `lower` `maintain` |
| `healthGoals.energy.goal` | `increase` `maintain` |
| `healthGoals.energy.currentLevel` | `low` `moderate` `high` |
| `healthGoals.sleep.goal` | `improve` `maintain` |
| `activityLevel.current` | `sedentary` `lightly_active` `moderately_active` `very_active` `extremely_active` |
| `activityLevel.exerciseFrequency` | `none` `1-2` `3-4` `5-6` `daily` |
| `activityLevel.exerciseType[]` | `cardio` `strength` `yoga` `walking` `swimming` `cycling` `running` |
| `medications[].frequency` | `once_daily` `twice_daily` `three_times_daily` `as_needed` |
| `medications[].purpose` | `diabetes` `blood_pressure` `heart_disease` `cholesterol` `pain` `other` |
| `preferences.cuisine[]` | `mediterranean` `asian` `mexican` `indian` `italian` `american` `middle_eastern` |
| `preferences.cookingSkill` | `beginner` `intermediate` `advanced` |
| `preferences.timeConstraints.cookingTime` | `15_minutes` `30_minutes` `45_minutes` `1_hour` `flexible` |
| `preferences.budget` | `low` `medium` `high` |
| `preferences.accessibility.groceryStores[]` | `whole_foods` `local_market` `chain_store` `online_only` |

#### Success Response — Created `201`

```json
{
  "success": true,
  "message": "Health profile created successfully",
  "profile": { "...full profile object..." }
}
```

#### Success Response — Updated `200`

```json
{
  "success": true,
  "message": "Health profile updated successfully",
  "profile": { "...full profile object..." }
}
```

#### Error — Validation `400`

```json
{
  "success": false,
  "message": "Invalid health profile data",
  "errors": [
    {
      "field": "healthConditions.diabetes.type",
      "message": "Invalid diabetes type. Must be one of: type1, type2, gestational, prediabetes"
    }
  ]
}
```

---

### `GET /api/profile/health`

Retrieve the authenticated user's full health profile.

**Access:** Private

#### Success Response `200`

```json
{
  "success": true,
  "message": "Health profile retrieved successfully",
  "profile": { "...full profile object..." }
}
```

#### Error `404`

```json
{
  "success": false,
  "message": "Health profile not found",
  "error": "PROFILE_NOT_FOUND"
}
```

---

### `PUT /api/profile/health`

Partially update the health profile. Only fields provided in the body are changed.

**Access:** Private

**Request Body:** Any subset of the fields listed in `POST /api/profile/health`

#### Success Response `200`

```json
{
  "success": true,
  "message": "Health profile updated successfully",
  "profile": { "...updated profile object..." }
}
```

---

### `DELETE /api/profile/health`

Delete the authenticated user's health profile.

**Access:** Private

#### Success Response `200`

```json
{
  "success": true,
  "message": "Health profile deleted successfully"
}
```

---

### `GET /api/profile/health/summary`

Get a condensed, machine-readable summary of the health profile. Used internally by the AI engine to personalize food analysis.

**Access:** Private

#### Success Response `200`

```json
{
  "success": true,
  "message": "Health profile summary retrieved successfully",
  "summary": {
    "conditions": ["diabetes_type2", "hypertension_mild"],
    "allergies": ["peanuts_severe"],
    "restrictions": ["lowCarb", "lowSodium"],
    "goals": ["weight_lose", "blood_sugar_control"],
    "medications": ["Metformin_diabetes"],
    "activityLevel": "lightly_active"
  }
}
```

---

## Endpoints — Search

### `POST /api/search/`

Analyze a food product or ingredient using Claude AI. If the user has a health profile, the analysis is automatically personalized.

**Access:** Private
**Rate Limit:** 10 req / 1 min

#### Request Body

```json
{
  "searchQuery": "Coca-Cola",
  "searchType": "product_name",
  "barcode": "04900050032",
  "productName": "Coca-Cola Classic"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `searchQuery` | Yes | 1–200 characters |
| `searchType` | Yes | `barcode` \| `product_name` \| `ingredient` |
| `barcode` | No | Extra context, pass when scanning a barcode |
| `productName` | No | Extra context |

#### Success Response `200`

```json
{
  "success": true,
  "message": "Search completed successfully",
  "searchResult": {
    "query": "Coca-Cola",
    "type": "product_name",
    "analysis": {
      "healthImpact": "negative",
      "score": 20,
      "analysis": "Coca-Cola is a sugary carbonated beverage...",
      "recommendations": [
        "Limit to an occasional treat",
        "Choose water or sparkling water instead"
      ],
      "warnings": [
        "Very high in added sugar",
        "Contains caffeine"
      ],
      "benefits": [],
      "nutritionalFacts": {
        "calories": "About 140 calories per 12oz can",
        "macros": "Almost entirely sugar with no meaningful protein or fat",
        "keyNutrients": []
      },
      "simpleSummary": "High sugar drink — best enjoyed rarely.",
      "isFallback": false
    },
    "personalization": {
      "hasHealthProfile": true,
      "consideredFactors": ["Diabetes management", "Blood pressure control"],
      "personalizedFor": [
        "Type 2 diabetes (moderate severity)",
        "High blood pressure (mild severity)"
      ]
    },
    "timestamp": "2026-03-08T10:00:00.000Z",
    "isPersonalized": true,
    "isFallback": false
  }
}
```

#### Analysis fields

| Field | Type | Description |
|-------|------|-------------|
| `healthImpact` | string | `positive` \| `negative` \| `neutral` \| `caution` |
| `score` | number | 0–100 overall health score (higher = healthier) |
| `analysis` | string | 2-3 sentence readable summary |
| `recommendations` | string[] | Actionable advice |
| `warnings` | string[] | Health warnings |
| `benefits` | string[] | Health benefits |
| `nutritionalFacts.calories` | string | Plain English calorie description |
| `nutritionalFacts.macros` | string | Plain English macro breakdown |
| `nutritionalFacts.keyNutrients` | string[] | Notable nutrients |
| `simpleSummary` | string | One-line headline |
| `isFallback` | boolean | `true` if AI was unavailable and a fallback response was used |

#### When no health profile exists

```json
"personalization": {
  "hasHealthProfile": false,
  "message": "No health profile found. Analysis is general, not personalized.",
  "suggestion": "Create a health profile in your account settings for personalized food recommendations."
}
```

#### Error `400`

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "msg": "Search query is required", "path": "searchQuery" }
  ]
}
```

---

### `GET /api/search/history`

Get the authenticated user's search history.

**Access:** Private *(stub — returns empty array, full implementation pending)*

```json
{
  "success": true,
  "message": "Search history endpoint - authentication required",
  "history": []
}
```

---

### `GET /api/search/analytics`

Get search analytics for the authenticated user.

**Access:** Private *(stub)*

```json
{
  "success": true,
  "message": "Search analytics endpoint - authentication required",
  "analytics": {
    "totalSearches": 0,
    "trendingSearches": [],
    "healthImpactDistribution": {
      "positive": 0,
      "negative": 0,
      "neutral": 0,
      "caution": 0
    }
  }
}
```

---

### `GET /api/search/trending`

Get trending food searches (static list for now).

**Access:** Public

```json
{
  "success": true,
  "message": "Trending searches",
  "trending": [
    "organic apples",
    "quinoa salad",
    "greek yogurt",
    "avocado toast",
    "green smoothie"
  ]
}
```

---

## Frontend Integration Guide

### Initial setup

1. **Generate and persist a `deviceId`** on first app launch. Store it in `localStorage` (web) or device secure storage (mobile). Never regenerate it unless the user explicitly logs out and the device should be forgotten.

```js
// Web example
function getDeviceId() {
  let deviceId = localStorage.getItem('befree_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID(); // or use uuid library
    localStorage.setItem('befree_device_id', deviceId);
  }
  return deviceId;
}
```

2. **Store the JWT token** received from login/register. Store securely — `localStorage` for web, Keychain/Keystore for mobile.

### Login flow

```js
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    deviceId: getDeviceId()
  })
});

const data = await response.json();

if (data.success) {
  saveToken(data.token);               // store JWT
  setUser(data.user);                  // store user info
  setSessionExpiry(data.session.expiresAt); // optional: show session info

  if (data.session.isResumed) {
    // User's previous session was still active — welcome back silently
  } else {
    // Fresh login
  }
}
```

### Making authenticated requests

```js
async function apiFetch(path, options = {}) {
  const token = getToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    const body = await response.json();
    if (['SESSION_EXPIRED', 'SESSION_NOT_FOUND', 'SESSION_TERMINATED', 'UNAUTHORIZED'].includes(body.error)) {
      clearToken();
      redirectToLogin();
      return;
    }
  }

  return response.json();
}
```

### Session expiry handling

- On any `401` response, check the `error` field:
  - `SESSION_EXPIRED` → Tell user "You were logged out due to inactivity" → go to login
  - `SESSION_TERMINATED` → Tell user "Your session was ended" → go to login
  - `SESSION_NOT_FOUND` → Token is orphaned → go to login
  - `UNAUTHORIZED` → Generic token error → go to login
- **Do NOT silently retry** a failed 401 with the same token — it will fail again.
- Session auto-extends on every API call, so active users are never logged out.

### Startup check (auto-login)

When the app starts, check if a stored token still corresponds to a valid session:

```js
async function checkSession() {
  const token = getToken();
  if (!token) return false;

  // Make any lightweight authenticated call — auth middleware extends session
  const result = await apiFetch('/api/profile/health');

  if (result && result.success) {
    return true; // session still valid, user is logged in
  }

  return false; // session expired, show login
}
```

> Note: You can also use `GET /api/search/trending` (public) + a dedicated `/api/auth/me` endpoint (not yet implemented) for this check. For now, any protected endpoint call will validate and extend the session.

### Search flow

```js
const result = await apiFetch('/api/search/', {
  method: 'POST',
  body: JSON.stringify({
    searchQuery: 'Greek Yogurt',
    searchType: 'product_name'
  })
});

if (result.success) {
  const { analysis, personalization } = result.searchResult;

  // Color-code by healthImpact
  const colors = {
    positive: 'green',
    caution: 'yellow',
    negative: 'red',
    neutral: 'gray'
  };
  const color = colors[analysis.healthImpact];

  // Display score as 0-100 progress bar
  showScore(analysis.score);

  // Show personalization badge if personalized
  if (result.searchResult.isPersonalized) {
    showPersonalizedBadge(personalization.personalizedFor);
  }

  // Show fallback warning if AI was unavailable
  if (result.searchResult.isFallback) {
    showFallbackWarning();
  }
}
```

---

## CORS

Allowed origins:

| Environment | Origins |
|-------------|---------|
| Development | `http://localhost:3000–8080`, `http://127.0.0.1:3000–8080` |
| Production | `https://beta.befree.fit`, `https://api.befree.fit`, `https://admin.befree.fit` |

Allowed methods: `GET POST PUT DELETE OPTIONS PATCH`
Credentials: enabled (`Access-Control-Allow-Credentials: true`)

---

## Running the Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start

# With verbose debug logging
npm run dev:debug
```

Default port: `3000` (override with `PORT` env var)

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `development` / `staging` / `production` | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | — |
| `JWT_SECRET` | Secret for signing JWTs | — |
| `CORS_ORIGINS` | JSON array of allowed origins | localhost fallbacks |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Auth requests per window | `10` |
| `REGISTER_RATE_LIMIT_MAX` | Register requests per window | `20` |
| `MAX_FILE_SIZE` | Body parser size limit | `10mb` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `API_BASE_URL` | Public API URL | — |
| `FRONTEND_URL` | Frontend origin URL | — |
| `CLAUDE_API_KEY` | Anthropic API key | — |
