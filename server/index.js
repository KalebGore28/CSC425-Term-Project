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

  if (isBefore(start, today)) {
    throw new Error("Start date cannot be in the past.");
  }
  if (isBefore(end, today)) {
    throw new Error("End date cannot be in the past.");
  }
  if (isAfter(start, end)) {
    throw new Error("Start date cannot be after the end date.");
  }

  return { start, end };
};

const checkOverlap = (start, end, rentals) => {
  return rentals.some(rental => {
    const rentalStart = parseISO(rental.start_date);
    const rentalEnd = parseISO(rental.end_date);

    if (isNaN(rentalStart) || isNaN(rentalEnd)) {
      console.error("Invalid date in rental:", rental);
    }

    return (
      (isBefore(start, rentalEnd) && isAfter(end, rentalStart)) ||
      isEqual(start, rentalStart) || isEqual(end, rentalEnd)
    );
  });
};

const validateVenueFields = ({ name, location, description, capacity, price }) => {
  if (!name || !location || !description || !capacity || !price) {
    throw new Error("All fields (name, location, description, capacity, price) are required.");
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("Capacity must be a positive integer.");
  }
  if (typeof price !== 'number' || price <= 0) {
    throw new Error("Price must be a positive number.");
  }
};

const validateRegistrationInput = ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw new Error("All fields (name, email, password) are required.");
  }

  if (!/^[a-zA-Z\s]+$/.test(name)) {
    throw new Error("Name can only contain alphabetic characters and spaces.");
  }

  return true;
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

// Others
const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

// Helper function: Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id, email: user.email },
    secretKey,
    { expiresIn: '1h' }
  );
};


// --- COMMUNITY POSTS ENDPOINTS --- ✅

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

// --- EVENTS ENDPOINTS --- ✅

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
        `INSERT INTO Events (venue_id, organizer_id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [venue_id, userId, name, description, start_date, end_date]
      );

    } else {
      // Validate renter access
      const rental = await getDbRow(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id = ? AND end_date >= ?`, [venue_id, userId, new Date()]);
      if (!rental) {
        throw new Error("Not authorized to create an event for this venue.");
      }

      await runDbQuery(
        `INSERT INTO Events (venue_id, organizer_id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`,
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
  const { name, description, start_date, end_date } = req.body;
  const userId = req.user.user_id;

  try {
    const { isOrganizer, isOwner, event } = await checkEventAccess(id, userId);

    if (isOrganizer && !isOwner && (start_date || end_date)) {
      throw new Error("Renters cannot update event dates.");
    }

    if (isOwner && start_date && end_date) {
      const { start, end } = validateDateRange(start_date, end_date);
      const rentals = await queryDb(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND user_id != ?`, [event.venue_id, userId]);

      if (checkOverlap(start, end, rentals)) {
        throw new Error("Event dates conflict with existing rentals.");
      }

      await runDbQuery(
        `UPDATE Events SET name = ?, description = ?, start_date = ?, end_date = ? WHERE event_id = ?`,
        [name, description, start_date, end_date, id]
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

// --- INVITATIONS ENDPOINTS --- ✅

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
      `SELECT I.user_id, E.start_date, V.capacity 
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
      if (new Date(invitation.start_date) < today) {
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

// --- NOTIFICATIONS ENDPOINTS --- (don't have tests for these)

// Get all notifications for the authenticated user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const notifications = await queryDb(`SELECT * FROM Notifications WHERE user_id = ?`, [userId]);
    res.json({ data: notifications });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving notifications" });
  }
});

// Add a new notification (Internal Only)
app.post('/internal/api/notifications', internalOnly, async (req, res) => {
  const { user_id, event_id, message } = req.body;

  try {
    const notificationId = await runDbQuery(
      `INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
      [user_id, event_id, message]
    );

    res.json({ notification_id: notificationId });
  } catch (error) {
    res.status(400).json({ error: "Error adding notification", details: error.message });
  }
});

// Update a notification
app.put('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.user_id;

  try {
    // Check if the notification belongs to the authenticated user
    const notification = await getDbRow(
      `SELECT * FROM Notifications WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!notification) {
      return res.status(403).json({ error: "Unauthorized to update this notification or it does not exist" });
    }

    // Update the notification
    const changes = await runDbQuery(`UPDATE Notifications SET status = ? WHERE notification_id = ?`, [status, id]);

    if (changes === 0) {
      throw new Error("No changes made to the notification");
    }

    res.json({ message: "Notification updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    // Verify the notification belongs to the authenticated user
    const notification = await getDbRow(
      `SELECT * FROM Notifications WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!notification) {
      return res.status(403).json({ error: "Unauthorized to delete this notification or it does not exist" });
    }

    // Proceed to delete the notification
    const changes = await runDbQuery(`DELETE FROM Notifications WHERE notification_id = ?`, [id]);

    if (changes === 0) {
      throw new Error("Notification not found");
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- USERS ENDPOINTS --- ✅

// Register a new user
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate input
    validateRegistrationInput({ name, email, password });

    // Check if email already exists
    const existingUser = await getDbRow(`SELECT email FROM Users WHERE email = ?`, [email]);
    if (existingUser) {
      throw new Error("Email already registered. Please use a different email.");
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Insert user into the database
    const userId = await runDbQuery(
      `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully", user_id: userId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      throw new Error("Both email and password are required.");
    }

    // Retrieve the user by email
    const user = await getDbRow(`SELECT * FROM Users WHERE email = ?`, [email]);
    if (!user) {
      throw new Error("User not found.");
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials.");
    }

    // Generate a JWT token
    const token = generateToken(user);

    // Set the token as an HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensure HTTPS in production
      sameSite: "Strict", // Prevent CSRF attacks
      maxAge: 3600000, // 1 hour expiration
    });

    res.json({ message: "Login successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Logout (clear cookie)
app.post('/api/logout', authenticateToken, (req, res) => {
  try {
    // Clear the authentication token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensures HTTPS in production
      sameSite: "Strict" // Prevents CSRF attacks
    });

    // Send a success response
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    // Catch unexpected errors
    res.status(500).json({ error: "An error occurred during logout" });
  }
});

// Get current user profile
app.get('/api/users/me', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const user = await getDbRow(
      `SELECT user_id, name, email, created_at FROM Users WHERE user_id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving user profile" });
  }
});

// Update current user profile
app.put('/api/users/me', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { name, email } = req.body;

  try {
    // Validate input
    if (!name || !email) {
      throw new Error("Both name and email are required");
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
      throw new Error("Name can only contain alphabetic characters and spaces.");
    }

    // Update the user profile
    const changes = await runDbQuery(
      `UPDATE Users SET name = ?, email = ? WHERE user_id = ?`,
      [name, email, userId]
    );

    if (changes === 0) {
      return res.status(404).json({ error: "User not found or no changes made" });
    }

    res.json({ message: "User profile updated successfully" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") {
      res.status(400).json({ error: "Email already in use. Please choose a different email." });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Change password
app.put('/api/users/me/password', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { oldPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!oldPassword || !newPassword) {
      throw new Error("Both oldPassword and newPassword are required");
    }

    // Retrieve user and compare old password
    const user = await getDbRow(`SELECT password FROM Users WHERE user_id = ?`, [userId]);
    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in the database
    const changes = await runDbQuery(`UPDATE Users SET password = ? WHERE user_id = ?`, [hashedPassword, userId]);
    if (changes === 0) {
      throw new Error("Password update failed");
    }

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user account
app.delete('/api/users/me', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Delete user from the database
    const changes = await runDbQuery(`DELETE FROM Users WHERE user_id = ?`, [userId]);

    if (changes === 0) {
      throw new Error("User not found");
    }

    // Clear authentication token
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.json({ message: "User account deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- VENUES ENDPOINTS --- ✅

// Get all venues
app.get('/api/venues', async (req, res) => {
  try {
    const venues = await queryDb('SELECT * FROM Venues');
    res.json({ data: venues });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving venues." });
  }
});

// Create a new venue
app.post('/api/venues', authenticateToken, async (req, res) => {
  const { name, location, description, capacity, price } = req.body;
  const owner_id = req.user.user_id;

  try {
    validateVenueFields({ name, location, description, capacity, price });

    const venueId = await runDbQuery(
      `INSERT INTO Venues (owner_id, name, location, description, capacity, price) VALUES (?, ?, ?, ?, ?, ?)`,
      [owner_id, name, location, description, capacity, price]
    );

    res.status(201).json({ message: "Venue created successfully", venue_id: venueId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update venue information
app.put('/api/venues/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, location, description, capacity, price } = req.body;
  const userId = req.user.user_id;

  try {
    if (!name || !location) {
      throw new Error("Both name and location are required.");
    }

    // Optional fields validation
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
      throw new Error("Capacity must be a positive integer.");
    }
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      throw new Error("Price must be a positive number.");
    }

    // Check venue ownership
    const venue = await getDbRow(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [id]);
    if (!venue) {
      throw new Error("Venue not found.");
    }
    if (venue.owner_id !== userId) {
      throw new Error("You do not have permission to update this venue.");
    }

    const changes = await runDbQuery(
      `UPDATE Venues SET name = ?, location = ?, description = ?, capacity = ?, price = ? WHERE venue_id = ?`,
      [name, location, description, capacity, price, id]
    );

    if (changes === 0) {
      throw new Error("No changes made to the venue.");
    }

    res.json({ message: "Venue updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a venue
app.delete('/api/venues/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    // Check venue ownership
    const venue = await getDbRow(`SELECT * FROM Venues WHERE venue_id = ? AND owner_id = ?`, [id, userId]);
    if (!venue) {
      throw new Error("Venue not found or unauthorized to delete.");
    }

    const changes = await runDbQuery(`DELETE FROM Venues WHERE venue_id = ?`, [id]);
    if (changes === 0) {
      throw new Error("Venue not found.");
    }

    res.json({ message: "Venue deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- VENUE IMAGES ENDPOINTS --- 

// Get venue images
app.get('/api/images/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the image URL from the database
    const row = await getDbRow(`SELECT image_url FROM Images WHERE image_id = ?`, [id]);
    if (!row || !row.image_url) {
      throw new Error("Image not found");
    }

    const imagePath = path.resolve(__dirname, row.image_url);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error("Image file not found on server");
    }

    // Serve the image file
    res.sendFile(imagePath);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload an image for a venue
app.post('/api/venues/:venue_id/image', authenticateToken, upload.single('image'), async (req, res) => {
  const { venue_id } = req.params;
  const user_id = req.user.user_id;
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;
  const { image_url } = req.body;

  try {
    // Validate the request payload
    if (!filePath && !image_url) {
      throw new Error("An image file or image URL is required.");
    }

    // Check if the venue exists and is owned by the user
    const venue = await getDbRow(`SELECT * FROM Venues WHERE venue_id = ? AND owner_id = ?`, [venue_id, user_id]);
    if (!venue) {
      throw new Error("Venue not found or unauthorized to add image.");
    }

    // Use the uploaded file path or provided image URL
    const imagePath = filePath || image_url;

    // Insert the image into the database
    const image_id = await runDbQuery(`INSERT INTO Images (venue_id, image_url) VALUES (?, ?)`, [venue_id, imagePath]);

    res.status(201).json({
      message: "Image uploaded successfully.",
      image_id,
      image_url: imagePath,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- STATIC FILES FOR UPLOADED IMAGES ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- USER_VENUE_Rentals ENDPOINTS ---

// Get all user_venue_rentals
app.get('/api/venue_rentals', async (req, res) => {
  try {
    const rentals = await queryDb('SELECT * FROM Venue_Rentals');
    res.json({ data: rentals });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new venue rental with event conflict check
app.post('/api/venue_rentals', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { venue_id, start_date, end_date } = req.body;

  try {
    // Validate input
    if (!venue_id || !start_date || !end_date) {
      throw new Error("Venue ID, start_date, and end_date are required.");
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      throw new Error("Dates must be in 'YYYY-MM-DD' format.");
    }

    // Parse and validate date range
    const { start, end } = validateDateRange(start_date, end_date);
    const rentalDates = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));

    // Check for conflicts with events
    const events = await queryDb(`SELECT start_date, end_date FROM Events WHERE venue_id = ?`, [venue_id]);

    if (checkOverlap(start, end, events)) {
      throw new Error("Cannot book venue due to a scheduled event conflict.");
    }

    // Check for available dates
    const placeholders = rentalDates.map(() => '?').join(',');
    const availableDates = await queryDb(
      `SELECT available_date FROM Available_Dates WHERE venue_id = ? AND available_date IN (${placeholders})`,
      [venue_id, ...rentalDates]
    );
    const unavailableDates = rentalDates.filter(date => !availableDates.some(row => row.available_date === date));
    if (unavailableDates.length > 0) {
      throw new Error(`One or more dates in the range are not available: ${unavailableDates.join(', ')}`);
    }

    // Check for overlapping rentals
    const existingRentals = await queryDb(`SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ?`, [venue_id]);

    if (checkOverlap(start, end, existingRentals)) {
      throw new Error("The selected date range overlaps with an existing rental.");
    }

    // Insert rental into the database
    const rentalId = await runDbQuery(
      `INSERT INTO Venue_Rentals (user_id, venue_id, start_date, end_date) VALUES (?, ?, ?, ?)`,
      [userId, venue_id, start_date, end_date]
    );

    res.status(201).json({ rental_id: rentalId, message: "Rental created successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a venue rental
app.put('/api/venue_rentals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.body;
  const userId = req.user.user_id;

  try {
    // Validate input
    const { start, end } = validateDateRange(start_date, end_date);

    // Check if the rental belongs to the user
    const rental = await getDbRow(`SELECT venue_id FROM Venue_Rentals WHERE rental_id = ? AND user_id = ?`, [id, userId]);
    if (!rental) throw new Error("Rental not found or you don't have permission to edit this rental.");

    // Check for event conflicts
    const events = await queryDb(`SELECT start_date, end_date FROM Events WHERE venue_id = ?`, [rental.venue_id]);
    if (checkOverlap(start, end, events)) {
      throw new Error("Cannot update rental due to a scheduled event conflict.");
    }

    // Check for overlapping rentals
    const existingRentals = await queryDb(
      `SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ? AND rental_id != ?`,
      [rental.venue_id, id]
    );
    if (checkOverlap(start, end, existingRentals)) {
      throw new Error("The selected date range overlaps with an existing rental.");
    }

    // Update the rental
    const changes = await runDbQuery(
      `UPDATE Venue_Rentals SET start_date = ?, end_date = ? WHERE rental_id = ?`,
      [start_date, end_date, id]
    );

    if (changes === 0) throw new Error("No changes made to the rental.");
    res.json({ message: "Rental updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a venue rental
app.delete('/api/venue_rentals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    // Check if the rental belongs to the user
    const rental = await getDbRow(`SELECT * FROM Venue_Rentals WHERE rental_id = ? AND user_id = ?`, [id, userId]);
    if (!rental) throw new Error("Rental not found or unauthorized to delete.");

    // Delete the rental
    const changes = await runDbQuery(`DELETE FROM Venue_Rentals WHERE rental_id = ?`, [id]);
    if (changes === 0) throw new Error("Rental not found.");

    res.json({ message: "Rental deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
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