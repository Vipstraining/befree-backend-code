/**
 * Ensure all required MongoDB indexes exist.
 *
 * Run with: node scripts/ensure-indexes.js
 *           OR: npm run db:indexes
 */

const { loadEnvironmentConfig } = require('../config/loadEnv');
loadEnvironmentConfig();

const mongoose = require('mongoose');
const { getConfig } = require('../config/environments');

async function ensureIndexes() {
  const config = getConfig();
  const mongoUri = config.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI is not configured. Aborting.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  // ──────────────────────────────────────────────
  // User collection indexes
  // ──────────────────────────────────────────────
  const users = db.collection('users');
  console.log('--- users ---');

  await users.createIndex(
    { email: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 }, name: 'email_unique_ci' }
  );
  console.log('  email (unique, case-insensitive)   ✓');

  // ──────────────────────────────────────────────
  // Session collection indexes
  // ──────────────────────────────────────────────
  const sessions = db.collection('sessions');
  console.log('\n--- sessions ---');

  await sessions.createIndex(
    { userId: 1, deviceId: 1 },
    { unique: true, name: 'userId_deviceId_unique' }
  );
  console.log('  { userId, deviceId } (unique compound)   ✓');

  await sessions.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
  );
  console.log('  expiresAt (TTL)   ✓');

  // Verify TTL index exists
  const sessionIndexes = await sessions.listIndexes().toArray();
  const ttlIndex = sessionIndexes.find(i => i.expireAfterSeconds !== undefined);
  if (!ttlIndex) {
    console.warn('  WARNING: TTL index on sessions.expiresAt was not found after creation.');
  }

  // ──────────────────────────────────────────────
  // SearchHistory collection indexes
  // ──────────────────────────────────────────────
  const searchHistory = db.collection('searchhistories');
  console.log('\n--- searchhistories ---');

  await searchHistory.createIndex(
    { userId: 1, createdAt: -1 },
    { name: 'userId_createdAt' }
  );
  console.log('  { userId, createdAt } (history query)   ✓');

  await searchHistory.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 7776000, name: 'createdAt_ttl_90d' }
  );
  console.log('  createdAt (TTL 90 days)   ✓');

  console.log('\nAll indexes verified successfully.');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

ensureIndexes().catch(err => {
  console.error('ensure-indexes failed:', err.message);
  process.exit(1);
});
