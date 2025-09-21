// backend/test-db.js

require('dotenv').config();
const { Pool } = require('pg');

console.log('--- Starting Database Connection Test ---');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('🔴 ERROR: DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

console.log('✅ DATABASE_URL loaded successfully.');

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Add a timeout to prevent the script from hanging indefinitely
  connectionTimeoutMillis: 15000, // 15 seconds
});

async function runTest() {
  let client;
  try {
    console.log('Attempting to connect to the database... (This may take a few seconds)');
    client = await pool.connect();
    console.log('✅ SUCCESS: Database connection established!');
    
    const result = await client.query('SELECT NOW()');
    console.log('🕒 Current time from the database is:', result.rows[0].now);
    
  } catch (err) {
    console.error('\n🔴 FAILED TO CONNECT TO DATABASE. Error details below:');
    console.error(err);
    
  } finally {
    // Ensure the client and pool are closed to allow the script to exit
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('\n--- Test Finished ---');
  }
}

runTest();