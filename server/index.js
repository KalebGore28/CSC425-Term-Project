const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

// Import date handling utilities
const { eachDayOfInterval, parseISO, format, isBefore, isAfter, isEqual } = require('date-fns');

require('dotenv').config(); // Load environment variables from .env file

const secretKey = process.env.JWT_SECRET_KEY;
const saltRounds = 10; // Define the salt rounds for bcrypt

// --- MIDDLEWARE ---
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

// Internal middleware to allow only server-originated requests
function internalOnly(req, res, next) {
  // Restrict based on internal headers or local access, for example:
  const internalHeader = req.headers['x-internal-request'];
  if (!internalHeader || internalHeader !== 'your-secure-value') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
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

// Create a new event
app.post('/api/events', authenticateToken, (req, res) => {
  const userId = req.user.user_id;  // Get user ID from token
  const { venue_id, name, description, start_date, end_date } = req.body;

  // Step 1: Check for initial required fields for both renter and owner
  if (!venue_id || !name || !description) {
    return res.status(400).json({ error: "Venue ID, name, and description are required." });
  }

  // Step 2: Check if user is authorized to create an event for this venue (either owner or active renter)
  db.get(
    `SELECT owner_id FROM Venues WHERE venue_id = ?`,
    [venue_id],
    (err, venue) => {
      if (err) {
        return res.status(500).json({ error: "Error retrieving venue information" });
      }
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      const isOwner = venue.owner_id === userId;
      const today = new Date();

      if (isOwner) {
        // Step 3: If user is the owner, parse and validate the dates provided
        if (!start_date || !end_date) {
          return res.status(400).json({ error: "Start date and end date are required for owners." });
        }

        const eventStartDate = parseISO(start_date);
        const eventEndDate = parseISO(end_date);

        if (isBefore(eventStartDate, today) || isBefore(eventEndDate, today)) {
          return res.status(400).json({ error: "Event dates cannot be in the past." });
        }
        if (isAfter(eventStartDate, eventEndDate)) {
          return res.status(400).json({ error: "End date cannot be before start date." });
        }

        // Step 4: Check that the event dates do not overlap with existing rentals by other users
        db.all(
          `SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id != ?`,
          [venue_id, userId],
          (err, rentals) => {
            if (err) {
              return res.status(500).json({ error: "Error retrieving rental dates." });
            }

            const hasOverlap = rentals.some(rental => {
              const rentalStart = parseISO(rental.start_date);
              const rentalEnd = parseISO(rental.end_date);
              return (
                (isBefore(eventStartDate, rentalEnd) && isAfter(eventEndDate, rentalStart)) ||
                (isBefore(eventStartDate, rentalStart) && isAfter(eventEndDate, rentalEnd))
              );
            });

            if (hasOverlap) {
              return res.status(400).json({ error: "Event dates overlap with an existing rental by another user." });
            }

            // If no overlap, proceed to create the event for the owner
            createEvent(userId, venue_id, name, description, start_date, end_date, res);
          }
        );
      } else {
        // Step 5: If user is not the owner, ensure they have an active rental for the venue
        db.get(
          `SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id = ? AND end_date >= ?`,
          [venue_id, userId, today],
          (err, rental) => {
            if (err) {
              return res.status(500).json({ error: "Error checking rental status." });
            }
            if (!rental) {
              return res.status(403).json({ error: "Not authorized to create an event for this venue." });
            }

            // Use rental dates as event dates if renter is creating the event
            createEvent(userId, venue_id, name, description, rental.start_date, rental.end_date, res);
          }
        );
      }
    }
  );

  // Helper function to create an event
  function createEvent(userId, venueId, name, description, startDate, endDate, res) {
    db.run(
      `INSERT INTO Events (venue_id, organizer_id, name, description, event_date_start, event_date_end) VALUES (?, ?, ?, ?, ?, ?)`,
      [venueId, userId, name, description, startDate, endDate],
      function (err) {
        if (err) {
          console.error("Error executing INSERT INTO Events:", err.message);
          return res.status(500).json({ error: "Error creating event", details: err.message });
        }
        res.status(201).json({ message: "Event created successfully", event_id: this.lastID });
      }
    );
  }
});

// Update event information
app.put('/api/events/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, description, event_date_start, event_date_end } = req.body;
  const userId = req.user.user_id;

  // Step 1: Validate the fields provided
  if (!name && !description && (!event_date_start || !event_date_end)) {
    return res.status(400).json({ error: "At least one field to update (name, description, or dates) is required." });
  }

  // Step 2: Retrieve the event and associated venue
  db.get(
    `SELECT E.organizer_id, E.venue_id, V.owner_id FROM Events AS E 
     JOIN Venues AS V ON E.venue_id = V.venue_id 
     WHERE E.event_id = ?`,
    [id],
    (err, event) => {
      if (err) {
        return res.status(500).json({ error: "Error retrieving event information" });
      }
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isOrganizer = event.organizer_id === userId;
      const isOwner = event.owner_id === userId;

      // Step 3: Define update logic based on role
      if (isOrganizer && !isOwner) {
        // Renter updates: only name and description
        if (event_date_start || event_date_end) {
          return res.status(403).json({ error: "Renters cannot update event dates" });
        }
        db.run(
          `UPDATE Events SET name = ?, description = ? WHERE event_id = ?`,
          [name, description, id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: "Error updating event" });
            }
            if (this.changes === 0) {
              return res.status(400).json({ error: "No changes made to the event" });
            }
            res.json({ message: "Event updated successfully" });
          }
        );
      } else if (isOwner) {
        // Owner updates: can update name, description, and dates with validation
        if (event_date_start && event_date_end) {
          const start = parseISO(event_date_start);
          const end = parseISO(event_date_end);

          if (isAfter(start, end)) {
            return res.status(400).json({ error: "Start date cannot be after end date" });
          }

          // Check for conflicts with existing rentals
          db.all(
            `SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id != ?`,
            [event.venue_id, userId],
            (err, rentals) => {
              if (err) {
                return res.status(500).json({ error: "Error retrieving rental information" });
              }

              const hasConflict = rentals.some(rental => {
                const rentalStart = parseISO(rental.start_date);
                const rentalEnd = parseISO(rental.end_date);

                return (
                  (isBefore(start, rentalEnd) && isAfter(end, rentalStart)) ||
                  isEqual(start, rentalStart) || isEqual(end, rentalEnd)
                );
              });

              if (hasConflict) {
                return res.status(400).json({ error: "Event dates conflict with existing rentals at the venue" });
              }

              // If no conflict, proceed with update
              db.run(
                `UPDATE Events SET name = ?, description = ?, event_date_start = ?, event_date_end = ? WHERE event_id = ?`,
                [name, description, event_date_start, event_date_end, id],
                function (err) {
                  if (err) {
                    return res.status(500).json({ error: "Error updating event" });
                  }
                  if (this.changes === 0) {
                    return res.status(400).json({ error: "No changes made to the event" });
                  }
                  res.json({ message: "Event updated successfully" });
                }
              );
            }
          );
        } else {
          // Owner updating only name and description
          db.run(
            `UPDATE Events SET name = ?, description = ? WHERE event_id = ?`,
            [name, description, id],
            function (err) {
              if (err) {
                return res.status(500).json({ error: "Error updating event" });
              }
              if (this.changes === 0) {
                return res.status(400).json({ error: "No changes made to the event" });
              }
              res.json({ message: "Event updated successfully" });
            }
          );
        }
      } else {
        res.status(403).json({ error: "Not authorized to update this event" });
      }
    }
  );
});

// Delete an event
app.delete('/api/events/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  // Step 1: Retrieve event details to check if the user is authorized
  db.get(`SELECT organizer_id, venue_id FROM Events WHERE event_id = ?`, [id], (err, event) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving event details" });
    }
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Step 2: Check if the user is the event creator or the venue owner
    const isOrganizer = event.organizer_id === userId;

    // If not the organizer, check if they are the owner of the venue
    if (!isOrganizer) {
      db.get(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [event.venue_id], (err, venue) => {
        if (err) {
          return res.status(500).json({ error: "Error retrieving venue details" });
        }
        if (!venue || venue.owner_id !== userId) {
          return res.status(403).json({ error: "You do not have permission to delete this event" });
        }

        // User is the venue owner, proceed to delete the event
        deleteEvent(id, res);
      });
    } else {
      // User is the organizer, proceed to delete the event
      deleteEvent(id, res);
    }
  });

  // Helper function to delete the event
  function deleteEvent(eventId, res) {
    db.run(`DELETE FROM Events WHERE event_id = ?`, [eventId], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error deleting event" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ message: "Event deleted successfully" });
    });
  }
});

// --- INVITATIONS ENDPOINTS ---

// Get all invitations for an event
app.get('/api/events/:event_id/invitations', authenticateToken, (req, res) => {
  const { event_id } = req.params;
  const userId = req.user.user_id; // User ID from the token

  // Step 1: Check if the user is the organizer of the event
  db.get(`SELECT organizer_id FROM Events WHERE event_id = ?`, [event_id], (err, event) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving event information" });
    }
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isOrganizer = event.organizer_id === userId;

    if (isOrganizer) {
      // Step 2: If the user is the organizer, retrieve all invitations for the event
      db.all(`SELECT * FROM Invitations WHERE event_id = ?`, [event_id], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: "Error retrieving invitations" });
        }
        res.json({ data: rows });
      });
    } else {
      // Step 3: If the user is not the organizer, retrieve only their own invitation for the event
      db.get(
        `SELECT * FROM Invitations WHERE event_id = ? AND user_id = ?`,
        [event_id, userId],
        (err, invitation) => {
          if (err) {
            return res.status(500).json({ error: "Error retrieving invitation" });
          }
          if (!invitation) {
            return res.status(404).json({ error: "No invitation found for the current user" });
          }
          res.json({ data: [invitation] });
        }
      );
    }
  });
});

// Create an invitation (only accessible by event organizers)
app.post('/api/invitations', authenticateToken, (req, res) => {
  const organizerId = req.user.user_id; // Get user ID from the authenticated token
  const { event_id, email, status = "Sent" } = req.body;

  // Step 1: Check if the user is the event organizer
  db.get(
    `SELECT E.organizer_id, V.owner_id 
     FROM Events AS E 
     JOIN Venues AS V ON E.venue_id = V.venue_id 
     WHERE E.event_id = ?`,
    [event_id],
    (err, eventInfo) => {
      if (err) {
        return res.status(500).json({ error: "Error retrieving event information" });
      }
      if (!eventInfo) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isOrganizer = eventInfo.organizer_id === organizerId || eventInfo.owner_id === organizerId;
      if (!isOrganizer) {
        return res.status(403).json({ error: "You do not have permission to send invitations for this event" });
      }

      // Step 2: Check venue capacity for accepted invitations
      db.get(
        `SELECT V.capacity, COUNT(I.invitation_id) AS accepted_count
         FROM Events AS E
         JOIN Venues AS V ON E.venue_id = V.venue_id
         LEFT JOIN Invitations AS I ON E.event_id = I.event_id AND I.status = 'Accepted'
         WHERE E.event_id = ?`,
        [event_id],
        (err, capacityInfo) => {
          if (err) {
            return res.status(500).json({ error: "Error retrieving event capacity" });
          }
          const { capacity, accepted_count } = capacityInfo;

          if (status === 'Accepted' && accepted_count >= capacity) {
            return res.status(400).json({ error: "The venue has reached its maximum capacity" });
          }

          // Step 3: Check if the invitee already exists based on email
          db.get(`SELECT user_id FROM Users WHERE email = ?`, [email], (err, user) => {
            if (err) {
              return res.status(500).json({ error: "Error checking user existence" });
            }

            let inviteeId = user ? user.user_id : null;

            // Step 4: If the user does not exist, create a new one
            if (!inviteeId) {
              db.run(
                `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
                ["New User", email, "PlaceholderPassword"],
                function (err) {
                  if (err) {
                    return res.status(500).json({ error: "Error creating new user for invitation" });
                  }
                  inviteeId = this.lastID;

                  // Step 5: Create invitation for the new user
                  createInvitation(inviteeId);
                }
              );
            } else {
              // User exists, proceed to create the invitation
              createInvitation(inviteeId);
            }
          });

          // Helper function to create the invitation and send notification
          function createInvitation(inviteeId) {
            db.run(
              `INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, ?)`,
              [event_id, inviteeId, status],
              function (err) {
                if (err) {
                  return res.status(500).json({ error: "Error creating invitation" });
                }

                // Create a notification for the invitee
                createNotification(
                  inviteeId,
                  event_id,
                  `You have been invited to event ID ${event_id}.`
                );

                res.status(201).json({ invitation_id: this.lastID });
              }
            );
          }

          // Helper function to create a notification
          function createNotification(userId, eventId, message) {
            db.run(
              `INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
              [userId, eventId, message],
              (err) => {
                if (err) {
                  console.error(`Error creating notification for user_id ${userId}:`, err.message);
                }
              }
            );
          }
        }
      );
    }
  );
});

// Update an invitation status
app.put('/api/invitations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.user_id; // Get user ID from token

  // Step 1: Retrieve the invitation to ensure it exists and belongs to the authenticated user
  db.get(`SELECT user_id, event_id FROM Invitations WHERE invitation_id = ?`, [id], (err, invitation) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving invitation information" });
    }
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    if (invitation.user_id !== userId) {
      return res.status(403).json({ error: "You do not have permission to update this invitation" });
    }

    // Step 2: If changing status to "Accepted," check venue capacity and event expiration
    if (status === 'Accepted') {
      // Retrieve event details to check capacity and date
      db.get(`SELECT E.event_date_start, V.capacity, COUNT(I.invitation_id) AS accepted_count
              FROM Events AS E
              JOIN Venues AS V ON E.venue_id = V.venue_id
              LEFT JOIN Invitations AS I ON E.event_id = I.event_id AND I.status = 'Accepted'
              WHERE E.event_id = ?`, [invitation.event_id], (err, eventInfo) => {
        if (err) {
          return res.status(500).json({ error: "Error retrieving event and venue details" });
        }

        const { event_date_start, capacity, accepted_count } = eventInfo;
        const today = new Date();

        // Check if the event date is in the past
        if (new Date(event_date_start) < today) {
          return res.status(400).json({ error: "Cannot accept invitation. The event has already occurred." });
        }

        // Check if venue has reached capacity
        if (accepted_count >= capacity) {
          return res.status(400).json({ error: "Cannot accept invitation. The venue has reached its maximum capacity." });
        }

        // Proceed with updating the invitation status
        updateInvitationStatus(id, status, res);
      });
    } else {
      // If not accepting or already accepted, just update the status
      updateInvitationStatus(id, status, res);
    }
  });

  // Helper function to update invitation status
  function updateInvitationStatus(id, status, res) {
    db.run(`UPDATE Invitations SET status = ? WHERE invitation_id = ?`, [status, id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error updating invitation status" });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: "Invitation not found or no changes made" });
      }
      res.json({ message: "Invitation status updated successfully" });
    });
  }
});

// Delete an invitation
app.delete('/api/invitations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id; // User ID from the token

  // Step 1: Retrieve the invitation to confirm it exists and get associated user and event IDs
  db.get(`SELECT user_id, event_id FROM Invitations WHERE invitation_id = ?`, [id], (err, invitation) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving invitation information" });
    }
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    const isRecipient = invitation.user_id === userId;

    // Step 2: If the user is not the recipient, check if they are the event organizer
    if (!isRecipient) {
      db.get(`SELECT organizer_id FROM Events WHERE event_id = ?`, [invitation.event_id], (err, event) => {
        if (err) {
          return res.status(500).json({ error: "Error retrieving event information" });
        }
        if (!event || event.organizer_id !== userId) {
          return res.status(403).json({ error: "You do not have permission to delete this invitation" });
        }

        // User is the organizer, proceed with deletion
        deleteInvitation(id, res);
      });
    } else {
      // User is the recipient, proceed with deletion
      deleteInvitation(id, res);
    }
  });

  // Helper function to delete the invitation
  function deleteInvitation(invitationId, res) {
    db.run(`DELETE FROM Invitations WHERE invitation_id = ?`, [invitationId], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error deleting invitation" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      res.json({ message: "Invitation deleted successfully" });
    });
  }
});

// --- NOTIFICATIONS ENDPOINTS ---

// Get all notifications for the authenticated user
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.user_id; // Retrieve user ID from the token

  // Fetch notifications for the authenticated user
  db.all(`SELECT * FROM Notifications WHERE user_id = ?`, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving notifications" });
    }
    res.json({ data: rows });
  });
});

// Add a new notification
app.post('/internal/api/notifications', internalOnly, (req, res) => {
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
app.put('/api/notifications/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.user_id; // Get the user ID from the token

  // Step 1: Check if the notification belongs to the authenticated user
  db.get(`SELECT * FROM Notifications WHERE notification_id = ? AND user_id = ?`, [id, userId], (err, notification) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving notification data" });
    }
    if (!notification) {
      return res.status(403).json({ error: "Unauthorized to update this notification or it does not exist" });
    }

    // Step 2: Update the notification if it belongs to the user
    db.run(`UPDATE Notifications SET status = ? WHERE notification_id = ?`, [status, id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error updating notification" });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        return res.status(400).json({ error: "No changes made to the notification" });
      }

      res.json({ message: 'Notification updated successfully' });
    });
  });
});

// Delete a notification
app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id; // Get user ID from token

  // Step 1: Verify the notification belongs to the authenticated user
  db.get(`SELECT * FROM Notifications WHERE notification_id = ? AND user_id = ?`, [id, userId], (err, notification) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving notification data" });
    }
    if (!notification) {
      return res.status(403).json({ error: "Unauthorized to delete this notification or it does not exist" });
    }

    // Step 2: Proceed to delete if ownership is confirmed
    db.run(`DELETE FROM Notifications WHERE notification_id = ?`, [id], function (err) {
      if (err) {
        return res.status(500).json({ error: "Error deleting notification" });
      }

      // Confirm deletion
      if (this.changes === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ message: 'Notification deleted successfully' });
    });
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

// Create a new venue rental with event conflict check
app.post('/api/venue_rentals', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const { venue_id, start_date, end_date } = req.body;

  // Regex to validate date format 'YYYY-MM-DD'
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({ error: "Dates must be in 'YYYY-MM-DD' format." });
  }

  // Parse dates and validate range
  const start = parseISO(start_date);
  const end = parseISO(end_date);
  const rentalDates = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));

  // Step 1: Check for conflicts with owner-created events in the Events table
  db.all(
    `SELECT event_date_start, event_date_end FROM Events WHERE venue_id = ?`,
    [venue_id],
    (err, events) => {
      if (err) {
        return res.status(500).json({ error: "Error checking for conflicting events" });
      }

      const hasEventConflict = events.some(event => {
        const eventStart = parseISO(event.event_date_start);
        const eventEnd = parseISO(event.event_date_end);

        // Check for overlap between event and rental dates
        return (
          (isBefore(start, eventEnd) && isAfter(end, eventStart)) ||
          isEqual(start, eventStart) || isEqual(end, eventEnd)
        );
      });

      if (hasEventConflict) {
        return res.status(400).json({ error: "Cannot book venue due to a scheduled event conflict" });
      }

      // Step 2: Check for available dates in Available_Dates table
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

        // Step 3: Check for overlapping rentals in Venue_Rentals table
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

          // Step 4: If no conflicts, add the rental
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
    }
  );
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
  const start = parseISO(start_date);
  const end = parseISO(end_date);
  if (isAfter(start, end)) {
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

    const venue_id = rental.venue_id;

    // Step 1: Check for event conflicts in the Events table
    db.all(
      `SELECT event_date_start, event_date_end FROM Events WHERE venue_id = ?`,
      [venue_id],
      (err, events) => {
        if (err) {
          return res.status(500).json({ error: "Error checking for conflicting events" });
        }

        const hasEventConflict = events.some(event => {
          const eventStart = parseISO(event.event_date_start);
          const eventEnd = parseISO(event.event_date_end);

          return (
            (isBefore(start, eventEnd) && isAfter(end, eventStart)) ||
            isEqual(start, eventStart) || isEqual(end, eventEnd)
          );
        });

        if (hasEventConflict) {
          return res.status(400).json({ error: "Cannot update rental due to a scheduled event conflict" });
        }

        // Step 2: Check for overlapping rentals in Venue_Rentals table
        db.all(
          `SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND rental_id != ?`,
          [venue_id, id],
          (err, existingRentals) => {
            if (err) {
              return res.status(500).json({ error: "Error checking for existing rentals" });
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

            // Step 3: Proceed to update the rental if no conflicts are found
            db.run(
              `UPDATE Venue_Rentals SET start_date = ?, end_date = ? WHERE rental_id = ?`,
              [start_date, end_date, id],
              function (err) {
                if (err) {
                  return res.status(500).json({ error: "Error updating rental" });
                }
                if (this.changes === 0) {
                  return res.status(400).json({ error: "No changes made" });
                }
                res.json({ message: "Venue rental updated successfully" });
              }
            );
          }
        );
      }
    );
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