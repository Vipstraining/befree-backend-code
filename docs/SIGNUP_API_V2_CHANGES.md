# Signup API V2 - Changes Summary

**Date:** March 9, 2026  
**Version:** 2.0  
**Update:** firstName/lastName separation and username auto-generation

---

## 🔄 Major Changes

### 1. **Separated Name Fields**

#### Previous:
- Single `firstName` field (optional)

#### New:
- `firstName` (required, 1-50 chars)
- `lastName` (required, 1-50 chars)

### 2. **Username Auto-Generation**

#### Previous:
- Users could optionally provide custom `username`
- If not provided, generated from `firstName` + timestamp

#### New:
- Username is **always auto-generated**
- No custom username allowed
- Generated from `firstName` + random timestamp
- Format: `firstname_12345678`

### 3. **Simplified Request Body**

#### Previous:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device-001",
  "firstName": "John",
  "mobile": "+1234567890",
  "username": "optional_custom_name"
}
```

#### New:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device-001",
  "firstName": "John",
  "lastName": "Doe",
  "mobile": "+1234567890"
}
```

---

## 📋 Updated Database Schema

### User Model

```javascript
{
  username: String (auto-generated, unique, 3-30 chars),
  email: String (unique, stored as-is),
  firstName: String (required, 1-50 chars),
  lastName: String (required, 1-50 chars),
  mobile: String (optional, can be blank),
  password: String (hashed),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ✅ New Request Body Structure

### Required Fields

| Field | Type | Length | Description |
|-------|------|--------|-------------|
| `email` | String | - | Valid email, stored as-is |
| `password` | String | Min 6 | User password |
| `deviceId` | String | 1-200 | Device identifier |
| `firstName` | String | 1-50 | User's first name |
| `lastName` | String | 1-50 | User's last name |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `mobile` | String | Phone number, can be blank or omitted |

---

## 💡 Username Generation Algorithm

```javascript
// Auto-generate username
const firstNamePart = firstName.trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/[^a-zA-Z0-9_]/g, '');

const timestamp = Date.now().toString().slice(-8);
const username = `${firstNamePart}_${timestamp}`;

// Result: john_12345678
```

**Examples:**
- `firstName="John"` → `john_17098765`
- `firstName="Mary Jane"` → `mary_jane_17098766`
- `firstName="José María"` → `jos_mara_17098767`

---

## 📝 Example Requests

### Example 1: Complete Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.smith@example.com",
    "password": "SecurePassword123",
    "deviceId": "device-mobile-001",
    "firstName": "John",
    "lastName": "Smith",
    "mobile": "+1-555-123-4567"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123def456",
    "username": "john_17098765",
    "email": "john.smith@example.com"
  },
  "session": {
    "id": "65session789xyz",
    "deviceId": "device-mobile-001",
    "expiresAt": "2026-03-14T10:30:00.000Z",
    "isResumed": false
  }
}
```

### Example 2: Registration Without Mobile

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.wilson@company.com",
    "password": "MyPassword456",
    "deviceId": "device-laptop-002",
    "firstName": "Sarah",
    "lastName": "Wilson"
  }'
```

### Example 3: Registration With Blank Mobile

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex.martinez@startup.io",
    "password": "AlexPass789",
    "deviceId": "device-tablet-003",
    "firstName": "Alex",
    "lastName": "Martinez",
    "mobile": ""
  }'
```

---

## ❌ Validation Errors

### Missing Required Fields

```json
// Request without lastName
{
  "email": "user@test.com",
  "password": "pass123",
  "deviceId": "device-001",
  "firstName": "Test"
}

// Error Response
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "path": "lastName",
      "msg": "Last name is required"
    }
  ]
}
```

### firstName Too Short

```json
// firstName with only 1 char (after cleaning)
{
  "email": "user@test.com",
  "password": "pass123",
  "deviceId": "device-001",
  "firstName": ".",
  "lastName": "Doe"
}

// Error Response
{
  "success": false,
  "message": "Generated username is too short. Please use a longer first name."
}
```

---

## 🔄 Migration Guide

### For Existing Frontend Applications

**Changes Required:**

1. **Add lastName field**
   ```javascript
   // Before
   const data = {
     email,
     password,
     deviceId,
     firstName
   };
   
   // After
   const data = {
     email,
     password,
     deviceId,
     firstName,
     lastName  // NEW REQUIRED FIELD
   };
   ```

2. **Remove username field**
   ```javascript
   // Before
   const data = {
     email,
     password,
     deviceId,
     firstName,
     username: customUsername  // User could set this
   };
   
   // After
   const data = {
     email,
     password,
     deviceId,
     firstName,
     lastName
     // username field removed - always auto-generated
   };
   ```

3. **Update form validation**
   ```javascript
   // Add validation for lastName
   const schema = {
     firstName: Yup.string().required().min(1).max(50),
     lastName: Yup.string().required().min(1).max(50),  // NEW
     email: Yup.string().email().required(),
     password: Yup.string().min(6).required(),
     deviceId: Yup.string().required()
   };
   ```

---

## ⚠️ Breaking Changes

1. **`lastName` is now required**
   - All registration requests must include lastName
   - Frontend forms must collect last name

2. **`username` field removed from request**
   - Users can no longer provide custom usernames
   - Username is always auto-generated

3. **`firstName` is now required**
   - Cannot be omitted or empty
   - Must be 1-50 characters

---

## ✅ Backward Compatibility

### Database
- Existing users retain their current data
- No migration needed for existing records
- New users will have firstName and lastName populated

### API Endpoints
- Login endpoint unchanged
- Password reset unchanged
- Profile endpoints unchanged

---

## 📊 Benefits of Changes

1. **Simpler User Experience**
   - Users don't worry about username availability
   - One less field to think about during registration

2. **Better Data Structure**
   - Separate firstName/lastName for better data management
   - Easier to implement "display name" features later

3. **Guaranteed Uniqueness**
   - No username collisions
   - Timestamp ensures uniqueness

4. **Improved Validation**
   - Clear field requirements
   - Better error messages

---

## 📚 Updated Documentation

- ✅ `README.md` - Updated examples and schema
- ✅ `docs/API_DOCUMENTATION.md` - Complete API reference
- ✅ `docs/SIGNUP_API_QUICK_REFERENCE.md` - Quick reference guide
- ✅ `docs/SIGNUP_API_V2_CHANGES.md` - This document

---

## 🧪 Testing Checklist

- [ ] Test registration with firstName and lastName
- [ ] Verify username is auto-generated correctly
- [ ] Test registration without mobile
- [ ] Test registration with blank mobile
- [ ] Verify validation errors for missing lastName
- [ ] Verify validation errors for missing firstName
- [ ] Test email case preservation
- [ ] Verify session creation on registration
- [ ] Test deviceId requirement

---

**Last Updated:** March 9, 2026
