# Food Catalog Backend API

> **Picking this up fresh, or after a break? Read [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) first** — deployed branch/commit, known unresolved issues, and outstanding security items. This README covers the general shape of the project; that doc covers what's actually true right now.

A comprehensive Node.js backend API for a food catalog application that provides nutritional analysis using Claude AI. The system includes user authentication, profile management, and intelligent food product analysis with personalized recommendations.

## Features

### 🔐 Authentication Module
- User registration with email, firstName, and optional mobile
- Auto-generated unique usernames with timestamp suffix
- Email stored as-is (preserves original casing)
- Device-based session management with rolling expiration
- Secure login with JWT tokens
- Password hashing with bcrypt (12 rounds in production)
- Account deactivation

### 👤 Profile Management
- Comprehensive user profile creation
- Personal information (name, age, height, weight, activity level)
- Health information (allergies, medical conditions, dietary restrictions)
- Goal setting (weight management, health improvement)
- Preferences (cuisine types, cooking skills, budget)

### 🔍 Search & Analysis Module
- Product search by name or barcode
- Claude AI-powered nutritional analysis
- Personalized recommendations based on user profile
- Search history tracking and analytics
- Pattern analysis to detect potentially harmful combinations
- Feedback system for continuous improvement

### 📊 Monitoring & Analytics
- Search history tracking
- User analytics and insights
- Trending searches
- Health impact monitoring

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens), DB-backed sessions with rolling expiry
- **AI Integration**: Claude API
- **Email**: AWS SES (`@aws-sdk/client-ses`) — currently in sandbox mode, see
  `docs/CURRENT_STATE.md`
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Hosting**: AWS EC2, deployed manually via pm2 (no CI/CD)

## API Endpoints

**See `docs/CURRENT_STATE.md` for current deployment status of each endpoint below
(some are pushed but not yet deployed, one — `/api/profile/` — is a non-functional
stub). This list reflects what's actually in `routes/*.js`, not what any other doc
in this repo may say.**

### Authentication (`/api/auth`)
- `POST /register` - Register user, creates a session, returns a JWT
- `POST /login` - Login, resumes or creates a session for the calling device
- `GET /me` - Current user from token (auth required)
- `POST /logout` - Invalidate the current device's session (auth required)
- `PUT /push-token` - Register/clear this device's push token (auth required)
- `DELETE /account` - Permanently delete the account and all associated data (auth
  required) — see known issues in `docs/CURRENT_STATE.md` before relying on this
- `POST /forgot-password` - Email a 6-digit reset code, if the address has an account
- `POST /reset-password` - Consume the code, set a new password, invalidate all
  sessions for that account

### Profile (`/api/profile`)
- `GET /`, `PUT /` - **Non-functional stubs** — no auth, no real DB read/write,
  always return `profile: null`. Do not build against these.

### Health Profile (`/api/profile/health`)
- `POST /`, `GET /`, `PUT /`, `DELETE /` - Full nested health/allergy/dietary
  profile CRUD (auth required)
- `GET /summary` - Flattened summary used for AI search personalization (auth
  required)

### Search & Analysis (`/api/search`)
- `POST /` - Search and analyze a product (barcode/product_name/ingredients/general)
  (auth required)
- `GET /history` - Paginated search history (auth required)
- `GET /analytics` - Aggregated search analytics, cached 5min (auth required)
- `GET /trending` - Trending searches (public; currently a static list, not real
  usage data)

### Top-level
- `GET /` - API info
- `GET /health` - Server health check (DB connectivity, uptime, memory)
- `GET /api/test` - Test endpoint

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BE1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration. `MONGODB_URI`, `JWT_SECRET`, and
   `CLAUDE_API_KEY` are required — the app exits at startup if any is missing, with
   no hardcoded fallback:
   ```env
   MONGODB_URI=mongodb://localhost:27017/food_catalog
   JWT_SECRET=your_jwt_secret_key_here
   CLAUDE_API_KEY=your_claude_api_key_here
   PORT=3000
   NODE_ENV=development
   ```
   For forgot-password/reset-password to work, also set (see
   `services/emailService.js`):
   ```env
   AWS_REGION=us-east-1
   SES_FROM_ADDRESS=noreply@befree.fit
   # AWS credentials via IAM role or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
   # Temporary, while SES is in sandbox mode — see docs/CURRENT_STATE.md:
   SES_SANDBOX_TEST_RECIPIENT=
   ```
   **Never commit `.env`.** It is gitignored, but was tracked historically in this
   repo — see the Security section of `docs/CURRENT_STATE.md`.

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Database Schema

### Users Collection
- `username` (String, unique, required, auto-generated from firstName + timestamp)
- `email` (String, unique, required, stored as-is)
- `firstName` (String, required, 1-50 chars)
- `lastName` (String, required, 1-50 chars)
- `mobile` (String, optional, can be blank)
- `password` (String, hashed with bcrypt, required)
- `isActive` (Boolean, default: true)
- `lastLogin` (Date)
- `createdAt` (Date)
- `updatedAt` (Date)

### User Profiles Collection
- `userId` (ObjectId, ref: User)
- `personalInfo` (Object)
- `healthInfo` (Object)
- `goals` (Object)
- `preferences` (Object)
- `isComplete` (Boolean)

### Search History Collection
- `userId` (ObjectId, ref: User)
- `searchType` (String: barcode/product_name/ingredient)
- `searchQuery` (String)
- `barcode` (String)
- `productName` (String)
- `nutritionalAnalysis` (Object)
- `userContext` (Object)
- `searchMetadata` (Object)
- `feedback` (Object)

## Claude AI Integration

The system uses Claude AI to provide personalized nutritional analysis:

1. **Product Analysis**: Analyzes food products based on user profile
2. **Health Impact Assessment**: Determines positive/negative/neutral/caution impact
3. **Personalized Recommendations**: Provides specific advice for the user
4. **Pattern Analysis**: Monitors recent searches for potential health risks
5. **Allergy & Dietary Considerations**: Considers user's restrictions and conditions

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevents abuse and spam
- **Input Validation**: Comprehensive validation for all inputs
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: Security headers
- **Error Handling**: Secure error responses

## Rate Limiting

Defaults below (production config); most are overridable via env vars — see
`middleware/rateLimiter.js` for the exact current values.
- **General API**: 100 requests per 15 minutes
- **Authentication** (login, etc.): 10 requests per 15 minutes
- **Registration**: 20 requests per 15 minutes (separate, more lenient limiter)
- **Forgot-password**: 5 requests per 15 minutes per IP
- **Search**: 10 requests per minute

## Error Handling

The API provides consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

## Development

### Project Structure

This reflects the actual current layout — verify against the repo itself if it
drifts:
```
befree-backend-code/
├── config/
│   ├── database.js       # Mongo connection + a global query-logging wrapper
│   ├── environments.js   # per-environment config, secrets read from process.env only
│   ├── endpoints.js       # informational only — do not trust as a route source of truth
│   ├── logger.js
│   └── loadEnv.js
├── middleware/
│   ├── auth.js            # JWT + DB-session verification
│   ├── errorHandler.js
│   └── rateLimiter.js
├── models/
│   ├── User.js
│   ├── Session.js
│   ├── UserProfile.js
│   ├── HealthProfile.js
│   └── SearchHistory.js
├── routes/
│   ├── auth.js
│   ├── profile.js
│   ├── health.js          # mounted at /api/profile/health, not /api/health
│   └── search.js
├── services/
│   ├── claudeService.js
│   └── emailService.js    # AWS SES
├── docs/
│   └── CURRENT_STATE.md   # read this first — deployment status, known issues
├── logs/
├── server.js
├── package.json
└── README.md
```

### Logging

`config/logger.js` writes to `logs/<LOG_FILE>` (per environment config) and, since
a recent fix, always mirrors `error`/`warn` level logs to console/stdout regardless
of environment — `info`/`debug` still only reach console in development. This
matters for anyone debugging via `pm2 logs`: only error/warn show up there in
production, the rest is file-only.

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "John.Doe@Example.com",
    "password": "SecurePass123",
    "deviceId": "device-uuid-123",
    "firstName": "John",
    "lastName": "Doe",
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
    "email": "John.Doe@Example.com"
  },
  "session": {
    "id": "65session789xyz",
    "deviceId": "device-uuid-123",
    "expiresAt": "2026-03-14T12:30:00.000Z",
    "isResumed": false
  }
}
```

**Key Points:**
- Email is stored exactly as submitted (preserves casing)
- Username is auto-generated from `firstName` + random timestamp (e.g., `john_17098765`)
- Both `firstName` and `lastName` are required
- `mobile` field is optional and can be blank or omitted
- `deviceId` is required for session management
- Session expires after 120 hours of inactivity (rolling expiration)

### Search Product
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "searchQuery": "organic apples",
    "searchType": "product_name"
  }'
```

## Monitoring

The API includes several monitoring endpoints:
- `/health` - Health check
- `/api/search/analytics` - User search analytics
- `/api/search/trending` - Trending searches

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
