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
const mongoose = require('mongoose');
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

// Request logging middleware with detailed logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Attach request ID for tracking
  req.requestId = requestId;
  
  // Sanitize request body (remove sensitive data for logging)
  const sanitizeBody = (body) => {
    if (!body) return undefined;
    const sanitized = { ...body };
    
    // Redact sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  };
  
  // Log detailed incoming request
  logger.info('📥 INCOMING REQUEST', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: {
      'content-type': req.get('Content-Type'),
      'content-length': req.get('Content-Length'),
      'authorization': req.get('Authorization') ? 'Bearer [TOKEN_PRESENT]' : 'none',
      'origin': req.get('Origin'),
      'referer': req.get('Referer'),
      'user-agent': req.get('User-Agent'),
      'accept': req.get('Accept'),
      'host': req.get('Host'),
      'connection': req.get('Connection')
    },
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
    ip: req.ip || req.connection.remoteAddress,
    protocol: req.protocol,
    secure: req.secure,
    xhr: req.xhr
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
    
    // Parse response body if it's a string
    let parsedResponseBody = responseBody;
    if (typeof responseBody === 'string') {
      try {
        parsedResponseBody = JSON.parse(responseBody);
      } catch (e) {
        parsedResponseBody = responseBody;
      }
    }
    
    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
    
    // Log detailed response
    const responseLog = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: `${duration}ms`,
      responseSize: responseBody ? JSON.stringify(responseBody).length : (chunk ? chunk.length : 0),
      responseHeaders: {
        'content-type': res.get('Content-Type'),
        'content-length': res.get('Content-Length')
      },
      responseBody: parsedResponseBody,
      userId: req.user ? req.user.id : undefined,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    logger[logLevel]('📤 OUTGOING RESPONSE', responseLog);
    
    // Performance warning for slow requests
    if (duration > 1000) {
      logger.warn('⚠️  SLOW REQUEST DETECTED', {
        requestId,
        url: req.url,
        duration: `${duration}ms`,
        threshold: '1000ms'
      });
    }
    
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
app.get('/health', async (req, res) => {
  logger.info('Health check requested', { ip: req.ip });

  // Check DB connectivity
  let dbStatus = 'disconnected';
  let dbPingMs = null;
  try {
    if (mongoose.connection.readyState === 1) {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - pingStart;
      dbStatus = 'connected';
    }
  } catch (pingErr) {
    dbStatus = 'error';
    logger.warn('Health check DB ping failed', { error: pingErr.message });
  }

  const memUsage = process.memoryUsage();
  const isHealthy = dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  const healthData = {
    success: isHealthy,
    message: isHealthy ? 'Server is running' : 'Server is degraded',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    services: {
      database: {
        status: dbStatus,
        pingMs: dbPingMs
      },
      claude: {
        status: process.env.CLAUDE_API_KEY ? 'configured' : 'not configured'
      }
    },
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 10) / 10,
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024 * 10) / 10,
      rssMB: Math.round(memUsage.rss / 1024 / 1024 * 10) / 10
    }
  };

  res.status(statusCode).json(healthData);
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

// Connect to database in background (non-blocking)
logger.info('Attempting to connect to database in background...');
connectDB()
  .then(() => {
    logger.info('✅ Database connected successfully');
  })
  .catch((error) => {
    logger.warn('⚠️  Database connection failed. Server will run without database.', {
      error: error.message,
      note: 'Authentication and data operations will not work until database is connected'
    });
  });

// Start server
const PORT = config.PORT || 3000;

const server = app.listen(PORT, () => {
  const jwtPresent = !!(process.env.JWT_SECRET);
  const claudePresent = !!(process.env.CLAUDE_API_KEY);

  logger.info('Server started successfully', {
    port: PORT,
    environment: config.NODE_ENV,
    apiBaseUrl: config.API_BASE_URL,
    frontendUrl: config.FRONTEND_URL,
    corsOrigins: corsOrigins,
    uploadPath: config.UPLOAD_PATH,
    logLevel: config.LOG_LEVEL,
    jwtSecretPresent: jwtPresent,
    claudeApiKeyPresent: claudePresent,
    rateLimitConfig: {
      generalApi: '100 req / 15 min',
      auth: '10 req / 15 min',
      register: '20 req / 15 min',
      search: '10 req / 1 min'
    }
  });

  if (!jwtPresent) {
    logger.warn('JWT_SECRET not set — using insecure default. Set JWT_SECRET in production.');
  }
  if (!claudePresent) {
    logger.warn('CLAUDE_API_KEY not set — AI search analysis will not work.');
  }

  // Console output for development
  if (config.NODE_ENV === 'development') {
    console.log('\n🚀 ===========================================');
    console.log(`   Befree API Server Started Successfully`);
    console.log('🚀 ===========================================');
    console.log(`📊 Environment:      ${config.NODE_ENV}`);
    console.log(`🌐 Port:             ${PORT}`);
    console.log(`🔗 API Base URL:     ${config.API_BASE_URL}`);
    console.log(`🎯 Frontend URL:     ${config.FRONTEND_URL}`);
    console.log(`📁 Upload Path:      ${config.UPLOAD_PATH}`);
    console.log(`🔒 CORS Origins:     ${corsOrigins.join(', ')}`);
    console.log(`📝 Log Level:        ${config.LOG_LEVEL}`);
    console.log(`🔑 JWT_SECRET:       ${jwtPresent ? 'present' : 'MISSING (using default)'}`);
    console.log(`🤖 CLAUDE_API_KEY:   ${claudePresent ? 'present' : 'MISSING'}`);
    console.log('🚀 ===========================================');
    console.log('⚡ Rate Limits:');
    console.log('   General API:  100 req / 15 min');
    console.log('   Auth:          10 req / 15 min');
    console.log('   Register:      20 req / 15 min');
    console.log('   Search:        10 req / 1 min');
    console.log('🚀 ===========================================');
    console.log('📋 Available Endpoints:');
    console.log('   GET    /health                  - Health check');
    console.log('   GET    /api/test                - Test endpoint');
    console.log('   POST   /api/auth/register       - Register');
    console.log('   POST   /api/auth/login          - Login');
    console.log('   GET    /api/auth/me             - Current user (private)');
    console.log('   POST   /api/auth/logout         - Logout (private)');
    console.log('   GET    /api/profile/            - User profile (private)');
    console.log('   PUT    /api/profile/            - Update profile (private)');
    console.log('   POST   /api/search/             - Product search (private)');
    console.log('   GET    /api/search/history      - Search history (private)');
    console.log('   GET    /api/search/analytics    - Analytics (private)');
    console.log('   GET    /api/search/trending     - Trending (public)');
    console.log('   GET    /api/profile/health      - Health profile (private)');
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
