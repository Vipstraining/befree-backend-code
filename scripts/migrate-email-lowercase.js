/**
 * One-time migration: normalize all user emails to lowercase.
 *
 * Run with: node scripts/migrate-email-lowercase.js
 *           OR: npm run migrate:email
 *
 * DO NOT run on server start — manual execution only.
 */

const { loadEnvironmentConfig } = require('../config/loadEnv');
loadEnvironmentConfig();

const mongoose = require('mongoose');
const { getConfig } = require('../config/environments');

async function migrate() {
  const config = getConfig();
  const mongoUri = config.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI is not configured. Aborting.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  // Find all users where email !== email.toLowerCase()
  const allUsers = await usersCollection.find({}, { projection: { _id: 1, email: 1 } }).toArray();
  const affected = allUsers.filter(u => u.email && u.email !== u.email.toLowerCase());

  console.log(`Total users: ${allUsers.length}`);
  console.log(`Users with mixed-case emails: ${affected.length}`);

  if (affected.length === 0) {
    console.log('No migration needed. All emails are already lowercase.');
    await mongoose.disconnect();
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const user of affected) {
    const normalizedEmail = user.email.toLowerCase();
    try {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { email: normalizedEmail } }
      );
      console.log(`  Updated: ${user.email} → ${normalizedEmail}`);
      successCount++;
    } catch (err) {
      // Could be a unique index conflict if a lowercase version already exists
      console.error(`  Failed to update ${user.email}: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\nMigration complete.');
  console.log(`  Updated: ${successCount}`);
  console.log(`  Errors:  ${errorCount}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
