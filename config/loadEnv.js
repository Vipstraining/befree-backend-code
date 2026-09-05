const path = require('path');
const fs = require('fs');

// Load environment-specific .env file
const loadEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const envFile = path.join(__dirname, '..', `.env.${env}`);
  const defaultEnvFile = path.join(__dirname, '..', '.env');
  
  // Check if environment-specific file exists
  if (fs.existsSync(envFile)) {
    console.log(`📁 Loading environment config from: .env.${env}`);
    require('dotenv').config({ path: envFile });
  } else if (fs.existsSync(defaultEnvFile)) {
    console.log('📁 Loading default environment config from: .env');
    require('dotenv').config({ path: defaultEnvFile });
  } else {
    console.log('⚠️  No .env file found, using system environment variables');
  }
  
  // Debug: Log loaded environment variables
  console.log('🔍 Loaded environment variables:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   Actual file loaded: ${fs.existsSync(envFile) ? envFile : (fs.existsSync(defaultEnvFile) ? defaultEnvFile : 'NONE — using system env only')}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'set' : 'not set'}`);
  console.log(`   CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? 'set' : 'not set'}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'set' : 'not set'}`);
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'not set'}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'not set'}`);
  console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? `set (${process.env.SMTP_PASS.length} chars)` : 'not set'}`);

  return env;
};

module.exports = { loadEnvironmentConfig };
