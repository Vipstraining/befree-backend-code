const mongoose = require('mongoose');
const { getConfig } = require('../config/environments');
const logger = require('../config/logger');

async function dropUsernameIndex() {
  try {
    const config = getConfig();
    const mongoUri = config.MONGODB_URI;
    
    logger.info('Connecting to database...', { uri: mongoUri ? 'configured' : 'not configured' });
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Database connected successfully');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Get all indexes
    const indexes = await collection.indexes();
    logger.info('Current indexes:', { indexes });
    
    // Check if username_1 index exists
    const usernameIndex = indexes.find(index => index.name === 'username_1');
    
    if (usernameIndex) {
      logger.info('Found username_1 index, dropping it...');
      await collection.dropIndex('username_1');
      logger.info('Successfully dropped username_1 index');
    } else {
      logger.info('username_1 index not found, nothing to drop');
    }
    
    // Verify indexes after drop
    const updatedIndexes = await collection.indexes();
    logger.info('Updated indexes:', { indexes: updatedIndexes });
    
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
    
  } catch (error) {
    logger.error(error, { context: 'drop_username_index' });
    process.exit(1);
  }
}

// Run the migration
dropUsernameIndex();



