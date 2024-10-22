const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./mydb.sqlite', (err) => {
  if (err) {
	console.error('Error opening database:', err.message);
  } else {
	console.log('Connected to SQLite database');
  }
});

// Example API endpoint
app.get('/api/jobs', (req, res) => {
  db.all('SELECT * FROM jobs', [], (err, rows) => {
	if (err) {
	  res.status(400).json({ error: err.message });
	  return;
	}
	res.json({ data: rows });
  });
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});