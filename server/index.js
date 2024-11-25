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
const { v4: uuidv4 } = require('uuid'); // For generating unique tokens
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

// Import helper.js file
const { validateDateRange, checkDateOverlap, validateFields, validateDateFormat } = require('./helpers');

const { eachDayOfInterval, parseISO, format, isBefore, isAfter, isEqual } = require('date-fns');

// Initialize Express app
const app = express();

// Send email using EmailJS API
async function sendEmail(recipientEmail, templateParams) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const userId = process.env.EMAILJS_USER_ID;
  const accessToken = process.env.EMAILJS_ACCESS_TOKEN;

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: userId,
    accessToken: accessToken,
    template_params: {
      to_email: recipientEmail,
      ...templateParams, // Add any dynamic template parameters
    },
  };

  try {
    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    throw new Error('Failed to send email.');
  }
}

// Load configuration
const PORT = process.env.PORT || 5001;
const secretKey = process.env.JWT_SECRET_KEY;
const refreshSecretKey = process.env.JWT_SECRET_KEY
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



// Middleware to check for a valid JWT token
const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken; // Use the correct cookie name
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user; // Attach user info to the request
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

// Sets up a static file server to serve files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// --- AUTHENTICATION FUNCTIONS --- ✅
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate inputs
    validateFields({ name, email, password }, {
      name: { required: true, type: 'string' },
      email: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    // Check if the email is already registered
    const existingUser = await getDbRow(`SELECT email FROM Users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save the user in the database
    const userId = await runDbQuery(`INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword]);

    res.status(201).json({ message: 'User registered successfully', user_id: userId });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate inputs
    validateFields({ email, password }, {
      email: { required: true, type: 'string' },
      password: { required: true, type: 'string' },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    // Retrieve the user from the database
    const user = await getDbRow(`SELECT * FROM Users WHERE email = ?`, [email]);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign({ user_id: user.user_id }, secretKey, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ user_id: user.user_id }, refreshSecretKey, { expiresIn: '7d' });

    // Set the `refreshToken` as an HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'Strict', // Prevent CSRF
      maxAge: 604800000, // 7 days
    });

    // Set the `accessToken` as an HTTP-only cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 3600000, // 1 hour
    });

    // Optionally send the access token in the response body
    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });

  res.json({ message: 'Logged out successfully' });
});

app.post('/api/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Refresh token from cookie

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided.' });
  }

  jwt.verify(refreshToken, refreshSecretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid refresh token.' });
    }

    // Generate a new access token
    const newAccessToken = jwt.sign({ user_id: user.user_id }, secretKey, { expiresIn: '1h' });

    // Set the new access token as an HTTP-only cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
      sameSite: 'Strict',
      maxAge: 3600000, // 1 hour
    });

    res.json({ message: 'Token refreshed successfully' });
  });
});

// Invalidate the access token
app.post('/api/invalidate', (req, res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
});

// --- COMMUNITY POSTS ENDPOINTS ---

// Get all posts for an event community
app.get('/api/events/:event_id/posts', authenticateToken, async (req, res) => {
  const { event_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Verify user access to event posts
    await verifyEventAccess(event_id, user_id);

    // Fetch community posts with liked_by data
    const posts = await queryDb(
      `SELECT 
         CP.post_id, 
         CP.event_id, 
         CP.user_id, 
         CP.content, 
         CP.created_at, 
         CP.like_count, 
         U.name AS user_name, 
         GROUP_CONCAT(PL.user_id) AS liked_by
       FROM Community_Posts CP
       LEFT JOIN Users U ON CP.user_id = U.user_id
       LEFT JOIN Post_Likes PL ON CP.post_id = PL.post_id
       WHERE CP.event_id = ?
       GROUP BY CP.post_id`,
      [event_id]
    );

    // Transform liked_by into an array of user IDs
    const transformedPosts = posts.map((post) => ({
      ...post,
      liked_by: post.liked_by ? post.liked_by.split(',').map(Number) : [], // Convert to array of numbers
    }));

    res.json({ data: transformedPosts });
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

// Delete a specific community post - ✅
app.delete('/api/events/:event_id/posts/:post_id', authenticateToken, async (req, res) => {
  const { event_id, post_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Verify the post exists and check permissions
    const post = await getDbRow(
      `SELECT CP.post_id, CP.user_id AS author_id, E.organizer_id
       FROM Community_Posts CP
       JOIN Events E ON CP.event_id = E.event_id
       WHERE CP.post_id = ? AND CP.event_id = ?`,
      [post_id, event_id]
    );

    if (!post) {
      throw new Error("Post not found.");
    }

    // Check if the user is either the author of the post or the organizer of the event
    if (post.author_id !== user_id && post.organizer_id !== user_id) {
      throw new Error("You do not have permission to delete this post.");
    }

    // Delete the post
    const changes = await runDbQuery(`DELETE FROM Community_Posts WHERE post_id = ?`, [post_id]);

    if (changes === 0) {
      throw new Error("Failed to delete the post.");
    }

    res.status(200).json({ message: "Post deleted successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Like a post - ✅
app.patch('/api/posts/:post_id/like', authenticateToken, async (req, res) => {
  const { post_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Check if the user has already liked the post
    const existingLike = await getDbRow(
      `SELECT * FROM Post_Likes WHERE post_id = ? AND user_id = ?`,
      [post_id, user_id]
    );

    if (existingLike) {
      throw new Error("User has already liked this post.");
    }

    // Insert a new like
    await runDbQuery(
      `INSERT INTO Post_Likes (post_id, user_id) VALUES (?, ?)`,
      [post_id, user_id]
    );

    // Increment the like count in the post
    await runDbQuery(
      `UPDATE Community_Posts SET like_count = like_count + 1 WHERE post_id = ?`,
      [post_id]
    );

    res.json({ message: "Post liked successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Unlike a post - ✅
app.patch('/api/posts/:post_id/unlike', authenticateToken, async (req, res) => {
  const { post_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Check if the user has liked the post
    const existingLike = await getDbRow(
      `SELECT * FROM Post_Likes WHERE post_id = ? AND user_id = ?`,
      [post_id, user_id]
    );

    if (!existingLike) {
      throw new Error("User has not liked this post.");
    }

    // Remove the like
    await runDbQuery(
      `DELETE FROM Post_Likes WHERE post_id = ? AND user_id = ?`,
      [post_id, user_id]
    );

    // Decrement the like count in the post
    await runDbQuery(
      `UPDATE Community_Posts SET like_count = like_count - 1 WHERE post_id = ?`,
      [post_id]
    );

    res.json({ message: "Post unliked successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a reply to a community post - ✅
app.post('/api/posts/:post_id/reply', authenticateToken, async (req, res) => {
  const { post_id } = req.params;
  const user_id = req.user.user_id;
  const { content } = req.body;

  try {
    if (!content) {
      throw new Error("Reply content cannot be empty.");
    }

    // Ensure the parent post exists
    const parentPost = await getDbRow(
      `SELECT * FROM Community_Posts WHERE post_id = ?`,
      [post_id]
    );
    if (!parentPost) {
      throw new Error("Parent post not found.");
    }

    // Insert the reply into the database
    const replyId = await runDbQuery(
      `INSERT INTO Community_Posts (event_id, user_id, content, parent_post_id, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [parentPost.event_id, user_id, content, post_id, new Date()]
    );

    res.status(201).json({ message: "Reply posted successfully.", reply_id: replyId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get replies for a specific post - ✅
app.get('/api/posts/:post_id/replies', authenticateToken, async (req, res) => {
  const { post_id } = req.params;

  try {
    // Fetch replies for the given post
    const replies = await queryDb(
      `SELECT 
        CP.post_id, 
        CP.content, 
        CP.created_at, 
        CP.like_count, 
        CP.user_id, -- Include user_id here
        U.name AS user_name
       FROM Community_Posts CP
       JOIN Users U ON CP.user_id = U.user_id
       WHERE CP.parent_post_id = ?`,
      [post_id]
    );

    res.json({ data: replies });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- EVENTS ENDPOINTS --- ✅

// Get all events with venue information, excluding invite-only events
app.get('/api/events', async (req, res) => {
  try {
    const events = await queryDb(`
      SELECT 
        Events.event_id, 
        Events.name AS event_name, 
        Events.description, 
        Events.start_date,
        Venues.name AS venue_name, 
        Venues.location AS venue_location
      FROM Events
      JOIN Venues ON Events.venue_id = Venues.venue_id
      WHERE Events.invite_only = 0 -- Exclude invite-only events
    `);
    res.json({ data: events });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving events with venue information." });
  }
});

// Get all events where the authenticated user is the organizer
app.get('/api/users/me/events', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const events = await queryDb(`
      SELECT 
        E.event_id,
        E.name AS event_name,
        E.start_date,
        E.end_date,
        V.name AS venue_name,
        V.location AS venue_location
      FROM Events E
      JOIN Venues V ON E.venue_id = V.venue_id
      WHERE E.organizer_id = ?
    `, [userId]);

    res.json({ data: events });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving events." });
  }
});

// Get event details by ID
app.get('/api/events/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const event = await getDbRow(
      `SELECT 
         Events.event_id,
         Events.name, 
         Events.description, 
         Events.start_date, 
         Events.end_date,
         Events.invite_only,
         Events.organizer_id, 
         Venues.name AS venue_name, 
         Venues.location AS venue_location, 
         Users.name AS organizer_name
       FROM Events
       JOIN Venues ON Events.venue_id = Venues.venue_id
       JOIN Users ON Events.organizer_id = Users.user_id
       WHERE Events.event_id = ?`,
      [id]
    );

    if (!event) {
      throw new Error("Event not found.");
    }

    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all attendees for an event
app.get('/api/events/:event_id/attendees', authenticateToken, async (req, res) => {
  const { event_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Check user access to event attendees
    await verifyEventAccess(event_id, user_id);

    // Fetch attendees for the event, including their invitation status
    const attendees = await queryDb(
      `SELECT 
         Users.user_id, 
         Users.name, 
         Invitations.status 
       FROM Invitations 
       JOIN Users ON Invitations.user_id = Users.user_id 
       WHERE Invitations.event_id = ?`,
      [event_id]
    );

    res.json({ data: attendees });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove an attendee from the event (organizers only)
app.delete('/api/events/:event_id/attendees/:user_id', authenticateToken, async (req, res) => {
  const { event_id, user_id } = req.params; // Ensure these are correctly extracted
  const organizerId = req.user.user_id;

  try {
    // Check if the current user is the organizer of the event
    const event = await getDbRow(`SELECT organizer_id FROM Events WHERE event_id = ?`, [event_id]);
    if (!event || event.organizer_id !== organizerId) {
      throw new Error("You are not authorized to remove attendees from this event.");
    }

    // Ensure user_id is treated as a string or number properly
    if (!/^\d+$/.test(user_id)) {
      throw new Error("Invalid user_id format.");
    }

    // Delete the attendee from the Invitations table
    await runDbQuery(
      `DELETE FROM Invitations WHERE event_id = ? AND user_id = ?`,
      [event_id, parseInt(user_id)] // Convert user_id to an integer
    );

    res.status(200).json({ message: "Attendee removed successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
  const { venue_id, name, description, start_date, end_date, invite_only = false } = req.body;

  try {
    // Validate required fields
    if (!venue_id || !name || !description || !start_date || !end_date) {
      throw new Error("Venue ID, name, description, start_date, and end_date are required.");
    }

    // Validate date range
    const { start, end } = validateDateRange(start_date, end_date);

    // Check if the venue exists
    const venue = await getDbRow(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [venue_id]);
    if (!venue) {
      throw new Error("Venue not found.");
    }

    const isOwner = venue.owner_id === userId;

    if (isOwner) {
      // Owner-specific validation: Check for date overlaps with other rentals
      const rentals = await queryDb(
        `SELECT start_date, end_date 
         FROM Venue_Rentals 
         WHERE venue_id = ? AND user_id != ?`,
        [venue_id, userId]
      );

      if (checkOverlap(start, end, rentals)) {
        throw new Error("Event dates overlap with an existing rental by another user.");
      }

      // Insert event for owners
      await runDbQuery(
        `INSERT INTO Events (venue_id, organizer_id, name, description, start_date, end_date, invite_only) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [venue_id, userId, name, description, start, end, invite_only ? 1 : 0]
      );
    } else {
      // Renter-specific validation: Check if the user has a valid rental
      const rental = await getDbRow(
        `SELECT start_date, end_date 
         FROM Venue_Rentals 
         WHERE venue_id = ? AND user_id = ? AND end_date >= ?`,
        [venue_id, userId, new Date()]
      );

      if (!rental) {
        throw new Error("Not authorized to create an event for this venue.");
      }

      // Check if the event dates are within the rental period
      if (isBefore(start, new Date(rental.start_date)) || isAfter(end, new Date(rental.end_date))) {
        throw new Error("Event dates must fall within your rental period.");
      }

      // Insert event for renters
      await runDbQuery(
        `INSERT INTO Events (venue_id, organizer_id, name, description, start_date, end_date, invite_only) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [venue_id, userId, name, description, start, end, invite_only ? 1 : 0]
      );
    }

    // Fetch the newly created event ID
    const event = await getDbRow(`SELECT last_insert_rowid() AS event_id`);

    res.status(201).json({ message: "Event created successfully.", event_id: event.event_id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event information
app.put('/api/events/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; // Event ID
  const { name, description, start_date, end_date, invite_only } = req.body; // Event data
  const userId = req.user.user_id; // Authenticated user ID

  try {
    // Check if the user has access to the event
    const event = await getDbRow(
      `SELECT organizer_id, venue_id FROM Events WHERE event_id = ?`,
      [id]
    );

    if (!event) {
      throw new Error("Event not found.");
    }

    // Ensure the user is the organizer
    if (event.organizer_id !== userId) {
      throw new Error("You are not authorized to update this event.");
    }

    // Initialize query components
    const fieldsToUpdate = [];
    const queryParams = [];

    // Update the name if provided
    if (name) {
      fieldsToUpdate.push("name = ?");
      queryParams.push(name);
    }

    // Update the description if provided
    if (description) {
      fieldsToUpdate.push("description = ?");
      queryParams.push(description);
    }

    // Update the start_date and end_date if both are provided
    if (start_date && end_date) {
      const { start, end } = validateDateRange(start_date, end_date);

      // Check for date conflicts with other rentals or events at the same venue
      const conflicts = await queryDb(
        `SELECT 1 
         FROM Events 
         WHERE venue_id = ? 
         AND event_id != ? 
         AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))`,
        [event.venue_id, id, end, start, end, start]
      );

      if (conflicts.length > 0) {
        throw new Error("The updated event dates conflict with another event.");
      }

      fieldsToUpdate.push("start_date = ?", "end_date = ?");
      queryParams.push(start_date, end_date);
    }

    // Update the invite_only field if provided
    if (typeof invite_only !== "undefined") {
      fieldsToUpdate.push("invite_only = ?");
      queryParams.push(invite_only ? 1 : 0); // Convert to 1/0 for boolean values
    }

    if (fieldsToUpdate.length === 0) {
      throw new Error("No valid fields to update.");
    }

    queryParams.push(id); // Add event ID to the end of the params

    // Execute the update query
    const query = `UPDATE Events SET ${fieldsToUpdate.join(", ")} WHERE event_id = ?`;
    const changes = await runDbQuery(query, queryParams);

    if (changes === 0) {
      throw new Error("No changes made to the event.");
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

// Create an invitation (accessible by event organizers or users inviting themselves if not invite-only)
app.post('/api/invitations', authenticateToken, async (req, res) => {
  const userId = req.user.user_id; // Authenticated user ID
  const userEmail = req.user.email; // Authenticated user's email from token
  const { event_id, email = null, status = "Sent" } = req.body;

  try {
    // Fetch event and venue information
    const eventInfo = await getDbRow(
      `SELECT E.organizer_id, V.owner_id, V.capacity, E.invite_only 
       FROM Events AS E 
       JOIN Venues AS V ON E.venue_id = V.venue_id 
       WHERE E.event_id = ?`,
      [event_id]
    );

    if (!eventInfo) throw new Error("Event not found.");

    const { organizer_id, owner_id, capacity, invite_only } = eventInfo;

    // Handle self-invitation if no email is provided
    if (!email) {
      // Self-invitation logic
      if (invite_only) {
        throw new Error("Self-invitation is not allowed for invite-only events.");
      }

      // Prevent the event organizer from inviting themselves
      if (organizer_id === userId) {
        throw new Error("The event organizer cannot invite themselves.");
      }

      // Check if the user is already invited
      const existingInvitation = await getDbRow(
        `SELECT * FROM Invitations WHERE event_id = ? AND user_id = ?`,
        [event_id, userId]
      );

      if (existingInvitation) {
        throw new Error("You are already invited to this event.");
      }

      // Check venue capacity for accepted invitations
      const acceptedCount = await getDbRow(
        `SELECT COUNT(*) AS accepted_count 
         FROM Invitations 
         WHERE event_id = ? AND status = 'Accepted'`,
        [event_id]
      );

      if (acceptedCount.accepted_count >= capacity) {
        throw new Error("The venue has reached its maximum capacity.");
      }

      // Add a self-invitation for the user
      const selfInvitationId = await runDbQuery(
        `INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, ?)`,
        [event_id, userId, "Accepted"]
      );

      return res.status(201).json({
        message: "You have successfully joined the event.",
        invitation_id: selfInvitationId
      });
    }

    // Organizer or owner sending invitations
    const isOrganizerOrOwner = organizer_id === userId || owner_id === userId;

    if (!isOrganizerOrOwner) {
      throw new Error("You do not have permission to send invitations for this event.");
    }

    // Prevent the event organizer from inviting themselves explicitly via email
    if (email === userEmail) {
      throw new Error("The event organizer cannot invite themselves.");
    }

    // Check if the venue capacity is exceeded
    const acceptedCount = await getDbRow(
      `SELECT COUNT(*) AS accepted_count 
       FROM Invitations 
       WHERE event_id = ? AND status = 'Accepted'`,
      [event_id]
    );

    if (status === "Accepted" && acceptedCount.accepted_count >= capacity) {
      throw new Error("The venue has reached its maximum capacity.");
    }

    // Check if the invitee already exists
    let inviteeId = await getDbRow(`SELECT user_id FROM Users WHERE email = ?`, [email]);

    if (!inviteeId) {
      // Create a new user if not found
      inviteeId = await runDbQuery(
        `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
        ["New User", email, "PlaceholderPassword"]
      );
    }

    // Create the invitation
    const invitationId = await runDbQuery(
      `INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, ?)`,
      [event_id, inviteeId.user_id || inviteeId, status]
    );

    // Create a notification for the invitee
    await runDbQuery(
      `INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
      [inviteeId.user_id || inviteeId, event_id, `You have been invited to event ID ${event_id}.`]
    );

    res.status(201).json({
      message: "Invitation created successfully",
      invitation_id: invitationId
    });
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

// Get all invitations for the authenticated user - ✅
app.get('/api/users/me/invites', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const invites = await queryDb(`
      SELECT 
        E.event_id, 
        E.name AS event_name, 
        E.start_date, 
        E.end_date, 
        V.name AS venue_name, 
        V.location AS venue_location 
      FROM Invitations I
      JOIN Events E ON I.event_id = E.event_id
      JOIN Venues V ON E.venue_id = V.venue_id
      WHERE I.user_id = ? AND I.status = 'Sent'`,
      [userId]
    );

    res.json({ data: invites });
  } catch (error) {
    res.status(500).json({ error: "Error fetching invitations." });
  }
});

// Accept an invitation - ✅
app.post('/api/invitations/:event_id/accept', authenticateToken, async (req, res) => {
  const { event_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // Update the invitation status to Accepted
    await runDbQuery(
      `UPDATE Invitations 
       SET status = 'Accepted' 
       WHERE event_id = ? AND user_id = ? AND status = 'Sent'`,
      [event_id, user_id]
    );

    res.status(200).json({ message: "Invitation accepted successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch accepted invites for the authenticated user - ✅
app.get('/api/users/me/accepted-invites', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const events = await queryDb(
      `SELECT 
         E.event_id, 
         E.name AS event_name, 
         E.start_date, 
         E.end_date, 
         V.name AS venue_name, 
         V.location AS venue_location 
       FROM Invitations I
       JOIN Events E ON I.event_id = E.event_id
       JOIN Venues V ON E.venue_id = V.venue_id
       WHERE I.user_id = ? AND I.status = 'Accepted'`,
      [user_id]
    );

    res.json({ data: events });
  } catch (error) {
    res.status(500).json({ error: "Error fetching accepted invites." });
  }
});

// Send an invitation to a user for an event - ✅
app.post('/api/events/:event_id/invite', authenticateToken, async (req, res) => {
  const { event_id } = req.params;
  const { email } = req.body;
  const organizer_id = req.user.user_id;

  try {
    if (!email) {
      throw new Error("Email is required to send an invitation.");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format.');
    }

    // Check if the event exists and if the user is the organizer
    const event = await getDbRow(`SELECT * FROM Events WHERE event_id = ?`, [event_id]);
    if (!event) throw new Error("Event not found.");
    if (event.organizer_id !== organizer_id) {
      throw new Error("Only the organizer can send invitations for this event.");
    }

    // Prevent organizer from inviting themselves
    if (email === req.user.email) {
      throw new Error("You cannot invite yourself to your own event.");
    }

    // Check if the email belongs to an existing user
    let user = await getDbRow(`SELECT * FROM Users WHERE email = ?`, [email]);

    if (!user) {
      // Create a new user with a temporary password
      const temporaryPassword = crypto.randomBytes(12).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const newUserId = await runDbQuery(
        `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
        ["New User", email, hashedPassword]
      );
      user = { user_id: newUserId };
      // Generate a unique token for completing the profile
      const token = uuidv4();
      await runDbQuery(
        `INSERT INTO Tokens (user_id, token) VALUES (?, ?)`,
        [user.user_id, token]
      );

      // Construct the invite link and send email
      const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      const inviteLink = `${baseUrl}/complete-signup?token=${token}`;
      await sendEmail(email, {
        subject: "You're Invited!",
        event_name: event.name,
        event_start_date: event.start_date,
        event_end_date: event.end_date,
        event_venue_name: event.venue_name,
        event_venue_location: event.venue_location,
        invite_link: inviteLink,
      });

      // Add the user to the Invitations table
      await runDbQuery(
        `INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, "Sent")`,
        [event_id, user.user_id]
      );
    } else {
      // If the user exists, check for duplicate invitations
      const existingInvitation = await getDbRow(
        `SELECT * FROM Invitations WHERE event_id = ? AND user_id = ?`,
        [event_id, user.user_id]
      );
      if (existingInvitation) {
        throw new Error("This user has already been invited to the event.");
      }

      await runDbQuery(
        `INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, "Sent")`,
        [event_id, user.user_id]
      );

      // Notify the existing user
      // await sendEmail(email, {
      //   subject: "You're Invited!",
      //   html: `
      //     <p>You have been invited to the event <b>${event.name}</b>!</p>
      //     <p>Log in to your account to view the details.</p>
      //   `,
      //   text: `You have been invited to the event "${event.name}". Log in to your account to view the details.`,
      // });
    }

    res.status(201).json({ message: "Invitation sent successfully!" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

// Complete user registration after receiving an invitation - ✅
app.post('/api/users/complete-signup', async (req, res) => {
  const { token, name, password } = req.body;

  try {
    if (!token || !name || !password) {
      throw new Error("Token, name, and password are required.");
    }

    // Retrieve the user associated with the token
    const tokenData = await getDbRow(`SELECT * FROM Tokens WHERE token = ?`, [token]);
    if (!tokenData) {
      throw new Error("Invalid or expired token.");
    }

    // Update the user's profile
    const hashedPassword = await bcrypt.hash(password, 10);
    await runDbQuery(
      `UPDATE Users SET name = ?, password = ? WHERE user_id = ?`,
      [name, hashedPassword, tokenData.user_id]
    );

    // Remove the token after successful registration
    await runDbQuery(`DELETE FROM Tokens WHERE token = ?`, [token]);

    res.json({ message: "Signup completed successfully." });
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

// Mark all notifications as read
app.post('/api/notifications/readall', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Update all notifications for the authenticated user to "Read"
    const changes = await runDbQuery(
      `UPDATE Notifications SET status = "Read" WHERE user_id = ? AND status = "Unread"`,
      [userId]
    );

    if (changes === 0) {
      return res.status(200).json({ message: "No unread notifications to update." });
    }

    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error marking notifications as read:", error.message);
    res.status(500).json({ error: "An error occurred while marking notifications as read." });
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

// // Register a new user
// app.post('/api/register', async (req, res) => {
//   const { name, email, password } = req.body;

//   try {
//     // Validate input
//     validateRegistrationInput({ name, email, password });

//     // Check if email already exists
//     const existingUser = await getDbRow(`SELECT email FROM Users WHERE email = ?`, [email]);
//     if (existingUser) {
//       throw new Error("Email already registered. Please use a different email.");
//     }

//     // Hash the password
//     const hashedPassword = await hashPassword(password);

//     // Insert user into the database
//     const userId = await runDbQuery(
//       `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
//       [name, email, hashedPassword]
//     );

//     res.status(201).json({ message: "User registered successfully", user_id: userId });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Login
// app.post('/api/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await getDbRow('SELECT * FROM Users WHERE email = ?', [email]);
//     if (!user || !(await bcrypt.compare(password, user.password))) {
//       throw new Error('Invalid email or password.');
//     }

//     // Generate JWT token
//     const token = jwt.sign({ user_id: user.user_id, email: user.email }, secretKey, { expiresIn: '1h' });

//     // Set the JWT as an HTTP-only cookie
//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'Strict',
//       maxAge: 3600000, // 1 hour
//     });

//     // Also return the token in the response body (for Postman)
//     res.json({ token });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Logout (clear cookie)
// app.post('/api/logout', authenticateToken, (req, res) => {
//   try {
//     // Clear the authentication token cookie
//     res.clearCookie("token", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production", // Ensures HTTPS in production
//       sameSite: "Strict" // Prevents CSRF attacks
//     });

//     // Send a success response
//     res.status(200).json({ message: "Logged out successfully" });
//   } catch (error) {
//     // Catch unexpected errors
//     res.status(500).json({ error: "An error occurred during logout" });
//   }
// });

// Get user auth status
app.get('/api/auth/session', (req, res) => {
  const token = req.cookies.token; // Retrieve the token from the HTTP-only cookie

  if (!token) {
    // If no token is found, return a consistent response indicating the user is not authenticated
    return res.json({ isAuthenticated: false, user: null });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      // If token verification fails, indicate the user is not authenticated
      return res.json({ isAuthenticated: false, user: null });
    }
    // If the token is valid, return the authenticated user
    res.json({ isAuthenticated: true, user });
  });
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

// Get all venues with their first image (thumbnail)
app.get('/api/venues', async (req, res) => {
  try {
    const venues = await queryDb(`
      SELECT 
        V.venue_id, 
        V.name, 
        V.location, 
        V.description, 
        V.capacity, 
        V.price, 
        (SELECT image_url FROM Images WHERE Images.venue_id = V.venue_id LIMIT 1) AS thumbnail_image
      FROM Venues V
    `);
    res.json({ data: venues });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving venues." });
  }
});

// Get a venue by ID
app.get('/api/venues/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const venue = await getDbRow(`SELECT * FROM Venues WHERE venue_id = ?`, [id]);
    if (!venue) {
      throw new Error("Venue not found.");
    }

    res.json(venue);
  } catch (error) {
    res.status(400).json({ error: error.message });
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

// Get all user owned venues - ✅
app.get('/api/users/me/venues', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const venues = await queryDb(
      `SELECT 
        V.venue_id, 
        V.name, 
        V.location, 
        V.description, 
        V.capacity, 
        V.price, 
        (SELECT image_url FROM Images WHERE Images.venue_id = V.venue_id LIMIT 1) AS thumbnail_image
       FROM Venues V
       WHERE V.owner_id = ?`,
      [userId]
    );

    res.json({ data: venues });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving your venues." });
  }
});

// --- VENUE IMAGES ENDPOINTS --- 

// Get all images for a venue
app.get('/api/venues/:venue_id/images', async (req, res) => {
  const { venue_id } = req.params;

  try {
    const images = await queryDb(
      `SELECT image_url FROM Images WHERE venue_id = ?`,
      [venue_id]
    );

    if (!images || images.length === 0) {
      return res.status(404).json({ error: "No images found for this venue." });
    }

    res.status(200).json({ images: images.map((image) => image.image_url) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch images for the venue." });
  }
});

// Upload multiple images for a venue
app.post('/api/venues/:venue_id/images', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { venue_id } = req.params;
  const user_id = req.user.user_id;
  const files = req.files; // Array of uploaded files

  try {
    // Validate the request payload
    if (!files || files.length === 0) {
      throw new Error("At least one image is required.");
    }

    // Check if the venue exists and is owned by the user
    const venue = await getDbRow(`SELECT * FROM Venues WHERE venue_id = ? AND owner_id = ?`, [venue_id, user_id]);
    if (!venue) {
      throw new Error("Venue not found or unauthorized to add images.");
    }

    // Insert each image into the database
    const insertPromises = files.map((file) =>
      runDbQuery(
        `INSERT INTO Images (venue_id, image_url) VALUES (?, ?)`,
        [venue_id, `/uploads/${file.filename}`]
      )
    );
    await Promise.all(insertPromises);

    res.status(201).json({
      message: "Images uploaded successfully.",
      images: files.map((file) => `/uploads/${file.filename}`),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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

// Create a new venue rental
app.post('/api/venue_rentals', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { venue_id, start_date, end_date } = req.body;

  try {
    // Validate input
    if (!venue_id || !start_date || !end_date) {
      throw new Error("Venue ID, start_date, and end_date are required.");
    }

    // Check date format
    validateDateFormat(start_date);
    validateDateFormat(end_date);

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
    res.json({ message: "Rental updated successfully." });
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

// Get all rentals for the authenticated user
app.get('/api/users/me/rented-venues', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const rentals = await queryDb(`
          SELECT 
            vr.rental_id, 
            vr.start_date, 
            vr.end_date, 
            v.venue_id, 
            v.name, 
            v.location, 
            v.description, 
            v.capacity, 
            v.price, 
            (SELECT image_url FROM Images WHERE Images.venue_id = v.venue_id LIMIT 1) AS thumbnail_image
          FROM Venue_Rentals vr
          JOIN Venues v ON vr.venue_id = v.venue_id
          WHERE vr.user_id = ?
      `, [userId]);

    res.status(200).json({ data: rentals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rented venues.' });
  }
});


// --- AVAILABLE_DATES ENDPOINTS --- ✅

// Get all available_dates
app.get('/api/available_dates', async (req, res) => {
  try {
    const dates = await queryDb('SELECT * FROM Available_Dates');
    res.json({ data: dates });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving available dates." });
  }
});

// Get available dates for a venue, considering rentals and events
app.get('/api/venues/:id/available_dates', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the venue exists
    const venue = await getDbRow(`SELECT * FROM Venues WHERE venue_id = ?`, [id]);
    if (!venue) throw new Error("Venue not found.");

    // Fetch all available dates for the venue
    const availableDates = await queryDb(`SELECT * FROM Available_Dates WHERE venue_id = ?`, [id]);

    // Fetch all rentals for the venue
    const rentals = await queryDb(
      `SELECT start_date, end_date FROM Venue_Rentals WHERE venue_id = ?`,
      [id]
    );

    // Fetch all events for the venue
    const events = await queryDb(
      `SELECT start_date, end_date FROM Events WHERE venue_id = ?`,
      [id]
    );

    // Remove dates that overlap with rentals or events
    const filteredDates = availableDates.filter(({ available_date }) => {
      const date = new Date(available_date);

      // Check if the date conflicts with any rental
      const rentalConflict = rentals.some(({ start_date, end_date }) => {
        const rentalStart = new Date(start_date);
        const rentalEnd = new Date(end_date);
        return date >= rentalStart && date <= rentalEnd;
      });

      // Check if the date conflicts with any event
      const eventConflict = events.some(({ start_date, end_date }) => {
        const eventStart = new Date(start_date);
        const eventEnd = new Date(end_date);
        return date >= eventStart && date <= eventEnd;
      });

      // Include the date only if it doesn't conflict with rentals or events
      return !rentalConflict && !eventConflict;
    });

    // Respond with the filtered dates
    res.json({ data: filteredDates });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new available date for a venue
app.post('/api/available_dates', authenticateToken, async (req, res) => {
  const { venue_id, available_date } = req.body;
  const userId = req.user.user_id;

  try {
    if (!venue_id || !available_date) {
      throw new Error("Both venue_id and available_date are required.");
    }

    validateDateFormat(available_date);

    // Verify ownership of the venue
    const venue = await getDbRow(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [venue_id]);
    if (!venue) throw new Error("Venue not found.");
    if (venue.owner_id !== userId) throw new Error("You do not have permission to modify available dates for this venue.");

    // Insert the new available date
    const availability_id = await runDbQuery(
      `INSERT INTO Available_Dates (venue_id, available_date) VALUES (?, ?)`,
      [venue_id, available_date]
    );

    res.status(201).json({ message: "Available date created successfully", availability_id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an available date
app.put('/api/available_dates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { venue_id, available_date } = req.body;
  const userId = req.user.user_id;

  try {
    if (!venue_id || !available_date) {
      throw new Error("Both venue_id and available_date are required.");
    }

    validateDateFormat(available_date);

    // Check venue ownership
    const venue = await getDbRow(`SELECT owner_id FROM Venues WHERE venue_id = ?`, [venue_id]);
    if (!venue) throw new Error("Venue not found.");
    if (venue.owner_id !== userId) throw new Error("You do not have permission to update this availability date.");

    // Update the availability date
    const changes = await runDbQuery(
      `UPDATE Available_Dates SET venue_id = ?, available_date = ? WHERE availability_id = ?`,
      [venue_id, available_date, id]
    );

    if (changes === 0) throw new Error("Availability date not found or no changes made.");
    res.json({ message: "Availability date updated successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an available date
app.delete('/api/available_dates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    // Verify ownership of the venue associated with the available date
    const row = await getDbRow(
      `SELECT V.owner_id 
       FROM Available_Dates AD 
       JOIN Venues V ON AD.venue_id = V.venue_id 
       WHERE AD.availability_id = ?`,
      [id]
    );

    if (!row) throw new Error("Availability date not found.");
    if (row.owner_id !== userId) throw new Error("You do not have permission to delete this availability date.");

    // Delete the availability date
    const changes = await runDbQuery(`DELETE FROM Available_Dates WHERE availability_id = ?`, [id]);

    if (changes === 0) throw new Error("Availability date not found.");
    res.json({ message: "Availability date deleted successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- END OF CRUD ENDPOINTS ---

// Start the server
startServer();