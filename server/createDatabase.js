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
  )`, (err) => {
    if (err) {
      console.error('Error creating Users table:', err.message);
    } else {
      console.log('Users table created successfully');
    }
  });

  // 2. Create Venues Table without available_dates column, with owner_id
  db.run(`CREATE TABLE IF NOT EXISTS Venues (
    venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Venues table:', err.message);
    } else {
      console.log('Venues table created successfully');
    }
  });

  // 3. Create User_Venue_Rentals Table for tracking rentals only
  db.run(`CREATE TABLE IF NOT EXISTS User_Venue_Rentals (
    rental_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    venue_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating User_Venue_Rentals table:', err.message);
    } else {
      console.log('User_Venue_Rentals table created successfully');
    }
  });

  // 4. Create Events Table
  db.run(`CREATE TABLE IF NOT EXISTS Events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    organizer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE,
    FOREIGN KEY (organizer_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Events table:', err.message);
    } else {
      console.log('Events table created successfully');
    }
  });

  // 5. Create Invitations Table with user_id
  db.run(`CREATE TABLE IF NOT EXISTS Invitations (
    invitation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('Sent', 'Accepted', 'Declined')),
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Invitations table:', err.message);
    } else {
      console.log('Invitations table created successfully');
    }
  });

  // 6. Create Community_Posts Table
  db.run(`CREATE TABLE IF NOT EXISTS Community_Posts (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Community_Posts table:', err.message);
    } else {
      console.log('Community_Posts table created successfully');
    }
  });

  // 7. Create Notifications Table
  db.run(`CREATE TABLE IF NOT EXISTS Notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER,
    message TEXT NOT NULL,
    status TEXT CHECK(status IN ('Unread', 'Read')) DEFAULT 'Unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Notifications table:', err.message);
    } else {
      console.log('Notifications table created successfully');
    }
  });

  // 8. Create Available_Dates Table to manage available dates for venues
  db.run(`CREATE TABLE IF NOT EXISTS Available_Dates (
    availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    available_date TEXT NOT NULL,  -- Date in 'YYYY-MM-DD' format
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Available_Dates table:', err.message);
    } else {
      console.log('Available_Dates table created successfully');
    }
  });
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error('Error closing the database:', err.message);
  } else {
    console.log('Database connection closed');
  }
});