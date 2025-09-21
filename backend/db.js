// backend/db.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // --- THIS IS THE FIX ---
  // This configuration tells our application to allow the secure (SSL)
  // connection without rejecting it due to the certificate type.
  // This is a standard requirement for services like Aiven.
  ssl: {
    rejectUnauthorized: false
  }
});

// This part is for catching background errors, which is good to keep.
pool.on('error', (err, client) => {
  console.error('🔴 DATABASE POOL ERROR:', err);
  process.exit(-1);
});


module.exports = {
  query: (text, params) => pool.query(text, params),
};
