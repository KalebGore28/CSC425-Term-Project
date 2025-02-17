const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mydb.sqlite');

db.serialize(() => {
  // 1. Create Users Table
  db.run(`CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, handleError('Users'));

  // 2. Create Venues Table
  db.run(`CREATE TABLE IF NOT EXISTS Venues (
    venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    price REAL,
    thumbnail_image_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (thumbnail_image_id) REFERENCES Images(image_id) ON DELETE SET NULL
  )`, handleError('Venues'));

  // 3. Create Images Table
  db.run(`CREATE TABLE IF NOT EXISTS Images (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE
  )`, handleError('Images'));

  // 4. Create Venue_Rentals Table
  db.run(`CREATE TABLE IF NOT EXISTS Venue_Rentals (
    rental_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    venue_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE
  )`, handleError('Venue_Rentals'));

  // 5. Create Events Table
  db.run(`CREATE TABLE IF NOT EXISTS Events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    organizer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    invite_only INTEGER DEFAULT 0, -- New column for invite-only status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE,
    FOREIGN KEY (organizer_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, handleError('Events'));

  // 6. Create Invitations Table
  db.run(`CREATE TABLE IF NOT EXISTS Invitations (
    invitation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('Sent', 'Accepted', 'Declined')),
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, handleError('Invitations'));

  // 7. Create Community_Posts Table
  db.run(`CREATE TABLE IF NOT EXISTS Community_Posts (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    parent_post_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES Community_Posts(post_id) ON DELETE CASCADE
)`, handleError('Community_Posts'));

  // 8. Create Notifications Table
  db.run(`CREATE TABLE IF NOT EXISTS Notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER,
    message TEXT NOT NULL,
    status TEXT CHECK(status IN ('Unread', 'Read')) DEFAULT 'Unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE
  )`, handleError('Notifications'));

  // 9. Create Available_Dates Table
  db.run(`CREATE TABLE IF NOT EXISTS Available_Dates (
    availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    available_date TEXT NOT NULL,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE
  )`, handleError('Available_Dates'));

  // 10. Create Post_Likes Table
  db.run(`CREATE TABLE IF NOT EXISTS Post_Likes (
    like_id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    UNIQUE(post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES Community_Posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
  )`, handleError('Post_Likes'));

  // 11. Create Tokens Table
  db.run(`CREATE TABLE Tokens (
    token_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);`, handleError('Tokens'));
});



// Helper function for error handling
function handleError(tableName) {
  return (err) => {
    if (err) {
      console.error(`Error creating ${tableName} table:`, err.message);
    } else {
      console.log(`${tableName} table created successfully`);
    }
  };
}

// Close the database connection
db.close((err) => {
  if (err) {
    console.error('Error closing the database:', err.message);
  } else {
    console.log('Database connection closed');
  }
});