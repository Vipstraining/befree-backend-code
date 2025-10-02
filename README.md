# Food Catalog Backend API

A comprehensive Node.js backend API for a food catalog application that provides nutritional analysis using Claude AI. The system includes user authentication, profile management, and intelligent food product analysis with personalized recommendations.

## Features

### 🔐 Authentication Module
- User registration with email and username validation
- Secure login with JWT tokens
- Password hashing with bcrypt
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
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: Claude API
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get current user profile
- `PUT /password` - Update password
- `DELETE /deactivate` - Deactivate account

### Profile Management (`/api/profile`)
- `GET /` - Get user profile
- `PUT /` - Update complete profile
- `PUT /personal` - Update personal information
- `PUT /health` - Update health information
- `PUT /goals` - Update user goals
- `PUT /preferences` - Update preferences
- `GET /status` - Get profile completion status

### Search & Analysis (`/api/search`)
- `POST /` - Search and analyze product
- `GET /history` - Get search history
- `GET /analytics` - Get search analytics
- `GET /:searchId` - Get specific search details
- `POST /:searchId/feedback` - Provide feedback
- `GET /trending` - Get trending searches

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
   
   Update the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/food_catalog
   JWT_SECRET=your_jwt_secret_key_here
   CLAUDE_API_KEY=your_claude_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Database Schema

### Users Collection
- `username` (String, unique, required)
- `email` (String, unique, required)
- `password` (String, hashed, required)
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

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
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
```
BE1/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   ├── profileController.js
│   └── searchController.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── validation.js
├── models/
│   ├── User.js
│   ├── UserProfile.js
│   └── SearchHistory.js
├── routes/
│   ├── auth.js
│   ├── profile.js
│   └── search.js
├── services/
│   └── claudeService.js
├── utils/
│   ├── logger.js
│   └── response.js
├── logs/
├── server.js
├── package.json
└── README.md
```

### Logging

The application includes comprehensive logging:
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Debug logs: `logs/debug.log` (development only)

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

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
