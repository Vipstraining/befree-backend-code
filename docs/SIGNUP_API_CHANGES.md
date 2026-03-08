# Signup API Changes - Summary

**Date:** March 9, 2026  
**Version:** 2.0

## Overview

The signup API (`POST /api/auth/register`) has been updated with new field requirements and improved email handling.

---

## 🔄 Changes Made

### 1. **New Fields Added**

#### `firstName` (Required for username generation)
- Used to auto-generate username if `username` is not provided
- Stored in the user document
- Whitespace and special characters are stripped for username generation

#### `mobile` (Optional)
- Phone number field
- Can be blank, empty string, or omitted entirely
- Stored exactly as submitted in the database
- No validation applied (allows any format)

### 2. **Email Handling Changes**

#### Previous Behavior:
- Email was normalized (lowercased) before storage
- `User@Example.com` → stored as `user@example.com`

#### New Behavior:
- **Email is stored exactly as submitted** (preserves original casing)
- `User@Example.com` → stored as `User@Example.com`
- Duplicate checking is **case-insensitive** to prevent multiple accounts with different casing
- Login is also **case-insensitive** for better user experience

### 3. **Username Generation Updates**

#### Previous Logic:
- Generated from `name` (if provided) + email prefix + timestamp
- Example: `name="John Doe"` → `john_doe_john_12345678`

#### New Logic:
- Generated from `firstName` + timestamp only
- Simpler, cleaner usernames
- Example: `firstName="John"` → `john_12345678`
- If custom `username` provided: `username="alex_dev"` → `alex_dev_12345678`

### 4. **Response Changes**

The success response now includes the generated `username`:

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

---

## 📋 Updated Request Schema

### Required Fields
- ✅ `email` - Valid email address (stored as-is)
- ✅ `password` - Minimum 6 characters
- ✅ `deviceId` - Device identifier (1-200 chars)
- ✅ `firstName` - Required if `username` not provided

### Optional Fields
- ⚪ `mobile` - Phone number (can be blank)
- ⚪ `username` - Custom username (timestamp will be appended)

### Example Request

```json
{
  "email": "Sarah.Johnson@Example.com",
  "password": "securePass123",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Sarah",
  "mobile": "+1-555-123-4567"
}
```

---

## 🔍 Technical Implementation Details

### Files Modified

1. **`models/User.js`**
   - Added `firstName` field
   - Added `mobile` field with default empty string
   - Removed `lowercase: true` from email field

2. **`routes/auth.js`**
   - Removed `.normalizeEmail()` from email validation
   - Updated email duplicate check to use case-insensitive regex
   - Updated username generation logic to use `firstName`
   - Added `mobile` field handling
   - Updated login email search to be case-insensitive

3. **`docs/API_DOCUMENTATION.md`**
   - Updated signup API documentation
   - Added comprehensive examples
   - Added error response examples
   - Clarified email handling behavior

4. **`README.md`**
   - Updated authentication module description
   - Updated database schema section
   - Updated API usage examples

---

## 🧪 Testing Scenarios

### Scenario 1: Registration with All Fields
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Test.User@Example.com",
    "password": "password123",
    "deviceId": "device-001",
    "firstName": "Test",
    "mobile": "+1234567890"
  }'
```

**Expected:**
- User created with email `Test.User@Example.com`
- Username: `test_17098765` (or similar timestamp)
- Mobile: `+1234567890`

### Scenario 2: Registration without Mobile
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123",
    "deviceId": "device-002",
    "firstName": "User"
  }'
```

**Expected:**
- User created successfully
- Mobile field stored as empty string

### Scenario 3: Registration with Blank Mobile
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "blank@test.com",
    "password": "password123",
    "deviceId": "device-003",
    "firstName": "Blank",
    "mobile": ""
  }'
```

**Expected:**
- User created successfully
- Mobile field stored as empty string

### Scenario 4: Email Case Sensitivity
```bash
# First registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "User@Example.com",
    "password": "password123",
    "deviceId": "device-004",
    "firstName": "User1"
  }'

# Second registration with different casing
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password456",
    "deviceId": "device-005",
    "firstName": "User2"
  }'
```

**Expected:**
- First registration: Success
- Second registration: Error - "User already exists with this email"

---

## ⚠️ Breaking Changes

### For Existing Clients

1. **`name` field is deprecated**
   - Use `firstName` instead
   - Old requests with `name` will not work for username generation

2. **Email normalization removed**
   - Previously: `User@Example.com` → `user@example.com`
   - Now: `User@Example.com` → `User@Example.com`
   - Clients should handle email display accordingly

3. **Username format changed**
   - Previously: Could include email prefix
   - Now: Only firstName + timestamp

### Migration Notes

**For existing users:** No migration needed. Existing users retain their current email format and usernames.

**For new registrations:** All new users will follow the new schema and rules.

---

## 📚 Related Documentation

- [Full API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [API Response Contract](./API_RESPONSE_CONTRACT.md) - Response format standards
- [README](../README.md) - Project overview and setup

---

## ✅ Checklist for Integration

- [ ] Update frontend registration form to include `firstName` field
- [ ] Update frontend to optionally include `mobile` field
- [ ] Remove `name` field from registration requests
- [ ] Update email display logic (emails now preserve casing)
- [ ] Update tests to match new request/response format
- [ ] Verify deviceId is being sent with all auth requests
- [ ] Test username display with new format (firstName_timestamp)

---

## 🐛 Known Issues

None at this time.

---

## 📞 Support

For questions or issues, please refer to:
- API Documentation: `/docs/API_DOCUMENTATION.md`
- Create an issue in the project repository
