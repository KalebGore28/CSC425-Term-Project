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

  // Update a community post
  app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    db.run(`UPDATE Community_Posts SET content = ? WHERE post_id = ?`, [content, id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Post updated successfully' });
    });
  });

  // Delete a community post
  app.delete('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM Community_Posts WHERE post_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Post deleted successfully' });
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

  // Edit event information
  app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { venue_id, organizer_id, name, description, event_date } = req.body;
    db.run(`UPDATE Events SET venue_id = ?, organizer_id = ?, name = ?, description = ?, event_date = ? WHERE event_id = ?`,
      [venue_id, organizer_id, name, description, event_date, id],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ message: 'Event updated successfully' });
      });
  });

  // Delete an event
  app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM Events WHERE event_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Event deleted successfully' });
    });
  });

// --- INVITATIONS ENDPOINTS ---

  // Get all invitations for an event
  app.get('/api/events/:event_id/invitations', (req, res) => {
    const { event_id } = req.params;
    db.all(`SELECT * FROM Invitations WHERE event_id = ?`, [event_id], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ data: rows });
    });
  });

  // Add a new invitation
  app.post('/api/invitations', (req, res) => {
    const { event_id, guest_id, email, status } = req.body;
    db.run(`INSERT INTO Invitations (event_id, email, status) VALUES (?, ?, ?, ?)`,
      [event_id, guest_id, email, status],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ invitation_id: this.lastID });
      });
  });

  // Update an invitation
  app.put('/api/invitations/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.run(`UPDATE Invitations SET status = ? WHERE invitation_id = ?`, [status, id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Invitation updated successfully' });
    });
  });

  // Delete an invitation
  app.delete('/api/invitations/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM Invitations WHERE invitation_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Invitation deleted successfully' });
    });
  });


// --- NOTIFICATIONS ENDPOINTS ---

  // Get all notifications for a user
  app.get('/api/users/:user_id/notifications', (req, res) => {
    const { user_id } = req.params;
    db.all(`SELECT * FROM Notifications WHERE user_id = ?`, [user_id], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ data: rows });
    });
  });

  // Add a new notification
  app.post('/api/notifications', (req, res) => {
    const { user_id, event_id, message } = req.body;
    db.run(`INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
      [user_id, event_id, message],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ notification_id: this.lastID });
      });
  });

  // Update a notification
  app.put('/api/notifications/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.run(`UPDATE Notifications SET status = ? WHERE notification_id = ?`, [status, id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Notification updated successfully' });
    });
  });

  // Delete a notification
  app.delete('/api/notifications/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM Notifications WHERE notification_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Notification deleted successfully' });
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

  // Update an RSVP
  app.put('/api/rsvps/:id', (req, res) => {
    const { id } = req.params;
    const { status, guest_count } = req.body;
    db.run(`UPDATE RSVPs SET status = ?, guest_count = ? WHERE rsvp_id = ?`, [status, guest_count, id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'RSVP updated successfully' });
    });
  });

  // Delete an RSVP
  app.delete('/api/rsvps/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM RSVPs WHERE rsvp_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'RSVP deleted successfully' });
    });
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

  // Edit venue information
  app.put('/api/venues/:id', (req, res) => {
    const { id } = req.params;
    const { name, location, description, capacity, price, available_dates } = req.body;
    db.run(`UPDATE Venues SET name = ?, location = ?, description = ?, capacity = ?, price = ?, available_dates = ? WHERE venue_id = ?`,
      [name, location, description, capacity, price, available_dates, id],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ message: 'Venue updated successfully' });
      });
  });

  // Delete a venue
  app.delete('/api/venues/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM Venues WHERE venue_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Venue deleted successfully' });
    });
  });

// --- USER_VENUE_ROLES ENDPOINTS ---

  // Get all user_venue_roles
  app.get('/api/user_venue_roles', (req, res) => {
    db.all('SELECT * FROM User_Venue_Roles', [], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ data: rows });
    });
  });

  // Add a new user_venue_role
  app.post('/api/user_venue_roles', (req, res) => {
    const { user_id, venue_id, role, start_date, end_date } = req.body;
    db.run(`INSERT INTO User_Venue_Roles (user_id, venue_id, role, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
      [user_id, venue_id, role, start_date, end_date],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ user_venue_role_id: this.lastID });
      });
  });

  // Edit user_venue_role information
  app.put('/api/user_venue_roles/:id', (req, res) => {
    const { id } = req.params;
    const { user_id, venue_id, role, start_date, end_date } = req.body;
    db.run(`UPDATE User_Venue_Roles SET user_id = ?, venue_id = ?, role = ?, start_date = ?, end_date = ? WHERE user_venue_role_id = ?`,
      [user_id, venue_id, role, start_date, end_date, id],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ message: 'User_Venue_Role updated successfully' });
      });
  });

  // Delete a user_venue_role
  app.delete('/api/user_venue_roles/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM User_Venue_Roles WHERE user_venue_role_id = ?`, [id], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'User_Venue_Role deleted successfully' });
    });
  });

// --- END OF ENDPOINTS ---


// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
})