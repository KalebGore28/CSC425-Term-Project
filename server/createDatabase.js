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

  // 2. Create Venues Table
  db.run(`CREATE TABLE IF NOT EXISTS Venues (
    venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    price REAL,
    available_dates TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating Venues table:', err.message);
    } else {
      console.log('Venues table created successfully');
    }
  });

  // 3. Create User_Venue_Roles Table
  db.run(`CREATE TABLE IF NOT EXISTS User_Venue_Roles (
    user_venue_role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    venue_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('Owner', 'Renter')) NOT NULL,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating User_Venue_Roles table:', err.message);
    } else {
      console.log('User_Venue_Roles table created successfully');
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

  // 5. Create RSVPs Table
  db.run(`CREATE TABLE IF NOT EXISTS RSVPs (
    rsvp_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    guest_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Attending', 'Not Attending', 'Pending')) NOT NULL,
    guest_count INTEGER DEFAULT 0,
    response_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating RSVPs table:', err.message);
    } else {
      console.log('RSVPs table created successfully');
    }
  });

  // 6. Create Invitations Table
  db.run(`CREATE TABLE IF NOT EXISTS Invitations (
    invitation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('Sent', 'Accepted', 'Declined')),
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating Invitations table:', err.message);
    } else {
      console.log('Invitations table created successfully');
    }
  });

  // 7. Create Community_Posts Table
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
  )`, (err) => {
    if (err) {
      console.error('Error creating Notifications table:', err.message);
    } else {
      console.log('Notifications table created successfully');
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