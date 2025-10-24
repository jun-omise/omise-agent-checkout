/**
 * Database Initialization Script
 * Run this script to set up the database and create indexes
 */

import { config } from 'dotenv';
import { initializeDatabase, DatabaseConfig } from '../services/database.service.js';
import { UserProfileModel } from '../models/user-profile.model.js';
import { CheckoutSessionModel } from '../models/checkout-session.model.js';

// Load environment variables
config();

async function initDatabase() {
  console.log('🚀 Starting database initialization...\n');

  const dbType = (process.env.DB_TYPE || 'mongodb') as 'mongodb' | 'postgresql' | 'memory';

  const dbConfig: DatabaseConfig = {
    type: dbType,
    uri: process.env.DATABASE_URI,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME || 'omise_checkout',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {}
  };

  console.log(`Database Type: ${dbType}`);
  console.log(`Database Name: ${dbConfig.database}\n`);

  try {
    // Initialize and connect to database
    const db = initializeDatabase(dbConfig);
    await db.connect();

    console.log('\n📋 Creating indexes...\n');

    // Create indexes for user profiles
    const userProfileModel = new UserProfileModel();
    await userProfileModel.createIndexes();

    // Create indexes for checkout sessions
    const checkoutSessionModel = new CheckoutSessionModel();
    await checkoutSessionModel.createIndexes();

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\nYour database is ready to use.');

    // Disconnect
    await db.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Database initialization failed:',error.message);
    console.error('\nPlease check your database configuration and try again.');
    process.exit(1);
  }
}

// Run initialization
initDatabase();
