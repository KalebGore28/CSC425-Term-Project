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

// --- USERS ENDPOINTS ---

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM Users', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Add a new user
app.post('/api/users', (req, res) => {
  const { name, email, password } = req.body;
  db.run(`INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`, [name, email, password], function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ user_id: this.lastID });
  });
});

// Edit user information
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  db.run(`UPDATE Users SET name = ?, email = ?, password = ? WHERE user_id = ?`, [name, email, password, id], function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'User updated successfully' });
  });
});

// Delete a user
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Users WHERE user_id = ?`, [id], function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// --- VENUES ENDPOINTS ---

// Get all venues
app.get('/api/venues', (req, res) => {
  db.all('SELECT * FROM Venues', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Add a new venue
app.post('/api/venues', (req, res) => {
  const { name, location, description, capacity, price, available_dates } = req.body;
  db.run(`INSERT INTO Venues (name, location, description, capacity, price, available_dates) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, location, description, capacity, price, available_dates],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ venue_id: this.lastID });
    });
});

// --- EVENTS ENDPOINTS ---

// Get all events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM Events', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Add a new event
app.post('/api/events', (req, res) => {
  const { venue_id, organizer_id, name, description, event_date } = req.body;
  db.run(`INSERT INTO Events (venue_id, organizer_id, name, description, event_date) VALUES (?, ?, ?, ?, ?)`,
    [venue_id, organizer_id, name, description, event_date],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ event_id: this.lastID });
    });
});

// --- RSVPs ENDPOINTS ---

// Get all RSVPs for an event
app.get('/api/events/:event_id/rsvps', (req, res) => {
  const { event_id } = req.params;
  db.all(`SELECT * FROM RSVPs WHERE event_id = ?`, [event_id], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Add a new RSVP
app.post('/api/rsvps', (req, res) => {
  const { event_id, guest_id, status, guest_count } = req.body;
  db.run(`INSERT INTO RSVPs (event_id, guest_id, status, guest_count) VALUES (?, ?, ?, ?)`,
    [event_id, guest_id, status, guest_count],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ rsvp_id: this.lastID });
    });
});

// --- COMMUNITY POSTS ENDPOINTS ---

// Get all posts for an event community
app.get('/api/events/:event_id/posts', (req, res) => {
  const { event_id } = req.params;
  db.all(`SELECT * FROM Community_Posts WHERE event_id = ?`, [event_id], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Add a new community post
app.post('/api/posts', (req, res) => {
  const { event_id, user_id, content } = req.body;
  db.run(`INSERT INTO Community_Posts (event_id, user_id, content) VALUES (?, ?, ?)`,
    [event_id, user_id, content],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ post_id: this.lastID });
    });
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});