const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Open the database
const db = new sqlite3.Database('./mydb.sqlite', (err) => {
	if (err) {
		console.error('Error opening database:', err.message);
	} else {
		console.log('Connected to SQLite database');
		db.run("PRAGMA foreign_keys = ON");
	}
});

// --- SAMPLE DATA ---
// Sample users and venues arrays go here (as in your example) ...

// Insert a single user
const insertUser = (user) => {
	return new Promise((resolve, reject) => {
		bcrypt.hash(user.password, saltRounds, (err, hashedPassword) => {
			if (err) return reject('Error hashing password: ' + err);
			db.run(
				`INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
				[user.name, user.email, hashedPassword],
				function (err) {
					if (err) return reject('Error adding user: ' + err.message);
					console.log(`User added with ID: ${this.lastID}`);
					resolve(this.lastID);
				}
			);
		});
	});
};

// Insert a single venue
const insertVenue = (venue) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Venues (owner_id, name, location, description, capacity, price) VALUES (?, ?, ?, ?, ?, ?)`,
			[venue.owner_id, venue.name, venue.location, venue.description, venue.capacity, venue.price],
			function (err) {
				if (err) return reject('Error adding venue: ' + err.message);
				console.log(`Venue added with ID: ${this.lastID}`);
				resolve(this.lastID);
			}
		);
	});
};

// Populate users
const populateUsers = async () => {
	for (const user of users) {
		try {
			await insertUser(user);
		} catch (error) {
			console.error(error);
		}
	}
	console.log('All users have been added');
};

// Populate venues
const populateVenues = async () => {
	for (const venue of venues) {
		try {
			await insertVenue(venue);
		} catch (error) {
			console.error(error);
		}
	}
	console.log('All venues have been added');
};

// Main function to populate the database
const populateDatabase = async () => {
	try {
		await populateUsers();
		await populateVenues();
	} catch (error) {
		console.error('Error populating database:', error);
	} finally {
		db.close((err) => {
			if (err) {
				console.error('Error closing database:', err.message);
			} else {
				console.log('Database connection closed');
			}
		});
	}
};

populateDatabase();