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

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM Users', [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Add a new user
app.post('/api/users', (req, res) => {
  const { name, email, password } = req.body;
  db.run(`INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`, [name, email, password], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
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
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was updated
    if (this.changes === 0) {
      // No rows were affected, meaning the user with the given ID doesn't exist or no changes were made
      return res.status(400).json({ error: "User not found or no changes made" });
    }

    res.json({ message: 'User updated successfully' });
  });
});

// Delete a user
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Users WHERE user_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the user with the given ID doesn't exist
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: 'User deleted successfully' });
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

// Add a new venue
app.post('/api/venues', (req, res) => {
  const { owner_id, name, location, description, capacity, price } = req.body;
  db.run(`INSERT INTO Venues (owner_id, name, location, description, capacity, price) VALUES (?, ?, ?, ?, ?, ?)`,
    [owner_id, name, location, description, capacity, price],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ venue_id: this.lastID });
    });
});

// Edit venue information
app.put('/api/venues/:id', (req, res) => {
  const { id } = req.params;
  const { name, location, description, capacity, price, available_dates } = req.body;
  db.run(`UPDATE Venues SET name = ?, location = ?, description = ?, capacity = ?, price = ? WHERE venue_id = ?`,
    [name, location, description, capacity, price, id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        // No rows were affected, meaning the venue with the given ID doesn't exist or no changes were made
        return res.status(400).json({ error: "Venue not found or no changes made" });
      }

      res.json({ message: 'Venue updated successfully' });
    });
});

// Delete a venue
app.delete('/api/venues/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Venues WHERE venue_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the venue with the given ID doesn't exist
      return res.status(404).json({ error: "Venue not found" });
    }
    res.json({ message: 'Venue deleted successfully' });
  });
});

// --- USER_VENUE_Rentals ENDPOINTS ---

// Get all user_venue_rentals
app.get('/api/user_venue_rentals', (req, res) => {
  db.all('SELECT * FROM User_Venue_Rentals', [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// Add a new user_venue_rentals
const { eachDayOfInterval, parseISO, format, isBefore, isAfter, isEqual } = require('date-fns');  // Using date-fns for date handling

app.post('/api/user_venue_rentals', (req, res) => {
  const { user_id, venue_id, start_date, end_date } = req.body;

  // Step 1: Parse dates and generate a list of dates for the rental range
  const start = parseISO(start_date);
  const end = parseISO(end_date);
  const rentalDates = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));

  // Step 2: Validate that each date in the range is available
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

    // Step 3: Check for overlapping rentals in the date range
    db.all(`SELECT start_date, end_date FROM User_Venue_Rentals WHERE venue_id = ?`, [venue_id], (err, existingRentals) => {
      if (err) {
        return res.status(400).json({ error: "Error checking for existing rentals" });
      }

      const hasOverlap = existingRentals.some(rental => {
        const rentalStart = parseISO(rental.start_date);
        const rentalEnd = parseISO(rental.end_date);

        // Check if the new rental range overlaps with the existing rental range
        return (
          (isBefore(start, rentalEnd) && isAfter(end, rentalStart)) ||   // New rental overlaps with an existing rental
          isEqual(start, rentalStart) || isEqual(end, rentalEnd) ||      // New rental starts or ends on the same date
          (isEqual(start, rentalEnd) || isEqual(end, rentalStart))       // Edge case: new rental exactly overlaps end/start
        );
      });

      if (hasOverlap) {
        return res.status(400).json({ error: "The selected date range overlaps with an existing rental." });
      }

      // Step 4: Proceed to add the rental if no overlap is found
      db.run(
        `INSERT INTO User_Venue_Rentals (user_id, venue_id, start_date, end_date) VALUES (?, ?, ?, ?)`,
        [user_id, venue_id, start_date, end_date],
        function (err) {
          if (err) {
            return res.status(400).json({ error: err.message });
          }
          res.json({ rental_id: this.lastID });
        }
      );
    });
  });
});

// Edit user_venue_rentals information
app.put('/api/user_venue_rentals/:id', (req, res) => {
  const { id } = req.params;
  const { user_id, venue_id, start_date, end_date } = req.body;

  // Step 1: Generate list of dates between start_date and end_date
  const start = parseISO(start_date);
  const end = parseISO(end_date);
  const rentalDates = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));

  // Step 2: Validate that each date in the range is available
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

    // Step 3: Check for overlapping rentals in the date range, excluding the current rental
    db.all(`SELECT start_date, end_date FROM User_Venue_Rentals WHERE venue_id = ? AND rental_id != ?`, [venue_id, id], (err, existingRentals) => {
      if (err) {
        return res.status(400).json({ error: "Error checking for existing rentals" });
      }

      const hasOverlap = existingRentals.some(rental => {
        const rentalStart = parseISO(rental.start_date);
        const rentalEnd = parseISO(rental.end_date);

        // Check if the new rental range overlaps with the existing rental range
        return (
          (isBefore(start, rentalEnd) && isAfter(end, rentalStart)) ||   // New rental overlaps with an existing rental
          isEqual(start, rentalStart) || isEqual(end, rentalEnd) ||      // New rental starts or ends on the same date
          (isEqual(start, rentalEnd) || isEqual(end, rentalStart))       // Edge case: new rental exactly overlaps end/start
        );
      });

      if (hasOverlap) {
        return res.status(400).json({ error: "The selected date range overlaps with an existing rental." });
      }

      // Step 4: Proceed to update the rental if no overlap is found
      db.run(
        `UPDATE User_Venue_Rentals SET user_id = ?, venue_id = ?, start_date = ?, end_date = ? WHERE rental_id = ?`,
        [user_id, venue_id, start_date, end_date, id],
        function (err) {
          if (err) {
            return res.status(400).json({ error: err.message });
          }

          // Check if any row was updated
          if (this.changes === 0) {
            // No rows were affected, meaning the rental with the given ID doesn't exist or no changes were made
            return res.status(400).json({ error: "Rental not found or no changes made" });
          }

          res.json({ message: 'User_Venue_Rental updated successfully' });
        }
      );
    });
  });
});

// Delete a user_venue_rentals
app.delete('/api/user_venue_rentals/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM User_Venue_Rentals WHERE rental_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the rental with the given ID doesn't exist
      return res.status(404).json({ error: "Rental not found" });
    }

    res.json({ message: 'User_Venue_Rental deleted successfully' });
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

// Add a new available_dates
app.post('/api/available_dates', (req, res) => {
  const { venue_id, available_date } = req.body;
  db.run(`INSERT INTO Available_Dates (venue_id, available_date) VALUES (?, ?)`,
    [venue_id, available_date],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ availability_id: this.lastID });
    });
});

// Edit available_dates information
app.put('/api/available_dates/:id', (req, res) => {
  const { id } = req.params;
  const { venue_id, available_date } = req.body;
  db.run(`UPDATE Available_Dates SET venue_id = ?, available_date = ? WHERE availability_id = ?`,
    [venue_id, available_date, id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        // No rows were affected, meaning the available_dates with the given ID doesn't exist or no changes were made
        return res.status(400).json({ error: "Available_Date not found or no changes made" });
      }

      res.json({ message: 'Available_Date updated successfully' });
    });
});

// Delete a available_dates
app.delete('/api/available_dates/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Available_Dates WHERE availability_id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Check if any row was deleted
    if (this.changes === 0) {
      // No rows were affected, meaning the available_dates with the given ID doesn't exist
      return res.status(404).json({ error: "Available_Date not found" });
    }

    res.json({ message: 'Available_Date deleted successfully' });
  });
});

// --- END OF ENDPOINTS ---


// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
})