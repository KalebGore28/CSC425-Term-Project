// Source help: Open AI ChatGPT
// Creation of this code was assisted with AI tools. Especially with authentication and authorization.
// Additionally with creating tests for the api endpoints, and date handling utilities.

// Import dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables

const { eachDayOfInterval, parseISO, format, isBefore, isAfter, isEqual } = require('date-fns');

// Initialize Express app
const app = express();

// Load configuration
const PORT = process.env.PORT || 5001;
const secretKey = process.env.JWT_SECRET_KEY;
const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10; // Number of salt rounds for bcrypt

// Middleware configuration
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./mydb.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    db.run("PRAGMA foreign_keys = ON");
  }
});

// Function to start the server
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running at: http://localhost:${PORT}`);
    console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 JWT Secret Key Loaded: ${!!secretKey}`);
    console.log(`🗄️ Database connected successfully`);
  });
};

// --- UTILITY FUNCTIONS ---
// Middleware to check for a valid JWT token

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token; // Retrieve the token from the HTTP-only cookie
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    req.user = user; // Add user information to request object
    next();
  });
};

// Middleware to restrict access to internal requests

const internalOnly = (req, res, next) => {
  const internalHeader = req.headers['x-internal-request'];
  if (!internalHeader || internalHeader !== 'your-secure-value') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the "uploads" folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed (JPEG, JPG, PNG).'));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// --- HELPER FUNCTIONS ---
// Helper for database queries (promisified)
const queryDb = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
};

const getDbRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
};

const runDbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this.lastID || this.changes);
    });
  });
};

// Validators
const validateDateRange = (start_date, end_date) => {
  const today = new Date();
  const start = parseISO(start_date);
  const end = parseISO(end_date);

  if (isBefore(start, today) || isBefore(end, today)) {
    throw new Error("Event dates cannot be in the past.");
  }
  if (isAfter(start, end)) {
    throw new Error("End date cannot be before start date.");
  }

  return { start, end };
};

const checkOverlap = (start, end, rentals) => {
  return rentals.some(rental => {
    const rentalStart = parseISO(rental.start_date);
    const rentalEnd = parseISO(rental.end_date);

    return (
      (isBefore(start, rentalEnd) && isAfter(end, rentalStart)) ||
      (isEqual(start, rentalStart) || isEqual(end, rentalEnd))
    );
  });
};

// Authorizers
const verifyEventAccess = async (event_id, user_id) => {
  const row = await getDbRow(
    `SELECT EXISTS (
       SELECT 1 FROM Events WHERE event_id = ? AND organizer_id = ?
     ) AS is_organizer, EXISTS (
       SELECT 1 FROM Invitations WHERE event_id = ? AND user_id = ? AND status = 'Accepted'
     ) AS has_accepted_invite`,
    [event_id, user_id, event_id, user_id]
  );

  if (!row.is_organizer && !row.has_accepted_invite) {
    throw new Error("Access denied. Only users with an accepted invitation or the event organizer can view posts.");
  }
};

const checkEventAccess = async (event_id, user_id) => {
  const event = await getDbRow(
    `SELECT E.organizer_id, V.owner_id 
     FROM Events AS E 
     JOIN Venues AS V ON E.venue_id = V.venue_id 
     WHERE E.event_id = ?`,
    [event_id]
  );

  if (!event) {
    throw new Error("Event not found.");
  }

  const isOrganizer = event.organizer_id === user_id;
  const isOwner = event.owner_id === user_id;

  if (!isOrganizer && !isOwner) {
    throw new Error("You do not have permission to modify this event.");
  }

  return { isOrganizer, isOwner, event };
};

const verifyInvitationAccess = async (invitationId, userId) => {
  const invitation = await getDbRow(
    `SELECT I.user_id, E.organizer_id 
     FROM Invitations AS I 
     JOIN Events AS E ON I.event_id = E.event_id 
     WHERE I.invitation_id = ?`,
    [invitationId]
  );

  if (!invitation) throw new Error("Invitation not found.");
  const isRecipient = invitation.user_id === userId;
  const isOrganizer = invitation.organizer_id === userId;

  return { isRecipient, isOrganizer };
};


// --- COMMUNITY POSTS ENDPOINTS ---

// Get all posts for an event community, accessible to users with an accepted invitation or the event organizer
app.get('/api/events/:event_id/posts', authenticateToken, async (req, res) => {
  const { event_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Check user access to event posts
    await verifyEventAccess(event_id, user_id);

    // Fetch community posts for the event
    const posts = await queryDb(
      `SELECT Community_Posts.post_id, Community_Posts.event_id, Community_Posts.user_id, Community_Posts.content, Community_Posts.created_at,
              Users.name AS user_name, Events.name AS event_name
       FROM Community_Posts
       JOIN Users ON Community_Posts.user_id = Users.user_id
       JOIN Events ON Community_Posts.event_id = Events.event_id
       WHERE Community_Posts.event_id = ?`,
      [event_id]
    );

    res.json({ data: posts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add a new community post
app.post('/api/posts', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const { event_id, content } = req.body;

  try {
    // Check user invitation status for the event
    const invitation = await getDbRow(
      `SELECT * FROM Invitations WHERE event_id = ? AND user_id = ? AND status = 'Accepted'`,
      [event_id, user_id]
    );
    if (!invitation) {
      throw new Error("You do not have permission to post in this event's community");
    }

    // Insert community post
    const post_id = await runDbQuery(
      `INSERT INTO Community_Posts (event_id, user_id, content) VALUES (?, ?, ?)`,
      [event_id, user_id, content]
    );

    res.json({ post_id, message: "Post created successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a community post
app.put('/api/posts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const user_id = req.user.user_id;

  try {
    // Verify post ownership
    const post = await getDbRow(`SELECT * FROM Community_Posts WHERE post_id = ? AND user_id = ?`, [id, user_id]);
    if (!post) {
      throw new Error("You do not have permission to update this post");
    }

    // Update post content
    const changes = await runDbQuery(`UPDATE Community_Posts SET content = ? WHERE post_id = ?`, [content, id]);
    if (changes === 0) {
      throw new Error("No changes made to the post");
    }

    res.json({ message: "Post updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a community post
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Retrieve post details and verify permissions
    const post = await getDbRow(
      `SELECT Community_Posts.post_id, Community_Posts.user_id AS post_author_id, Events.organizer_id
       FROM Community_Posts 
       JOIN Events ON Community_Posts.event_id = Events.event_id 
       WHERE Community_Posts.post_id = ?`,
      [id]
    );

    if (!post) {
      throw new Error("Post not found");
    }

    if (post.post_author_id !== user_id && post.organizer_id !== user_id) {
      throw new Error("You do not have permission to delete this post");
    }

    // Delete the post
    await runDbQuery(`DELETE FROM Community_Posts WHERE post_id = ?`, [id]);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- EVENTS ENDPOINTS ---

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const events = await queryDb('SELECT * FROM Events');
    res.json({ data: events });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving events." });
  }
});

// Get all user events
app.get('/api/users/:user_id/events', authenticateToken, async (req, res) => {
  const { user_id } = req.params;

  try {
    if (user_id !== req.user.user_id) {
      throw new Error("You do not have permission to view events for this user.");
    }

    const events = await queryDb('SELECT * FROM Events WHERE organizer_id = ?', [user_id]);
    res.json({ data: events });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new event
app.post('/api/events', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { venue_id, name, description, start_date, end_date } = req.body;

  try {
    if (!venue_id || !name || !description) {
      throw new Error("Venue ID, name, and description are required.");
    }

    const venue = await getDbRow(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [venue_id]);
    if (!venue) {
      throw new Error("Venue not found.");
    }

    const isOwner = venue.owner_id === userId;

    if (isOwner) {
      // Validate and check for date overlaps for owners
      const { start, end } = validateDateRange(start_date, end_date);
      const rentals = await queryDb(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id != ?`, [venue_id, userId]);

      if (checkOverlap(start, end, rentals)) {
        throw new Error("Event dates overlap with an existing rental by another user.");
      }

      await runDbQuery(
        `INSERT INTO Events (venue_id, organizer_id, name, description, event_date_start, event_date_end) VALUES (?, ?, ?, ?, ?, ?)`,
        [venue_id, userId, name, description, start_date, end_date]
      );

    } else {
      // Validate renter access
      const rental = await getDbRow(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id = ? AND end_date >= ?`, [venue_id, userId, new Date()]);
      if (!rental) {
        throw new Error("Not authorized to create an event for this venue.");
      }

      await runDbQuery(
        `INSERT INTO Events (venue_id, organizer_id, name, description, event_date_start, event_date_end) VALUES (?, ?, ?, ?, ?, ?)`,
        [venue_id, userId, name, description, rental.start_date, rental.end_date]
      );
    }

    // Get the event ID 
    const event = await getDbRow(`SELECT last_insert_rowid() AS event_id`);

    res.status(201).json({ message: "Event created successfully.", event_id: event.event_id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event information
app.put('/api/events/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, event_date_start, event_date_end } = req.body;
  const userId = req.user.user_id;

  try {
    const { isOrganizer, isOwner, event } = await checkEventAccess(id, userId);

    if (isOrganizer && !isOwner && (event_date_start || event_date_end)) {
      throw new Error("Renters cannot update event dates.");
    }

    if (isOwner && event_date_start && event_date_end) {
      const { start, end } = validateDateRange(event_date_start, event_date_end);
      const rentals = await queryDb(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id != ?`, [event.venue_id, userId]);

      if (checkOverlap(start, end, rentals)) {
        throw new Error("Event dates conflict with existing rentals.");
      }

      await runDbQuery(
        `UPDATE Events SET name = ?, description = ?, event_date_start = ?, event_date_end = ? WHERE event_id = ?`,
        [name, description, event_date_start, event_date_end, id]
      );
    } else {
      await runDbQuery(
        `UPDATE Events SET name = ?, description = ? WHERE event_id = ?`,
        [name, description, id]
      );
    }

    res.json({ message: "Event updated successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an event
app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    const { isOwner, isOrganizer } = await checkEventAccess(id, userId);

    if (!isOwner && !isOrganizer) {
      throw new Error("You do not have permission to delete this event.");
    }

    const changes = await runDbQuery(`DELETE FROM Events WHERE event_id = ?`, [id]);
    if (changes === 0) {
      throw new Error("Event not found.");
    }

    res.json({ message: "Event deleted successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- INVITATIONS ENDPOINTS ---

// Get all invitations for an event
app.get('/api/events/:event_id/invitations', authenticateToken, async (req, res) => {
  const { event_id } = req.params;
  const userId = req.user.user_id;

  try {
    const event = await getDbRow(`SELECT organizer_id FROM Events WHERE event_id = ?`, [event_id]);
    if (!event) throw new Error("Event not found.");

    const isOrganizer = event.organizer_id === userId;

    if (isOrganizer) {
      // Organizer can view all invitations for the event
      const invitations = await queryDb(`SELECT * FROM Invitations WHERE event_id = ?`, [event_id]);
      return res.json({ data: invitations });
    } else {
      // Non-organizers can only view their own invitation
      const invitation = await getDbRow(
        `SELECT * FROM Invitations WHERE event_id = ? AND user_id = ?`,
        [event_id, userId]
      );
      if (!invitation) throw new Error("No invitation found for the current user.");

      res.json({ data: [invitation] });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all invitations for the authenticated user
app.get('/api/invitations', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const invitations = await queryDb(`SELECT * FROM Invitations WHERE user_id = ?`, [userId]);
    res.json({ data: invitations });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving invitations." });
  }
});

// Create an invitation (only accessible by event organizers)
app.post('/api/invitations', authenticateToken, async (req, res) => {
  const organizerId = req.user.user_id;
  const { event_id, email, status = "Sent" } = req.body;

  try {
    const eventInfo = await getDbRow(
      `SELECT E.organizer_id, V.owner_id, V.capacity 
       FROM Events AS E 
       JOIN Venues AS V ON E.venue_id = V.venue_id 
       WHERE E.event_id = ?`,
      [event_id]
    );

    if (!eventInfo) throw new Error("Event not found.");
    const isOrganizer = eventInfo.organizer_id === organizerId || eventInfo.owner_id === organizerId;
    if (!isOrganizer) throw new Error("You do not have permission to send invitations for this event.");

    // Check if venue capacity is exceeded for accepted invitations
    const { capacity } = eventInfo;
    const acceptedCount = await getDbRow(
      `SELECT COUNT(*) AS accepted_count 
       FROM Invitations 
       WHERE event_id = ? AND status = 'Accepted'`,
      [event_id]
    );
    if (status === "Accepted" && acceptedCount.accepted_count >= capacity) {
      throw new Error("The venue has reached its maximum capacity.");
    }

    // Check if invitee already exists
    let inviteeId = await getDbRow(`SELECT user_id FROM Users WHERE email = ?`, [email]);
    if (!inviteeId) {
      // Create new user if not found
      inviteeId = await runDbQuery(
        `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
        ["New User", email, "PlaceholderPassword"]
      );
    }

    // Create invitation
    const invitationId = await runDbQuery(
      `INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, ?)`,
      [event_id, inviteeId.user_id || inviteeId, status]
    );

    // Create notification for the invitee
    await runDbQuery(
      `INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
      [inviteeId.user_id || inviteeId, event_id, `You have been invited to event ID ${event_id}.`]
    );

    res.status(201).json({ message: "Invitation created successfully", invitation_id: invitationId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an invitation status
app.put('/api/invitations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.user_id;

  try {
    const invitation = await getDbRow(
      `SELECT I.user_id, E.event_date_start, V.capacity 
       FROM Invitations AS I 
       JOIN Events AS E ON I.event_id = E.event_id 
       JOIN Venues AS V ON E.venue_id = V.venue_id 
       WHERE I.invitation_id = ?`,
      [id]
    );

    if (!invitation) throw new Error("Invitation not found.");
    if (invitation.user_id !== userId) throw new Error("You do not have permission to update this invitation.");

    if (status === "Accepted") {
      const today = new Date();
      if (new Date(invitation.event_date_start) < today) {
        throw new Error("Cannot accept invitation. The event has already occurred.");
      }

      const acceptedCount = await getDbRow(
        `SELECT COUNT(*) AS accepted_count 
         FROM Invitations 
         WHERE event_id = ? AND status = 'Accepted'`,
        [invitation.event_id]
      );
      if (acceptedCount.accepted_count >= invitation.capacity) {
        throw new Error("Cannot accept invitation. The venue has reached its maximum capacity.");
      }
    }

    // Update invitation status
    const changes = await runDbQuery(`UPDATE Invitations SET status = ? WHERE invitation_id = ?`, [status, id]);
    if (!changes) throw new Error("No changes made to the invitation.");

    res.json({ message: "Invitation status updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an invitation
app.delete('/api/invitations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    const { isRecipient, isOrganizer } = await verifyInvitationAccess(id, userId);

    if (!isRecipient && !isOrganizer) {
      throw new Error("You do not have permission to delete this invitation.");
    }

    const changes = await runDbQuery(`DELETE FROM Invitations WHERE invitation_id = ?`, [id]);
    if (!changes) throw new Error("Invitation not found.");

    res.json({ message: "Invitation deleted successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
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

// Register a new user
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

// Login
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

// Get venue images
app.get('/api/images/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT image_url FROM Images WHERE image_id = ?`; // Use image_id here

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!row || !row.image_url) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imagePath = path.join(__dirname, row.image_url); // Resolve full path to the image

    fs.access(imagePath, fs.constants.F_OK, (fsErr) => {
      if (fsErr) {
        return res.status(404).json({ error: 'Image file not found on server' });
      }
      res.sendFile(imagePath); // Serve the image file
    });
  });
});

// Upload an image for a venue
app.post('/api/venues/:venue_id/image', authenticateToken, upload.single('image'), (req, res) => {
  const { venue_id } = req.params;
  const user_id = req.user.user_id; // Ensure the user is authenticated
  const filePath = req.file ? `/uploads/${req.file.filename}` : null; // Save file path
  const { image_url } = req.body; // Optional: Image URL if not uploading a file

  // Validate request
  if (!filePath && !image_url) {
    return res.status(400).json({ error: 'An image file or image URL is required.' });
  }

  // Check if the venue exists and is owned by the user
  db.get(`SELECT * FROM Venues WHERE venue_id = ? AND owner_id = ?`, [venue_id, user_id], (err, venue) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving venue information.' });
    }
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found or unauthorized to add image.' });
    }

    // Update the venue with the image URL or file path
    const imagePath = filePath || image_url;
    db.run(`UPDATE Venues SET image_url = ? WHERE venue_id = ?`, [imagePath, venue_id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating venue with image.' });
      }
      res.status(201).json({ message: 'Image uploaded successfully.', image_url: imagePath });
    });
  });
});

// --- STATIC FILES FOR UPLOADED IMAGES ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
startServer();