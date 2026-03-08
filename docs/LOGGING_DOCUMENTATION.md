# Logging Documentation

## Overview

The application implements comprehensive request/response logging with detailed tracking for debugging, monitoring, and audit purposes.

## Logging Features

### 1. **Request Logging** 📥

Every incoming request is logged with:
- Unique request ID for tracking
- Timestamp (ISO 8601)
- HTTP method and URL
- Query parameters and route params
- Request headers (with sensitive data redacted)
- Request body (with password/token fields redacted)
- Client IP address
- User agent
- Protocol information

### 2. **Response Logging** 📤

Every outgoing response is logged with:
- Request ID (matches incoming request)
- Timestamp
- HTTP status code and message
- Response time in milliseconds
- Response size in bytes
- Response headers
- Full response body
- User ID (if authenticated)

### 3. **Authentication Logging** 🔐

Detailed logging for authentication events:

#### Registration Events:
- `REGISTRATION ATTEMPT` - When user starts registration
- `REGISTRATION VALIDATION FAILED` - Invalid input data
- `REGISTRATION FAILED - EMAIL EXISTS` - Email already registered
- `USER CREATED` - User successfully created in database
- `SESSION CREATED` - Initial session created
- `REGISTRATION SUCCESSFUL` - Complete registration flow
- `REGISTRATION ERROR` - Server error during registration

#### Login Events:
- `LOGIN ATTEMPT` - When user attempts to login
- `LOGIN FAILED - NO EMAIL` - Email not provided
- `LOGIN FAILED - INVALID EMAIL FORMAT` - Invalid email format
- `LOGIN FAILED - NO DEVICE ID` - Device ID not provided
- `LOGIN FAILED - USER NOT FOUND` - No user with that email
- `LOGIN FAILED - ACCOUNT DEACTIVATED` - Account is inactive
- `LOGIN FAILED - NO PASSWORD` - Password not provided
- `LOGIN FAILED - INVALID PASSWORD` - Wrong password
- `PASSWORD VERIFIED` - Password matches
- `SESSION RESUMED` - Existing session extended
- `SESSION REACTIVATED` - Expired session reactivated
- `NEW SESSION CREATED` - New device session
- `LOGIN SUCCESSFUL` - Complete login flow
- `LOGIN ERROR` - Server error during login

### 4. **Performance Logging** ⚡

- Response time tracking for every request
- Slow request warnings (>1000ms threshold)
- Duration tracking for auth operations

### 5. **Log Levels**

The application uses 4 log levels:

- `ERROR` (0) - Critical errors and exceptions
- `WARN` (1) - Warning messages and failed operations
- `INFO` (2) - General information and successful operations
- `DEBUG` (3) - Detailed debug information

## Log Format

### Standard Log Entry

```
[2026-03-09T12:34:56.789Z] [INFO] Message text {"key":"value"}
```

### Request/Response Log Entry (Pretty-printed)

```
[2026-03-09T12:34:56.789Z] [INFO] 📥 INCOMING REQUEST
{
  "requestId": "1709987696789-abc123",
  "method": "POST",
  "url": "/api/auth/register",
  "body": {
    "email": "user@example.com",
    "firstName": "John",
    "password": "[REDACTED]"
  }
}
```

## Sensitive Data Handling

### Automatically Redacted Fields:
- `password` - Replaced with `[REDACTED]`
- `token` - Replaced with `[REDACTED]`
- `secret` - Replaced with `[REDACTED]`
- `apiKey` - Replaced with `[REDACTED]`
- `creditCard` - Replaced with `[REDACTED]`
- `ssn` - Replaced with `[REDACTED]`

### Header Redaction:
- `Authorization: Bearer xxx` → `Bearer [TOKEN_PRESENT]`

## Log File Location

Logs are written to:
```
logs/dev.log          # Development environment
logs/staging.log      # Staging environment
logs/prod.log         # Production environment
```

## Log Configuration

Configure logging via environment variables:

```env
LOG_LEVEL=debug          # debug, info, warn, error
LOG_FILE=logs/app.log    # Log file path
NODE_ENV=development     # Environment
```

## Example Log Outputs

### Example 1: Successful Registration

```
[2026-03-09T10:15:30.123Z] [INFO] 📥 INCOMING REQUEST
{
  "requestId": "1709982930123-xyz789",
  "method": "POST",
  "url": "/api/auth/register",
  "body": {
    "email": "john@example.com",
    "firstName": "John",
    "mobile": "+1234567890",
    "password": "[REDACTED]",
    "deviceId": "device-123"
  },
  "ip": "192.168.1.100"
}

[2026-03-09T10:15:30.125Z] [INFO] 🔐 REGISTRATION ATTEMPT
{
  "email": "john@example.com",
  "firstName": "John",
  "deviceId": "device-123",
  "hasMobile": true,
  "ip": "192.168.1.100"
}

[2026-03-09T10:15:30.450Z] [INFO] ✅ USER CREATED
{
  "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "username": "john_12345678",
  "email": "john@example.com",
  "firstName": "John",
  "hasMobile": true
}

[2026-03-09T10:15:30.475Z] [INFO] ✅ SESSION CREATED
{
  "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "sessionId": "65f1a2b3c4d5e6f7g8h9i0j2",
  "deviceId": "device-123",
  "expiresAt": "2026-03-14T10:15:30.000Z"
}

[2026-03-09T10:15:30.480Z] [INFO] ✅ REGISTRATION SUCCESSFUL
{
  "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "username": "john_12345678",
  "email": "john@example.com",
  "sessionId": "65f1a2b3c4d5e6f7g8h9i0j2",
  "duration": "357ms",
  "ip": "192.168.1.100"
}

[2026-03-09T10:15:30.485Z] [INFO] 📤 OUTGOING RESPONSE
{
  "requestId": "1709982930123-xyz789",
  "statusCode": 201,
  "responseTime": "362ms",
  "responseBody": {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "username": "john_12345678",
      "email": "john@example.com"
    }
  }
}
```

### Example 2: Failed Login Attempt

```
[2026-03-09T10:20:15.100Z] [INFO] 📥 INCOMING REQUEST
{
  "requestId": "1709983215100-abc456",
  "method": "POST",
  "url": "/api/auth/login"
}

[2026-03-09T10:20:15.102Z] [INFO] 🔐 LOGIN ATTEMPT
{
  "email": "user@example.com",
  "deviceId": "device-456",
  "ip": "192.168.1.101"
}

[2026-03-09T10:20:15.280Z] [WARN] ❌ LOGIN FAILED - INVALID PASSWORD
{
  "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "email": "user@example.com",
  "ip": "192.168.1.101"
}

[2026-03-09T10:20:15.285Z] [WARN] 📤 OUTGOING RESPONSE
{
  "requestId": "1709983215100-abc456",
  "statusCode": 401,
  "responseTime": "185ms",
  "responseBody": {
    "success": false,
    "message": "Email is valid and password is invalid"
  }
}
```

### Example 3: Slow Request Warning

```
[2026-03-09T10:25:00.500Z] [INFO] 📥 INCOMING REQUEST
{
  "requestId": "1709983500500-def789",
  "method": "POST",
  "url": "/api/search"
}

[2026-03-09T10:25:02.800Z] [INFO] 📤 OUTGOING RESPONSE
{
  "requestId": "1709983500500-def789",
  "statusCode": 200,
  "responseTime": "2300ms"
}

[2026-03-09T10:25:02.800Z] [WARN] ⚠️  SLOW REQUEST DETECTED
{
  "requestId": "1709983500500-def789",
  "url": "/api/search",
  "duration": "2300ms",
  "threshold": "1000ms"
}
```

## Monitoring and Debugging

### Tracking a Request

Use the `requestId` to track a request through the entire system:

```bash
# Find all logs for a specific request
grep "1709982930123-xyz789" logs/dev.log
```

### Monitoring Authentication

```bash
# View all registration attempts
grep "REGISTRATION ATTEMPT" logs/dev.log

# View failed logins
grep "LOGIN FAILED" logs/dev.log

# View successful operations
grep "✅" logs/dev.log
```

### Performance Analysis

```bash
# Find slow requests
grep "SLOW REQUEST" logs/dev.log

# View response times
grep "responseTime" logs/dev.log
```

## Best Practices

1. **Don't log sensitive data** - Passwords, tokens, and API keys are automatically redacted
2. **Use appropriate log levels** - DEBUG for development, INFO for production
3. **Monitor log file size** - Implement log rotation in production
4. **Track request IDs** - Use requestId for end-to-end request tracking
5. **Review logs regularly** - Monitor for errors and performance issues

## Integration with Monitoring Tools

The structured JSON logging format is compatible with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **DataDog**
- **CloudWatch**
- **New Relic**

## Log Rotation (Recommended for Production)

Install and configure log rotation:

```bash
npm install winston-daily-rotate-file
```

Configure in `config/logger.js` to rotate logs daily and keep for 14 days.

## Security Considerations

- ✅ Passwords are never logged
- ✅ JWT tokens are redacted
- ✅ API keys are never exposed
- ✅ User IP addresses are logged for security auditing
- ✅ Failed authentication attempts are tracked
- ✅ All sensitive headers are sanitized

## Compliance

The logging system helps with:
- **GDPR** - Audit trail of user data access
- **SOC 2** - Security event monitoring
- **HIPAA** - Access logging requirements
- **PCI DSS** - Authentication and access logging

---

**Last Updated:** March 9, 2026
