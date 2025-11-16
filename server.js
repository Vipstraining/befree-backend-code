const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Load environment configuration
const { loadEnvironmentConfig } = require('./config/loadEnv');
const { getConfig, validateConfig } = require('./config/environments');
const { getEndpoints } = require('./config/endpoints');

// Load environment-specific configuration FIRST
const env = loadEnvironmentConfig();

// Now get the configuration after env vars are loaded
const config = getConfig();
const endpoints = getEndpoints(env);
const logger = require('./config/logger');

// Validate configuration
try {
  validateConfig(config);
  logger.info('Configuration loaded successfully', { environment: config.NODE_ENV });
} catch (error) {
  logger.error(error, { environment: config.NODE_ENV });
  process.exit(1);
}

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const healthRoutes = require('./routes/health');

// Import middleware
const { apiLimiter, authLimiter, searchLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Connect to database
logger.info('Connecting to database...');
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration with debugging
let corsOrigins = [];

// Load CORS origins from config
if (config.CORS_ORIGINS && Array.isArray(config.CORS_ORIGINS)) {
  corsOrigins = [...config.CORS_ORIGINS];
  logger.info('Loaded CORS origins from config', { origins: corsOrigins });
} else {
      // Fallback to default localhost origins
      corsOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8000',
        'http://localhost:8001',
        'http://localhost:8080',
        'http://localhost:5000',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8000',
        'http://127.0.0.1:8001',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:4000',
        'file://'
      ];
  logger.warn('Using fallback CORS origins', { origins: corsOrigins });
}

// Always ensure production domains are included for production environment
if (config.NODE_ENV === 'production') {
  const productionOrigins = [
    'https://beta.befree.fit',
    'https://api.befree.fit',
    'https://admin.befree.fit'
  ];
  
  // Add production origins if not already present
  productionOrigins.forEach(origin => {
    if (!corsOrigins.includes(origin)) {
      corsOrigins.push(origin);
    }
  });
  
  logger.info('Added production CORS origins', { 
    environment: config.NODE_ENV,
    productionOrigins,
    finalOrigins: corsOrigins 
  });
}

// Additional safety: Always include beta.befree.fit for production
if (config.NODE_ENV === 'production' && !corsOrigins.includes('https://beta.befree.fit')) {
  corsOrigins.push('https://beta.befree.fit');
  logger.warn('Force added beta.befree.fit to CORS origins', { finalOrigins: corsOrigins });
}

// EMERGENCY FIX: Always include production domains regardless of environment detection
// This ensures CORS works even if environment detection fails
const emergencyProductionOrigins = [
  'https://beta.befree.fit',
  'https://api.befree.fit',
  'https://admin.befree.fit'
];

emergencyProductionOrigins.forEach(origin => {
  if (!corsOrigins.includes(origin)) {
    corsOrigins.push(origin);
    logger.warn(`Emergency: Added ${origin} to CORS origins`, { finalOrigins: corsOrigins });
  }
});

logger.info('CORS configuration', {
  allowedOrigins: corsOrigins,
  environment: config.NODE_ENV,
  processEnvNodeEnv: process.env.NODE_ENV,
  configCorsOrigins: config.CORS_ORIGINS,
  configKeys: Object.keys(config)
});

// Debug: Log environment detection
logger.warn('Environment Debug', {
  'process.env.NODE_ENV': process.env.NODE_ENV,
  'config.NODE_ENV': config.NODE_ENV,
  'corsOrigins.length': corsOrigins.length,
  'corsOrigins': corsOrigins
});

app.use(cors({
  origin: (origin, callback) => {
    // Log CORS requests
    logger.debug('CORS request', {
      origin,
      allowedOrigins: corsOrigins,
      isAllowed: !origin || corsOrigins.includes(origin)
    });
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      logger.info('CORS allowed', { origin });
      return callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin, allowedOrigins: corsOrigins });
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'Referer',
    'User-Agent'
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Handle CORS preflight requests
app.options('*', cors());

// Specific OPTIONS handler for auth routes
app.options('/api/auth/*', cors());

// Body parsing middleware
app.use(express.json({ limit: config.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_FILE_SIZE || '10mb' }));

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log detailed request
  logger.debug('Incoming request', {
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer [REDACTED]' : 'none',
      'origin': req.get('Origin'),
      'referer': req.get('Referer'),
      'user-agent': req.get('User-Agent'),
      'accept': req.get('Accept')
    },
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });
  
  // Capture response body
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody = null;
  
  res.send = function(body) {
    responseBody = body;
    return originalSend.call(this, body);
  };
  
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log detailed response
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${duration}ms`,
      responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
      responseBody: responseBody,
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Rate limiting
app.use('/api/', apiLimiter);
// Auth routes - stricter rate limiting (register has its own limiter in routes file)
app.use('/api/auth/', (req, res, next) => {
  // Skip rate limiting for register route (it has its own limiter)
  if (req.path === '/register') {
    return next();
  }
  return authLimiter(req, res, next);
});
app.use('/api/search/', searchLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested', { ip: req.ip });
  
  const healthData = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    endpoints: endpoints.current.api,
    config: {
      cors: config.CORS_ORIGINS,
      rateLimit: {
        window: config.RATE_LIMIT_WINDOW_MS,
        max: config.RATE_LIMIT_MAX_REQUESTS
      },
      database: {
        connected: true, // This will be updated by database connection
        uri: config.MONGODB_URI ? 'configured' : 'not configured'
      }
    }
  };
  
  res.json(healthData);
});

// Test endpoint for frontend development
app.get('/api/test', (req, res) => {
  logger.info('Test endpoint accessed', { ip: req.ip, userAgent: req.get('User-Agent') });
  
  res.json({
    success: true,
    message: 'API is working correctly',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    cors: {
      origin: req.get('Origin') || 'no origin header',
      allowed: config.CORS_ORIGINS
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      ip: req.ip
    }
  });
});

// API routes with CORS support
app.use('/api/auth', cors(), authRoutes);
app.use('/api/profile', cors(), profileRoutes);
app.use('/api/search', cors(), searchRoutes);
app.use('/api/profile/health', cors(), healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Befree Food Catalog API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    endpoints: endpoints.current.api,
    frontend: endpoints.current.frontend,
    documentation: {
      swagger: `${config.API_BASE_URL}/api-docs`,
      postman: `${config.API_BASE_URL}/api-docs/postman`
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  logger.error(error, {
    context: 'express_error_handler',
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Call the original error handler
  errorHandler(error, req, res, next);
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: config.NODE_ENV,
    apiBaseUrl: config.API_BASE_URL,
    frontendUrl: config.FRONTEND_URL,
    corsOrigins: corsOrigins,
    uploadPath: config.UPLOAD_PATH,
    logLevel: config.LOG_LEVEL
  });
  
  // Console output for development
  if (config.NODE_ENV === 'development') {
    console.log('\n🚀 ===========================================');
    console.log(`   Befree API Server Started Successfully`);
    console.log('🚀 ===========================================');
    console.log(`📊 Environment: ${config.NODE_ENV}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🔗 API Base URL: ${config.API_BASE_URL}`);
    console.log(`🎯 Frontend URL: ${config.FRONTEND_URL}`);
    console.log(`📁 Upload Path: ${config.UPLOAD_PATH}`);
    console.log(`🔒 CORS Origins: ${corsOrigins.join(', ')}`);
    console.log(`📝 Log Level: ${config.LOG_LEVEL}`);
    console.log('🚀 ===========================================\n');
    console.log('📋 Available Endpoints:');
    console.log(`   GET  /health          - Health check`);
    console.log(`   GET  /api/test        - Test endpoint`);
    console.log(`   GET  /api/auth/*      - Authentication routes`);
    console.log(`   GET  /api/profile/*   - Profile routes`);
    console.log(`   GET  /api/search/*    - Search routes`);
    console.log('🚀 ===========================================\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(error, { context: 'uncaught_exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(new Error(`Unhandled Rejection at: ${promise}, reason: ${reason}`), { 
    context: 'unhandled_rejection' 
  });
});

module.exports = app;
