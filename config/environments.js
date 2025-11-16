const path = require('path');

// Environment configuration
const environments = {
  development: {
    NODE_ENV: 'development',
    PORT: 3000,
    MONGODB_URI: 'mongodb+srv://befree_master:yEjXZEhIUCAn8ocF@lifecircle.k8sgfs4.mongodb.net/befree-sep?retryWrites=true&w=majority',
    DB_NAME: 'befree-sep',
    
    // API Endpoints
    API_BASE_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3000',
    
    // External APIs
    CLAUDE_API_BASE_URL: 'https://api.anthropic.com',
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || 'your_claude_api_key_here',
    CLAUDE_MODEL: 'claude-3-sonnet-20240229',
    
    // CORS Configuration
    CORS_ORIGINS: [
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
    ],
    
    // Rate Limiting (more lenient for dev)
    RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 1000,
    AUTH_RATE_LIMIT_MAX: 50,
    SEARCH_RATE_LIMIT_MAX: 200,
    
    // Logging
    LOG_LEVEL: 'debug',
    LOG_FILE: 'logs/dev.log',
    
    // Security (less strict for dev)
    JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production',
    JWT_EXPIRE: '7d',
    BCRYPT_ROUNDS: 10,
    
    // File Upload
    MAX_FILE_SIZE: '10mb',
    UPLOAD_PATH: 'uploads/dev',
    
    // Cache
    CACHE_TTL: 300, // 5 minutes
  },
  
  production: {
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: 'mongodb+srv://befree_master:yEjXZEhIUCAn8ocF@lifecircle.k8sgfs4.mongodb.net/befree-sep?retryWrites=true&w=majority',
    DB_NAME: 'befree-sep',
    
    // API Endpoints
    API_BASE_URL: process.env.API_BASE_URL || 'https://api.befree.fit',
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://beta.befree.fit',
    
    // External APIs
    CLAUDE_API_BASE_URL: 'https://api.anthropic.com',
    CLAUDE_MODEL: 'claude-3-sonnet-20240229',
    
    // CORS Configuration (restrictive for prod)
    CORS_ORIGINS: [
      process.env.FRONTEND_URL || 'https://beta.befree.fit',
      process.env.ADMIN_URL || 'https://admin.befree.fit'
    ],
    
    // Rate Limiting (strict for prod)
    RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100,
    AUTH_RATE_LIMIT_MAX: 10,
    SEARCH_RATE_LIMIT_MAX: 50,
    
    // Logging
    LOG_LEVEL: 'info',
    LOG_FILE: 'logs/prod.log',
    
    // Security (strict for prod)
    JWT_EXPIRE: '24h',
    BCRYPT_ROUNDS: 12,
    
    // File Upload
    MAX_FILE_SIZE: '5mb',
    UPLOAD_PATH: 'uploads/prod',
    
    // Cache
    CACHE_TTL: 3600, // 1 hour
  },
  
  staging: {
    NODE_ENV: 'staging',
    PORT: process.env.PORT || 3001,
    MONGODB_URI: 'mongodb+srv://befree_master:yEjXZEhIUCAn8ocF@lifecircle.k8sgfs4.mongodb.net/befree-sep?retryWrites=true&w=majority',
    DB_NAME: 'befree-sep-staging',
    
    // API Endpoints
    API_BASE_URL: process.env.API_BASE_URL || 'https://staging-api.befree.fit',
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://staging.befree.fit',
    
    // External APIs
    CLAUDE_API_BASE_URL: 'https://api.anthropic.com',
    CLAUDE_MODEL: 'claude-3-sonnet-20240229',
    
    // CORS Configuration
    CORS_ORIGINS: [
      'https://staging.befree.fit',
      'https://staging-api.befree.fit',
      'http://localhost:3000', // For testing
      'http://localhost:8000' // For testing
    ],
    
    // Rate Limiting (moderate for staging)
    RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 500,
    AUTH_RATE_LIMIT_MAX: 25,
    SEARCH_RATE_LIMIT_MAX: 100,
    
    // Logging
    LOG_LEVEL: 'info',
    LOG_FILE: 'logs/staging.log',
    
    // Security
    JWT_EXPIRE: '7d',
    BCRYPT_ROUNDS: 11,
    
    // File Upload
    MAX_FILE_SIZE: '8mb',
    UPLOAD_PATH: 'uploads/staging',
    
    // Cache
    CACHE_TTL: 1800, // 30 minutes
  }
};

// Get current environment
const getCurrentEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

// Get environment configuration
const getConfig = () => {
  const env = getCurrentEnvironment();
  const config = environments[env];
  
  if (!config) {
    throw new Error(`Environment '${env}' not found. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  
  // Override with environment variables if they exist
  const overrides = {};
  Object.keys(config).forEach(key => {
    if (process.env[key] !== undefined) {
      overrides[key] = process.env[key];
      console.log(`   Override ${key}: ${process.env[key] ? 'set' : 'not set'}`);
    }
  });
  
  console.log('🔍 Environment variables check:');
  console.log(`   process.env.JWT_SECRET: ${process.env.JWT_SECRET ? 'set' : 'not set'}`);
  console.log(`   process.env.CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? 'set' : 'not set'}`);
  
  const finalConfig = { ...config, ...overrides };
  
  // Debug: Log final configuration
  console.log('🔧 Final configuration:');
  console.log(`   NODE_ENV: ${finalConfig.NODE_ENV}`);
  console.log(`   JWT_SECRET: ${finalConfig.JWT_SECRET ? 'set' : 'not set'}`);
  console.log(`   CLAUDE_API_KEY: ${finalConfig.CLAUDE_API_KEY ? 'set' : 'not set'}`);
  console.log(`   MONGODB_URI: ${finalConfig.MONGODB_URI ? 'set' : 'not set'}`);
  
  return finalConfig;
};

// Validate required environment variables
const validateConfig = (config) => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'CLAUDE_API_KEY'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  getCurrentEnvironment,
  getConfig,
  validateConfig,
  environments
};
