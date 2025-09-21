// backend/index.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const dbQueries = require('./queries');

const app = express();
const port = process.env.PORT || 8080; // Using port 8080 as we discovered

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API for Balki Enterprises' });
});

// Lead Management Endpoints
app.get('/api/leads', dbQueries.getLeads);
app.post('/api/leads', dbQueries.createLead);
app.put('/api/leads/:id', dbQueries.updateLead);
app.delete('/api/leads/:id', dbQueries.deleteLead);

// Payment Management Endpoints
app.put('/api/installments/:id', dbQueries.updateInstallmentStatus);

// --- NEW ANALYTICS ENDPOINT ---
app.get('/api/analytics', dbQueries.getAnalytics);


// Start the server
app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});