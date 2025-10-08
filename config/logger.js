const fs = require('fs');
const path = require('path');
const { getConfig } = require('./environments');

// Ensure logs directory exists
const ensureLogsDir = () => {
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
};

// Create logger configuration
const createLogger = () => {
  const config = getConfig();
  const logsDir = ensureLogsDir();
  const logFileName = config.LOG_FILE || 'app.log';
  const logFile = path.join(logsDir, path.basename(logFileName));
  
  // Log levels
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  
  const currentLevel = levels[config.LOG_LEVEL] || levels.info;
  
  // Color codes for console output
  const colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[37m', // White
    reset: '\x1b[0m'   // Reset
  };
  
  // Format timestamp
  const formatTimestamp = () => {
    return new Date().toISOString();
  };
  
  // Format log message
  const formatMessage = (level, message, meta = {}) => {
    const timestamp = formatTimestamp();
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  };
  
  // Write to file
  const writeToFile = (message) => {
    try {
      fs.appendFileSync(logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  };
  
  // Write to console
  const writeToConsole = (level, message) => {
    const color = colors[level] || colors.reset;
    console.log(`${color}${message}${colors.reset}`);
  };
  
  // Main logging function
  const log = (level, message, meta = {}) => {
    if (levels[level] <= currentLevel) {
      const formattedMessage = formatMessage(level, message, meta);
      
      // Always write to console in development
      if (config.NODE_ENV === 'development') {
        writeToConsole(level, formattedMessage);
      }
      
      // Write to file if not debug level or if explicitly enabled
      if (level !== 'debug' || config.LOG_LEVEL === 'debug') {
        writeToFile(formattedMessage);
      }
    }
  };
  
  return {
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    info: (message, meta) => log('info', message, meta),
    debug: (message, meta) => log('debug', message, meta),
    
    // Special logging functions
    request: (req, res, responseTime) => {
      const meta = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        origin: req.get('Origin'),
        referer: req.get('Referer'),
        headers: {
          'content-type': req.get('Content-Type'),
          'authorization': req.get('Authorization') ? 'Bearer [REDACTED]' : 'none',
          'accept': req.get('Accept')
        }
      };
      log('info', `${req.method} ${req.url} - ${res.statusCode}`, meta);
    },
    
    database: (operation, collection, duration, meta = {}) => {
      log('debug', `DB ${operation} on ${collection}`, {
        ...meta,
        duration: `${duration}ms`
      });
    },
    
    api: (service, endpoint, status, duration, meta = {}) => {
      log('info', `API ${service} ${endpoint} - ${status}`, {
        ...meta,
        duration: `${duration}ms`
      });
    },
    
    auth: (action, userId, success, meta = {}) => {
      const level = success ? 'info' : 'warn';
      log(level, `Auth ${action}`, {
        userId,
        success,
        ...meta
      });
    },
    
    error: (error, context = {}) => {
      log('error', error.message, {
        stack: error.stack,
        ...context
      });
    }
  };
};

// Create singleton logger instance
const logger = createLogger();

module.exports = logger;
