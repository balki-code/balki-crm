// backend/minimal-server.js

const express = require('express');
const app = express();
const port = 8080; // Changed from 5000 to 8080

app.get('/', (req, res) => {
  res.send('The minimal server is working on port 8080!');
});

app.listen(port, () => {
  console.log(`✅ Minimal server is running on port ${port}. This message should stay on screen.`);
});
