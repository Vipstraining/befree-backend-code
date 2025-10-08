const mongoose = require('mongoose');
const { getConfig } = require('./environments');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const config = getConfig();
    const mongoUri = config.MONGODB_URI;
    const dbName = config.DB_NAME;
    
    logger.info('Attempting database connection', { 
      uri: mongoUri ? 'configured' : 'not configured',
      dbName,
      environment: config.NODE_ENV 
    });
    
    const startTime = Date.now();
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const connectionTime = Date.now() - startTime;

    logger.info('Database connected successfully', {
      host: conn.connection.host,
      database: conn.connection.name,
      environment: config.NODE_ENV,
      connectionTime: `${connectionTime}ms`
    });
    
    // Log database events
    mongoose.connection.on('error', (error) => {
      logger.error(error, { context: 'database' });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('Database reconnected');
    });
    
    // Add database operation logging
    const originalQuery = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = function() {
      const start = Date.now();
      const collection = this.model.collection.name;
      const operation = this.op;
      
      logger.debug('Database query started', {
        collection,
        operation,
        filter: this.getFilter(),
        options: this.getOptions()
      });
      
      return originalQuery.apply(this, arguments).then(result => {
        const duration = Date.now() - start;
        logger.database(operation, collection, duration, {
          resultCount: Array.isArray(result) ? result.length : 1,
          success: true
        });
        return result;
      }).catch(error => {
        const duration = Date.now() - start;
        logger.error(error, {
          context: 'database_query',
          collection,
          operation,
          duration: `${duration}ms`,
          filter: this.getFilter()
        });
        throw error;
      });
    };
    
  } catch (error) {
    logger.error(error, { 
      context: 'database_connection',
      environment: config.NODE_ENV 
    });
    logger.warn('Server will continue without database connection for testing');
    // Don't exit the process, allow server to run without DB
  }
};

module.exports = connectDB;
