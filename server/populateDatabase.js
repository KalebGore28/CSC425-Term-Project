const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { eachDayOfInterval, format, parseISO } = require('date-fns');


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
// Sample users
const users = [
	{ name: 'Alice Smith', email: 'alice.smith@example.com', password: 'password123' },
	{ name: 'Bob Johnson', email: 'bob.johnson@example.com', password: 'securepass456' },
	{ name: 'Carol White', email: 'carol.white@example.com', password: 'anotherpass789' },
	{ name: 'David Lee', email: 'david.lee@example.com', password: 'mypass1234' },
	{ name: 'Eva Adams', email: 'eva.adams@example.com', password: 'evaeva123' },
	{ name: 'Frank Green', email: 'frank.green@example.com', password: 'greenpass789' },
	{ name: 'Grace Hall', email: 'grace.hall@example.com', password: 'gracepass456' },
	{ name: 'Hank Young', email: 'hank.young@example.com', password: 'hankpass123' },
	{ name: 'Isla Brown', email: 'isla.brown@example.com', password: 'brown1234' },
	{ name: 'Jack King', email: 'jack.king@example.com', password: 'king123pass' },
	{ name: 'Lily Scott', email: 'lily.scott@example.com', password: 'lilypass789' },
	{ name: 'Mason Price', email: 'mason.price@example.com', password: 'pricepass456' },
	{ name: 'Nina Bell', email: 'nina.bell@example.com', password: 'bellpass123' },
	{ name: 'Owen Ward', email: 'owen.ward@example.com', password: 'owenpass321' },
	{ name: 'Paula Ross', email: 'paula.ross@example.com', password: 'paulapass987' },
	{ name: 'Quincy Rivera', email: 'quincy.rivera@example.com', password: 'quincypass555' },
	{ name: 'Rachel Cook', email: 'rachel.cook@example.com', password: 'cookpass123' },
	{ name: 'Sam Gray', email: 'sam.gray@example.com', password: 'graypass999' },
	{ name: 'Tina Perez', email: 'tina.perez@example.com', password: 'tinapass777' },
	{ name: 'Umar Blake', email: 'umar.blake@example.com', password: 'umarpass333' },
	{ name: 'Vera Hunt', email: 'vera.hunt@example.com', password: 'verapass888' },
	{ name: 'Will Nash', email: 'will.nash@example.com', password: 'willpass444' },
	{ name: 'Xena Rose', email: 'xena.rose@example.com', password: 'xenapass666' },
	{ name: 'Yara Diaz', email: 'yara.diaz@example.com', password: 'yarapass555' },
	{ name: 'Zane Cruz', email: 'zane.cruz@example.com', password: 'zanepass222' },
];

// Sample venues
const venues = [
	{ owner_id: 1, name: "Grand Hall", location: "Downtown", description: "Elegant venue for all occasions", capacity: 100, price: 500 },
	{ owner_id: 2, name: "Skyline Terrace", location: "City Heights", description: "Rooftop views and open ambiance", capacity: 150, price: 750 },
	{ owner_id: 3, name: "Sunset Pavilion", location: "Beachside", description: "Perfect for sunset events", capacity: 80, price: 400 },
	{ owner_id: 4, name: "Modern Loft", location: "Midtown", description: "Stylish and versatile", capacity: 120, price: 600 },
	{ owner_id: 5, name: "Rustic Barn", location: "Countryside", description: "Charming rustic setting", capacity: 200, price: 900 },
	{ owner_id: 1, name: "Elegance Ballroom", location: "Old Town", description: "Classic ballroom with grand decor", capacity: 180, price: 850 },
	{ owner_id: 2, name: "Lakeside Retreat", location: "Lake District", description: "Tranquil lakeside venue", capacity: 90, price: 500 },
	{ owner_id: 3, name: "Art Deco Space", location: "Museum District", description: "Artistic setting for creative events", capacity: 60, price: 400 },
	{ owner_id: 4, name: "Green Garden", location: "Uptown", description: "Lush outdoor venue", capacity: 140, price: 700 },
	{ owner_id: 5, name: "Vintage Theater", location: "Historic District", description: "Classic theater for unique events", capacity: 250, price: 950 },
	{ owner_id: 1, name: "Urban Rooftop", location: "Financial District", description: "Trendy rooftop space", capacity: 110, price: 600 },
	{ owner_id: 2, name: "Country Club", location: "Suburbia", description: "Exclusive country club setting", capacity: 200, price: 1000 },
	{ owner_id: 3, name: "Zen Garden", location: "Asian Quarter", description: "Peaceful garden for serene gatherings", capacity: 70, price: 450 },
	{ owner_id: 4, name: "Beachfront Deck", location: "Coastal Area", description: "Direct beach access and views", capacity: 130, price: 750 },
	{ owner_id: 5, name: "Mountain Lodge", location: "Highlands", description: "Rustic lodge with mountain views", capacity: 150, price: 850 },
	{ owner_id: 1, name: "Industrial Warehouse", location: "Warehouse District", description: "Open space for modern events", capacity: 220, price: 700 },
	{ owner_id: 2, name: "Castle Grounds", location: "Outskirts", description: "Historic castle with expansive grounds", capacity: 300, price: 1200 },
	{ owner_id: 3, name: "Forest Clearing", location: "Wilderness", description: "Natural forest setting", capacity: 90, price: 500 },
	{ owner_id: 4, name: "Riverfront Hall", location: "Riverside", description: "Beautiful river views", capacity: 180, price: 800 },
	{ owner_id: 5, name: "Artisan Loft", location: "Art District", description: "Creative loft for artistic events", capacity: 60, price: 450 }
];

// Define start and end dates for the available date range
const startDate = parseISO('2024-11-25');
const endDate = parseISO('2025-02-28');
venueIds = [1, 2, 3, 4, 5];

// Generate available dates for each venue in the specified date range
const generateAvailableDates = () => {
	try {
		const dates = eachDayOfInterval({ start: startDate, end: endDate }).map(date => format(date, 'yyyy-MM-dd'));

		const availableDates = [];
		for (const venueId of venueIds) {
			for (const date of dates) {
				availableDates.push({ venue_id: venueId, available_date: date });
			}
		}
		console.log(`Total dates generated: ${availableDates.length}`);
		return availableDates;
	} catch (error) {
		console.error('Error generating dates:', error);
		return [];
	}
};

// Sample rental bookings data
const venueRentals = [
	// Venue 1 Rentals
	{ user_id: 6, venue_id: 1, start_date: '2024-11-25', end_date: '2024-11-26' },
	{ user_id: 7, venue_id: 1, start_date: '2024-12-01', end_date: '2024-12-03' },
	{ user_id: 8, venue_id: 1, start_date: '2024-12-10', end_date: '2024-12-12' },
	// Open dates for Venue 1: '2024-12-15' to '2024-12-20'

	// Venue 2 Rentals
	{ user_id: 8, venue_id: 2, start_date: '2024-12-05', end_date: '2024-12-07' },
	{ user_id: 9, venue_id: 2, start_date: '2025-01-01', end_date: '2025-01-03' },
	{ user_id: 10, venue_id: 2, start_date: '2025-01-10', end_date: '2025-01-12' },
	// Open dates for Venue 2: '2025-01-15' to '2025-01-20'

	// Venue 3 Rentals
	{ user_id: 9, venue_id: 3, start_date: '2025-01-10', end_date: '2025-01-12' },
	{ user_id: 10, venue_id: 3, start_date: '2025-01-18', end_date: '2025-01-20' },
	// Open dates for Venue 3: '2025-01-25' to '2025-01-30'

	// Venue 4 Rentals
	{ user_id: 6, venue_id: 4, start_date: '2025-01-15', end_date: '2025-01-17' },
	{ user_id: 7, venue_id: 4, start_date: '2025-01-22', end_date: '2025-01-24' },
	// Open dates for Venue 4: '2025-01-28' to '2025-02-01'

	// Venue 5 Rentals
	{ user_id: 8, venue_id: 5, start_date: '2024-12-15', end_date: '2024-12-17' },
	{ user_id: 9, venue_id: 5, start_date: '2024-12-20', end_date: '2024-12-22' },
	{ user_id: 10, venue_id: 5, start_date: '2024-12-27', end_date: '2024-12-29' },
	// Open dates for Venue 5: '2025-01-05' to '2025-01-10'
];


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

// Insert a single available date
const insertAvailableDate = (date) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Available_Dates (venue_id, available_date) VALUES (?, ?)`,
			[date.venue_id, date.available_date],
			function (err) {
				if (err) return reject('Error adding available date: ' + err.message);
				console.log(`Available date added for venue ${date.venue_id} on ${date.available_date}`);
				resolve();
			}
		);
	});
};

// Insert a single rental booking
const insertRentalBooking = (rental) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Venue_Rentals (user_id, venue_id, start_date, end_date) VALUES (?, ?, ?, ?)`,
			[rental.user_id, rental.venue_id, rental.start_date, rental.end_date],
			function (err) {
				if (err) return reject('Error adding rental booking: ' + err.message);
				console.log(`Rental booking added with ID: ${this.lastID} for user ${rental.user_id} at venue ${rental.venue_id}`);
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

// Populate available dates dynamically
const populateAvailableDates = async () => {
	const availableDates = generateAvailableDates();
	for (const date of availableDates) {
		try {
			await insertAvailableDate(date);
		} catch (error) {
			console.error(`Error inserting date for venue ${date.venue_id} on ${date.available_date}:`, error);
		}
	}
	console.log('All available dates have been added');
};

// Populate venue rentals
const populateVenueRentals = async () => {
	for (const rental of venueRentals) {
		try {
			await insertRentalBooking(rental);
		} catch (error) {
			console.error(error);
		}
	}
	console.log('All rental bookings have been added');
};


// Main function to populate the database
const populateDatabase = async () => {
	try {
		await populateUsers();
		await populateVenues();
		await populateAvailableDates();
		await populateVenueRentals();
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