const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

require('dotenv').config(); // Load environment variables from .env file

const secretKey = process.env.JWT_SECRET_KEY;
const saltRounds = 10; // Define the salt rounds for bcrypt

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Middleware to check for a valid JWT token
function authenticateToken(req, res, next) {
  const token = req.cookies.token;  // Retrieve the token from the HTTP-only cookie
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    req.user = user;  // Add user information to request object
    next();
  });
}

// Database setup
const db = new sqlite3.Database('./mydb.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    db.run("PRAGMA foreign_keys = ON");
  }
});

// --- COMMUNITY POSTS ENDPOINTS ---

// Get all posts for an event community
app.get('/api/events/:event_id/posts', (req, res) => {
  const { event_id } = req.params;
  db.all(`SELECT * FROM Community_Posts WHERE event_id = ?`, [event_id], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
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
        return res.status(400).json({ error: err.message });
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
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was updated
    if (this.changes === 0) {
      // No rows were affected, meaning the post with the given ID doesn't exist or no changes were made
      return res.status(400).json({ error: "Post not found or no changes made" });
    }

    res.json({ message: 'Post updated successfully' });
  });
});

// Delete a community post
app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Community_Posts WHERE post_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the post with the given ID doesn't exist
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: 'Post deleted successfully' });
  });
});

// --- EVENTS ENDPOINTS ---

// Get all events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM Events', [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
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
        return res.status(400).json({ error: err.message });
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
        return res.status(400).json({ error: err.message });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        // No rows were affected, meaning the event with the given ID doesn't exist or no changes were made
        return res.status(400).json({ error: "Event not found or no changes made" });
      }
      res.json({ message: 'Event updated successfully' });
    });
});

// Delete an event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Events WHERE event_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the event with the given ID doesn't exist
      return res.status(404).json({ error: "Event not found" });
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

app.post('/api/invitations', (req, res) => {
  const { event_id, email, status } = req.body;

  // Step 1: Retrieve the venue's capacity and current accepted invitations count
  db.get(`SELECT V.capacity, COUNT(I.invitation_id) AS accepted_count
            FROM Events AS E
            JOIN Venues AS V ON E.venue_id = V.venue_id
            LEFT JOIN Invitations AS I ON E.event_id = I.event_id AND I.status = 'Accepted'
            WHERE E.event_id = ?`, [event_id], (err, eventInfo) => {
    if (err) {
      return res.status(400).json({ error: "Error retrieving event and venue details" });
    }

    const { capacity, accepted_count } = eventInfo;

    // Check if the venue has reached its capacity
    if (status === 'Accepted' && accepted_count >= capacity) {
      return res.status(400).json({ error: "The venue has reached its maximum capacity. Cannot accept new invitation." });
    }

    // Step 2: Check if the user already exists
    db.get(`SELECT user_id FROM Users WHERE email = ?`, [email], (err, user) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      let userId = user ? user.user_id : null;

      // Step 3: If the user does not exist, create a new one
      if (!userId) {
        db.run(`INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
          ["Placeholder Name", email, "PlaceholderPassword"],
          function (err) {
            if (err) {
              return res.status(400).json({ error: err.message });
            }

            userId = this.lastID; // Newly created user_id

            // Proceed to create the invitation and notification with the new user_id
            createInvitation(userId);
          }
        );
      } else {
        // User exists, proceed to create the invitation and notification with the existing user_id
        createInvitation(userId);
      }
    });

    // Helper function to create the invitation and then the notification
    function createInvitation(userId) {
      db.run(`INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, ?)`,
        [event_id, userId, status],
        function (err) {
          if (err) {
            return res.status(400).json({ error: err.message });
          }

          const invitationId = this.lastID;

          // Create a notification for the user
          createNotification(userId, event_id, `You have been invited to event ID ${event_id}.`);

          // Respond with the invitation ID
          res.json({ invitation_id: invitationId });
        }
      );
    }

    // Helper function to create a notification
    function createNotification(userId, eventId, message) {
      db.run(`INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
        [userId, eventId, message],
        (err) => {
          if (err) {
            console.error(`Error creating notification for user_id ${userId}:`, err.message);
          } else {
            console.log(`Notification created for user_id ${userId}`);
          }
        }
      );
    }
  });
});

// Update an invitation
app.put('/api/invitations/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Step 1: Retrieve event_id and current invitation status
  db.get(`SELECT event_id, status AS current_status FROM Invitations WHERE invitation_id = ?`, [id], (err, invitation) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!invitation) {
      // If the invitation does not exist
      return res.status(404).json({ error: "Invitation not found" });
    }

    const { event_id, current_status } = invitation;

    // Step 2: If changing status to "Accepted", check venue capacity
    if (status === 'Accepted' && current_status !== 'Accepted') {
      db.get(`SELECT V.capacity, COUNT(I.invitation_id) AS accepted_count
                FROM Events AS E
                JOIN Venues AS V ON E.venue_id = V.venue_id
                LEFT JOIN Invitations AS I ON E.event_id = I.event_id AND I.status = 'Accepted'
                WHERE E.event_id = ?`, [event_id], (err, eventInfo) => {
        if (err) {
          return res.status(400).json({ error: "Error retrieving event and venue details" });
        }

        const { capacity, accepted_count } = eventInfo;

        // Check if venue has reached its capacity
        if (accepted_count >= capacity) {
          return res.status(400).json({ error: "The venue has reached its maximum capacity. Cannot accept new invitation." });
        }

        // Proceed with updating the invitation status
        updateInvitationStatus(id, status, res);
      });
    } else {
      // Proceed with updating the invitation if not accepting or already accepted
      updateInvitationStatus(id, status, res);
    }
  });

  // Helper function to update invitation status
  function updateInvitationStatus(id, status, res) {
    db.run(`UPDATE Invitations SET status = ? WHERE invitation_id = ?`, [status, id], function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        // No rows were affected, meaning the invitation with the given ID doesn't exist or no changes were made
        return res.status(400).json({ error: "Invitation not found or no changes made" });
      }

      res.json({ message: 'Invitation updated successfully' });
    });
  }
});

// Delete an invitation
app.delete('/api/invitations/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Invitations WHERE invitation_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the invitation with the given ID doesn't exist
      return res.status(404).json({ error: "Invitation not found" });
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
      return res.status(400).json({ error: err.message });
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
        return res.status(400).json({ error: err.message });
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
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was updated
    if (this.changes === 0) {
      // No rows were affected, meaning the notification with the given ID doesn't exist or no changes were made
      return res.status(400).json({ error: "Notification not found or no changes made" });
    }

    res.json({ message: 'Notification updated successfully' });
  });
});

// Delete a notification
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Notifications WHERE notification_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the notification with the given ID doesn't exist
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ message: 'Notification deleted successfully' });
  });
});

// --- USERS ENDPOINTS ---

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  // Check for missing fields
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields (name, email, password) are required." });
  }

  // Check if the name contains only letters and spaces
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return res.status(400).json({ error: "Name can only contain alphabetic characters and spaces." });
  }

  // Check if the email already exists in the database
  db.get(`SELECT email FROM Users WHERE email = ?`, [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Error checking email uniqueness" });
    }
    if (row) {
      return res.status(400).json({ error: "Email already registered. Please use a different email." });
    }

    // Hash the password
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: "Error hashing password" });
      }

      // Insert the user with the hashed password
      db.run(
        `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
        [name, email, hashedPassword],
        function (err) {
          if (err) {
            return res.status(500).json({ error: "User registration failed" });
          }
          res.status(201).json({ message: "User registered successfully", user_id: this.lastID });
        }
      );
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Check for missing fields
  if (!email || !password) {
    return res.status(400).json({ error: "Both email and password are required" });
  }

  // Retrieve the user by email
  db.get(`SELECT * FROM Users WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: "Error retrieving user" });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Compare the provided password with the stored hashed password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: "Error comparing passwords" });
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

      // Generate a JWT token
      const token = jwt.sign(
        { user_id: user.user_id, email: user.email },
        secretKey,
        { expiresIn: '1h' }
      );

      // Set the token as an HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,                    // Prevents JavaScript access
        secure: process.env.NODE_ENV === "production",  // Ensures HTTPS in production
        sameSite: "Strict",                 // Prevents CSRF attacks
        maxAge: 3600000                     // 1 hour expiration
      });

      // Send success response without token in JSON
      res.json({ message: "Login successful" });
    });
  });
});

// Logout (clear cookie)
app.post('/api/logout', authenticateToken, (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict"
  });
  res.json({ message: "Logged out successfully" });
});

// Get current user profile
app.get('/api/users/me', authenticateToken, (req, res) => {
  const userId = req.user.user_id;

  db.get(`SELECT user_id, name, email, created_at FROM Users WHERE user_id = ?`, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving user profile" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });
});

// Update current user profile
app.put('/api/users/me', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const { name, email } = req.body;

  // Check for missing fields
  if (!name || !email) {
    return res.status(400).json({ error: "Both name and email are required" });
  }

  // Check if the name contains only letters and spaces
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return res.status(400).json({ error: "Name can only contain alphabetic characters and spaces." });
  }

  db.run(`UPDATE Users SET name = ?, email = ? WHERE user_id = ?`, [name, email, userId], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: "Email already in use. Please choose a different email." });
      }
      return res.status(500).json({ error: "Error updating user profile" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "User not found or no changes made" });
    }
    res.json({ message: "User profile updated successfully" });
  });
});

// Change password
app.put('/api/users/me/password', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const { oldPassword, newPassword } = req.body;

  // Check for missing fields
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Both oldPassword and newPassword are required" });
  }

  db.get(`SELECT password FROM Users WHERE user_id = ?`, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving user information" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare old password with stored hash
    bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(400).json({ error: "Old password is incorrect" });
      }

      // Hash new password and update
      bcrypt.hash(newPassword, saltRounds, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ error: "Error hashing new password" });
        }

        db.run(`UPDATE Users SET password = ? WHERE user_id = ?`, [hashedPassword, userId], function (err) {
          if (err) {
            return res.status(500).json({ error: "Error updating password" });
          }
          res.json({ message: "Password updated successfully" });
        });
      });
    });
  });
});

// Delete user account
app.delete('/api/users/me', authenticateToken, (req, res) => {
  const userId = req.user.user_id;

  // Delete the user from the Users table
  db.run(`DELETE FROM Users WHERE user_id = ?`, [userId], function (err) {
    if (err) {
      return res.status(500).json({ error: "Error deleting user account" });
    }

    // Check if a user was actually deleted
    if (this.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Clear the authentication cookie upon successful deletion
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    });

    res.json({ message: "User account deleted successfully" });
  });
});

// --- VENUES ENDPOINTS ---

// Get all venues
app.get('/api/venues', (req, res) => {
  db.all('SELECT * FROM Venues', [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Create a new venue
app.post('/api/venues', authenticateToken, (req, res) => {
  const { name, location, description, capacity, price } = req.body;
  const owner_id = req.user.user_id; // Get user_id from the authenticated token

  // Validate required fields
  if (!name || !location || !description || !capacity || !price) {
    return res.status(400).json({ error: "All fields (name, location, description, capacity, price) are required." });
  }

  db.run(
    `INSERT INTO Venues (owner_id, name, location, description, capacity, price) VALUES (?, ?, ?, ?, ?, ?)`,
    [owner_id, name, location, description, capacity, price],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Error creating venue" });
      }
      res.status(201).json({ message: "Venue created successfully", venue_id: this.lastID });
    }
  );
});

// Update venue information
app.put('/api/venues/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;
  const { name, location, description, capacity, price } = req.body;

  // Check for missing required fields
  if (!name || !location) {
    return res.status(400).json({ error: "Both name and location are required." });
  }

  // Validate data types for other fields
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
    return res.status(400).json({ error: "Capacity must be a positive integer." });
  }
  if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
    return res.status(400).json({ error: "Price must be a positive number." });
  }

  // Check if the venue belongs to the authenticated user
  db.get(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving venue data." });
    }
    if (!row) {
      return res.status(404).json({ error: "Venue not found." });
    }
    if (row.owner_id !== userId) {
      return res.status(403).json({ error: "You do not have permission to update this venue." });
    }

    // Update the venue if ownership and validation pass
    db.run(
      `UPDATE Venues SET name = ?, location = ?, description = ?, capacity = ?, price = ? WHERE venue_id = ?`,
      [name, location, description, capacity, price, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Error updating venue." });
        }
        if (this.changes === 0) {
          return res.status(400).json({ error: "No changes made to the venue." });
        }
        res.json({ message: "Venue updated successfully" });
      }
    );
  });
});

// Delete a venue
app.delete('/api/venues/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;  // Retrieve user_id from the token

  // Check if the venue exists and belongs to the authenticated user
  db.get(`SELECT * FROM Venues WHERE venue_id = ? AND owner_id = ?`, [id, userId], (err, venue) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving venue information" });
    }
    if (!venue) {
      return res.status(404).json({ error: "Venue not found or unauthorized to delete" });
    }

    // Proceed to delete the venue
    db.run(`DELETE FROM Venues WHERE venue_id = ?`, [id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error deleting venue" });
      }

      // Confirm that the venue was deleted
      if (this.changes === 0) {
        return res.status(404).json({ error: "Venue not found" });
      }

      res.json({ message: 'Venue deleted successfully' });
    });
  });
});

// --- USER_VENUE_Rentals ENDPOINTS ---

// Get all user_venue_rentals
app.get('/api/venue_rentals', (req, res) => {
  db.all('SELECT * FROM Venue_Rentals', [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Import date handling utilities
const { eachDayOfInterval, parseISO, format, isBefore, isAfter, isEqual } = require('date-fns');

// Create a new venue rental
app.post('/api/venue_rentals', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const { venue_id, start_date, end_date } = req.body;

  // Regex to validate date format 'YYYY-MM-DD'
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({ error: "Dates must be in 'YYYY-MM-DD' format." });
  }

  // Existing parsing, range validation, and availability checks
  const start = parseISO(start_date);
  const end = parseISO(end_date);
  const rentalDates = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));

  // Rest of the validation and overlap checks, as previously implemented
  const placeholders = rentalDates.map(() => '?').join(',');
  const availabilityQuery = `SELECT available_date FROM Available_Dates WHERE venue_id = ? AND available_date IN (${placeholders})`;

  db.all(availabilityQuery, [venue_id, ...rentalDates], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: "Error retrieving available dates" });
    }

    const availableDates = rows.map(row => row.available_date);
    const unavailableDates = rentalDates.filter(date => !availableDates.includes(date));

    if (unavailableDates.length > 0) {
      return res.status(400).json({ error: "One or more dates in the range are not available", unavailable_dates: unavailableDates });
    }

    // Check for overlapping rentals
    db.all(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ?`, [venue_id], (err, existingRentals) => {
      if (err) {
        return res.status(400).json({ error: "Error checking for existing rentals" });
      }

      const hasOverlap = existingRentals.some(rental => {
        const rentalStart = parseISO(rental.start_date);
        const rentalEnd = parseISO(rental.end_date);
        return (
          (isBefore(start, rentalEnd) && isAfter(end, rentalStart)) ||
          isEqual(start, rentalStart) || isEqual(end, rentalEnd)
        );
      });

      if (hasOverlap) {
        return res.status(400).json({ error: "The selected date range overlaps with an existing rental." });
      }

      // Proceed to add the rental if no overlap is found
      db.run(
        `INSERT INTO Venue_Rentals (user_id, venue_id, start_date, end_date) VALUES (?, ?, ?, ?)`,
        [userId, venue_id, start_date, end_date],
        function (err) {
          if (err) {
            return res.status(400).json({ error: err.message });
          }
          res.status(201).json({ rental_id: this.lastID, message: "Rental created successfully" });
        }
      );
    });
  });
});

// Update a venue rental
app.put('/api/venue_rentals/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.body;
  const userId = req.user.user_id;

  // Check if start_date and end_date are provided
  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Both start_date and end_date are required." });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }

  // Ensure start_date is not after end_date
  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: "start_date cannot be after end_date." });
  }

  // Check if the user owns the rental
  db.get(`SELECT * FROM Venue_Rentals WHERE rental_id = ? AND user_id = ?`, [id, userId], (err, rental) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving rental" });
    }
    if (!rental) {
      return res.status(404).json({ error: "Rental not found or you don't have permission to edit this rental" });
    }

    // Proceed to update the rental dates
    db.run(`UPDATE Venue_Rentals SET start_date = ?, end_date = ? WHERE rental_id = ?`, [start_date, end_date, id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error updating rental" });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: "No changes made" });
      }
      res.json({ message: "Venue rental updated successfully" });
    });
  });
});

// Delete a venue rental
app.delete('/api/venue_rentals/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id; // Retrieve user ID from token

  // Check if the rental exists and belongs to the authenticated user
  db.get(`SELECT * FROM Venue_Rentals WHERE rental_id = ? AND user_id = ?`, [id, userId], (err, rental) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving rental information" });
    }
    if (!rental) {
      return res.status(404).json({ error: "Rental not found or unauthorized to delete" });
    }

    // Proceed to delete the rental
    db.run(`DELETE FROM Venue_Rentals WHERE rental_id = ?`, [id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error deleting rental" });
      }

      // Confirm the deletion
      if (this.changes === 0) {
        return res.status(404).json({ error: "Rental not found" });
      }

      res.json({ message: 'Rental deleted successfully' });
    });
  });
});


// --- AVAILABLE_DATES ENDPOINTS ---

// Get all available_dates
app.get('/api/available_dates', (req, res) => {
  db.all('SELECT * FROM Available_Dates', [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Create a new available date for a venue
app.post('/api/available_dates', authenticateToken, (req, res) => {
  const { venue_id, available_date } = req.body;
  const userId = req.user.user_id; // User ID from the token

  // Validate required fields
  if (!venue_id || !available_date) {
    return res.status(400).json({ error: "Both venue_id and available_date are required." });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(available_date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }

  // Step 1: Verify ownership of the venue
  db.get(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [venue_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Error verifying venue ownership." });
    }
    if (!row) {
      return res.status(404).json({ error: "Venue not found." });
    }
    if (row.owner_id !== userId) {
      return res.status(403).json({ error: "You do not have permission to modify available dates for this venue." });
    }

    // Step 2: Insert the new available date
    db.run(
      `INSERT INTO Available_Dates (venue_id, available_date) VALUES (?, ?)`,
      [venue_id, available_date],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Error creating available date" });
        }
        res.status(201).json({ message: "Available date created successfully", availability_id: this.lastID });
      }
    );
  });
});

// Update an available date
app.put('/api/available_dates/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { venue_id, available_date } = req.body;
  const userId = req.user.user_id;

  // Check if the availability belongs to the venue owned by the user
  db.get(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [venue_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving venue ownership data" });
    }
    if (!row || row.owner_id !== userId) {
      return res.status(403).json({ error: "You do not have permission to update this availability date" });
    }

    // Update the availability date if user has permission
    db.run(`UPDATE Available_Dates SET venue_id = ?, available_date = ? WHERE availability_id = ?`,
      [venue_id, available_date, id],
      function (err) {
        if (err) {
          return res.status(400).json({ error: "Error updating availability date" });
        }

        // Check if any row was updated
        if (this.changes === 0) {
          return res.status(404).json({ error: "Availability date not found or no changes made" });
        }

        res.json({ message: "Availability date updated successfully" });
      }
    );
  });
});

// Delete an available date
app.delete('/api/available_dates/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  // Check if the availability date belongs to a venue owned by the user
  db.get(`SELECT V.owner_id 
          FROM Available_Dates AD 
          JOIN Venues V ON AD.venue_id = V.venue_id 
          WHERE AD.availability_id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Error retrieving availability data" });
      }
      if (!row || row.owner_id !== userId) {
        return res.status(403).json({ error: "You do not have permission to delete this availability date" });
      }

      // Proceed to delete the availability date if ownership is confirmed
      db.run(`DELETE FROM Available_Dates WHERE availability_id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: "Error deleting availability date" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Availability date not found" });
        }

        res.json({ message: "Availability date deleted successfully" });
      });
    }
  );
});

// --- END OF CRUD ENDPOINTS ---

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
})