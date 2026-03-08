# Signup API - Quick Reference

## 📝 Request Format

```bash
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "yourPassword",
  "deviceId": "device-uuid-123",
  "firstName": "John",
  "lastName": "Doe",
  "mobile": "+1234567890"
}
```

## 📋 Fields Reference

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `email` | ✅ Yes | String | Stored as-is (case preserved) |
| `password` | ✅ Yes | String | Min 6 chars |
| `deviceId` | ✅ Yes | String | 1-200 chars |
| `firstName` | ✅ Yes | String | 1-50 chars, used for auto-generated username |
| `lastName` | ✅ Yes | String | 1-50 chars |
| `mobile` | ❌ No | String | Can be blank/empty |

## ✅ Success Response (201)

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64abc123def456",
    "username": "john_12345678",
    "email": "user@example.com"
  },
  "session": {
    "id": "64session789xyz",
    "deviceId": "device-uuid-123",
    "expiresAt": "2026-03-13T00:00:00.000Z",
    "isResumed": false
  }
}
```

## ❌ Error Responses

### 400 - Validation Failed
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "path": "email", "msg": "Please provide a valid email" }
  ]
}
```

### 400 - Email Exists
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

### 400 - Missing firstName
```json
{
  "success": false,
  "message": "firstName is required to generate username"
}
```

## 🔑 Key Features

### Email Handling
- ✅ Stored exactly as submitted
- ✅ Case-insensitive duplicate check
- ✅ Case-insensitive login

**Example:**
- Submit: `User@Example.com`
- Stored: `User@Example.com`
- Can login with: `user@example.com` or `USER@EXAMPLE.COM`

### Username Generation
- **Auto-generated**: `firstName` + `_` + `random_timestamp`
- **Final length**: Max 30 characters
- **No custom usernames allowed**

**Examples:**
- `firstName="John"` → `john_17098765`
- `firstName="Mary Jane"` → `mary_jane_17098766`
- `firstName="José"` → `jos_17098767`

### Mobile Field
- Optional field
- Can be:
  - Omitted: Field not included in request
  - Empty: `"mobile": ""`
  - Populated: `"mobile": "+1234567890"`

## 📋 Integration Checklist

Frontend must send:
- ✅ `email` - User's email address
- ✅ `password` - User's password (min 6 chars)
- ✅ `deviceId` - Unique device identifier
- ✅ `firstName` - User's first name (1-50 chars)
- ✅ `lastName` - User's last name (1-50 chars)
- ⚪ `mobile` - User's phone number (optional)

Frontend should:
- ✅ Store `token` for authenticated requests
- ✅ Display `username` to user
- ✅ Store `session.expiresAt` for session management
- ✅ Use `user.id` for user identification

## 🔗 Full Documentation

For complete details, see:
- [API Documentation](./API_DOCUMENTATION.md)
- [Signup API Changes](./SIGNUP_API_CHANGES.md)
- [API Response Contract](./API_RESPONSE_CONTRACT.md)
