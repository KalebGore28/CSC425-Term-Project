const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
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
	// Owners of venues
	{ name: 'Alice Smith', email: 'alice.smith@example.com', password: 'password123' },
	{ name: 'Bob Johnson', email: 'bob.johnson@example.com', password: 'securepass456' },
	{ name: 'Carol White', email: 'carol.white@example.com', password: 'anotherpass789' },
	{ name: 'David Lee', email: 'david.lee@example.com', password: 'mypass1234' },
	{ name: 'Eva Adams', email: 'eva.adams@example.com', password: 'evaeva123' },
	// Renters of venues
	{ name: 'Frank Green', email: 'frank.green@example.com', password: 'greenpass789' },
	{ name: 'Grace Hall', email: 'grace.hall@example.com', password: 'gracepass456' },
	{ name: 'Hank Young', email: 'hank.young@example.com', password: 'hankpass123' },
	{ name: 'Isla Brown', email: 'isla.brown@example.com', password: 'brown1234' },
	{ name: 'Jack King', email: 'jack.king@example.com', password: 'king123pass' },
	// Attendees of events
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
	{ name: 'Xena Rose', email: 'xena.rose@example.com', password: 'xenapass555' },
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

// Sample Dates Generation

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
	{ user_id: 6, venue_id: 1, start_date: '2024-11-25', end_date: '2024-11-27' },
	{ user_id: 7, venue_id: 1, start_date: '2024-11-26', end_date: '2024-11-28' },
	{ user_id: 8, venue_id: 1, start_date: '2024-12-01', end_date: '2024-12-03' },

	// Venue 2 Rentals
	{ user_id: 8, venue_id: 2, start_date: '2024-12-02', end_date: '2024-12-04' },
	{ user_id: 9, venue_id: 2, start_date: '2024-12-05', end_date: '2024-12-07' },
	{ user_id: 10, venue_id: 2, start_date: '2024-12-10', end_date: '2024-12-12' },

	// Venue 3 Rentals
	{ user_id: 9, venue_id: 3, start_date: '2024-12-10', end_date: '2024-12-12' },
	{ user_id: 10, venue_id: 3, start_date: '2024-12-15', end_date: '2024-12-17' },

	// Venue 4 Rentals
	{ user_id: 6, venue_id: 4, start_date: '2024-12-16', end_date: '2024-12-18' },
	{ user_id: 7, venue_id: 4, start_date: '2024-12-18', end_date: '2024-12-20' },

	// Venue 5 Rentals
	{ user_id: 8, venue_id: 5, start_date: '2024-12-15', end_date: '2024-12-17' },
	{ user_id: 9, venue_id: 5, start_date: '2024-12-16', end_date: '2024-12-18' },
	{ user_id: 10, venue_id: 5, start_date: '2024-12-20', end_date: '2024-12-22' },
];

// Sample custom event data
const customEventData = [
	{ name: "Networking Mixer", description: "A night of connecting with local professionals." },
	{ name: "Wedding Celebration", description: "A beautiful wedding ceremony and reception." },
	{ name: "Corporate Seminar", description: "An insightful seminar for business professionals." },
	{ name: "Art Exhibit Opening", description: "Showcasing the latest in contemporary art." },
	{ name: "Charity Gala", description: "An evening to support a good cause." },
	{ name: "Tech Conference", description: "Bringing together tech enthusiasts and experts." },
	{ name: "Birthday Bash", description: "A grand celebration for friends and family." },
	{ name: "Fashion Show", description: "Showcasing the latest trends in fashion." },
	{ name: "Product Launch", description: "Introducing an exciting new product." },
	{ name: "Community Potluck", description: "A gathering to enjoy diverse culinary treats." }
];

// Requires shuffling events for every user invitation to avoid overlapping events having no accepted invitations
// Utility function to shuffle an array
const shuffleArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

// Create personalized events based on venue rentals and custom data
const createEventsFromRentals = (rentals) => {
	return rentals.map((rental, index) => {
		const customEvent = customEventData[index % customEventData.length]; // Cycle through custom events
		return {
			venue_id: rental.venue_id,
			organizer_id: rental.user_id,
			name: customEvent.name,
			description: customEvent.description,
			start_date: rental.start_date,
			end_date: rental.end_date,
		};
	});
};

// Generate invitations/notifications ensuring no overlapping accepted events for each user
const createInvitationsForEvents = async (events) => {
	const invitedUsers = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
	const invitations = [];

	for (const user_id of invitedUsers) {
		const acceptedInvitationsForUser = [];
		const shuffledEvents = shuffleArray([...events]); // Shuffle events for each user

		for (const event of shuffledEvents) {
			// Check for overlap with the user's already accepted invitations
			const hasOverlap = acceptedInvitationsForUser.some(inv =>
				(event.start_date <= inv.end_date && event.end_date >= inv.start_date)
			);

			// If no overlap, mark as 'Accepted' and add to accepted invitations
			const status = hasOverlap ? 'Sent' : 'Accepted';
			invitations.push({ event_id: event.id, user_id, status });

			if (status === 'Accepted') {
				acceptedInvitationsForUser.push({
					start_date: event.start_date,
					end_date: event.end_date
				});
			}
		}
	}

	// Insert invitations into the database
	for (const invitation of invitations) {
		try {
			await insertInvitation(invitation);
			// Create notification for the invitation
			const message = `You have received an invitation for the event with status "${invitation.status}".`;
			await insertNotification(invitation.user_id, invitation.event_id, message);
		} catch (error) {
			console.error(error);
		}
	}
	console.log('All invitations and notifications have been added');
};

// Sample post content based on event types
const postContent = {
	"Networking Mixer": [
		"Looking forward to meeting new people!",
		"Excited to network and learn about others' experiences.",
		"Anyone else here for the first time?",
		"Great venue for a networking event!",
	],
	"Wedding Celebration": [
		"Congratulations to the happy couple!",
		"Such a beautiful ceremony!",
		"Everything is just perfect here!",
		"Love the decor and the atmosphere!",
	],
	"Corporate Seminar": [
		"Very informative sessions today.",
		"Learning so much from these presentations.",
		"Anyone else here from a similar field?",
		"Great opportunity for growth and learning.",
	],
	"Art Exhibit Opening": [
		"Such inspiring artwork!",
		"Great to see so many talented artists in one place.",
		"Loved the themes and variety in the exhibit.",
		"Amazing pieces on display!",
	],
	"Charity Gala": [
		"Proud to be supporting a good cause.",
		"Such a wonderful event for a great cause.",
		"Lovely atmosphere and people here tonight!",
		"Happy to contribute to this important mission.",
	],
	"Tech Conference": [
		"Fantastic lineup of speakers today!",
		"Learning so much about new tech trends.",
		"Anyone else working in the same industry?",
		"Excited to apply some of these ideas at work.",
	],
	"Birthday Bash": [
		"Happy birthday to the birthday star!",
		"Such a fun celebration!",
		"Love the decorations and vibe here!",
		"Hope everyone is having a great time!",
	],
	"Fashion Show": [
		"Beautiful outfits on display!",
		"Loved the style and creativity here.",
		"Such an inspiring event for fashion lovers.",
		"Great to see so much talent on the runway.",
	],
	"Product Launch": [
		"Excited about this new product!",
		"Amazing innovation on display.",
		"Great launch event and energy!",
		"Looking forward to seeing how it performs.",
	],
	"Community Potluck": [
		"Such a diverse spread of dishes!",
		"Enjoying all the homemade food here.",
		"Great to share food and meet the community.",
		"Everything looks and tastes amazing!",
	],
};

// --- INSERT FUNCTIONS ---

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

// Insert a single venue with a thumbnail
const insertVenueWithThumbnail = (venue, thumbnailImageId) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Venues (owner_id, name, location, description, capacity, price, thumbnail_image_id) 
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				venue.owner_id,
				venue.name,
				venue.location,
				venue.description,
				venue.capacity,
				venue.price,
				thumbnailImageId,
			],
			function (err) {
				if (err) return reject("Error adding venue: " + err.message);
				resolve(this.lastID);
			}
		);
	});
};

// Insert a single image
const insertImage = (image) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Images (venue_id, image_url) VALUES (?, ?)`,
			[image.venue_id, image.image_url],
			function (err) {
				if (err) return reject("Error adding image: " + err.message);
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

// Insert a single event
const insertEvent = (event) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Events (venue_id, organizer_id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`,
			[event.venue_id, event.organizer_id, event.name, event.description, event.start_date, event.end_date],
			function (err) {
				if (err) return reject('Error adding event: ' + err.message);
				console.log(`Event added with ID: ${this.lastID} for venue ${event.venue_id}`);
				resolve(this.lastID);
			}
		);
	});
};

// Insert a single invitation
const insertInvitation = (invitation) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Invitations (event_id, user_id, status) VALUES (?, ?, ?)`,
			[invitation.event_id, invitation.user_id, invitation.status],
			function (err) {
				if (err) return reject('Error adding invitation: ' + err.message);
				console.log(`Invitation added for event ${invitation.event_id} and user ${invitation.user_id}`);
				resolve();
			}
		);
	});
};

// Insert a single notification
const insertNotification = (user_id, event_id, message) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Notifications (user_id, event_id, message) VALUES (?, ?, ?)`,
			[user_id, event_id, message],
			function (err) {
				if (err) return reject('Error adding notification: ' + err.message);
				console.log(`Notification added for user ${user_id} regarding event ${event_id}`);
				resolve();
			}
		);
	});
};

// Insert a single community post
const insertCommunityPost = (post) => {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO Community_Posts (event_id, user_id, content) VALUES (?, ?, ?)`,
			[post.event_id, post.user_id, post.content],
			function (err) {
				if (err) return reject('Error adding community post: ' + err.message);
				console.log(`Community post added with ID: ${this.lastID} for user ${post.user_id} in event ${post.event_id}`);
				resolve(this.lastID);
			}
		);
	});
};

// --- POPULATE FUNCTIONS ---

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

const populateVenuesWithImages = async () => {
	const uploadsDirectory = path.join(__dirname, './uploads'); // Directory for uploaded images

	for (let i = 0; i < venues.length; i++) {
		const venue = venues[i];
		const imageFile = `venue${i + 1}.webp`; // Image name based on the venue index
		const imagePath = `/uploads/${imageFile}`; // Path for database entry
		const fullImagePath = path.join(uploadsDirectory, imageFile); // Full path for existence check

		console.log(`Processing venue: ${venue.name}, Image File: ${imageFile}, Path: ${imagePath}`);

		try {
			// Check if the image file exists
			if (!fs.existsSync(fullImagePath)) {
				console.warn(`Image file not found: ${fullImagePath}`);
				continue; // Skip this venue if the image is missing
			}

			// Insert the venue first
			const venueId = await new Promise((resolve, reject) => {
				db.run(
					`INSERT INTO Venues (owner_id, name, location, description, capacity, price, thumbnail_image_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[
						venue.owner_id,
						venue.name,
						venue.location,
						venue.description,
						venue.capacity,
						venue.price,
						null, // Temporary placeholder for thumbnail_image_id
					],
					function (err) {
						if (err) {
							console.error(`Error inserting venue "${venue.name}":`, err.message);
							return reject(err);
						}
						resolve(this.lastID);
					}
				);
			});

			console.log(`Venue "${venue.name}" inserted with ID: ${venueId}`);

			// Insert the image with the correct venue_id
			const imageId = await new Promise((resolve, reject) => {
				db.run(
					`INSERT INTO Images (venue_id, image_url) VALUES (?, ?)`,
					[venueId, imagePath],
					function (err) {
						if (err) {
							console.error(`Error inserting image for venue "${venue.name}":`, err.message);
							return reject(err);
						}
						resolve(this.lastID);
					}
				);
			});

			console.log(`Image "${imageFile}" inserted with ID: ${imageId}`);

			// Update the venue's thumbnail_image_id
			await new Promise((resolve, reject) => {
				db.run(
					`UPDATE Venues SET thumbnail_image_id = ? WHERE venue_id = ?`,
					[imageId, venueId],
					function (err) {
						if (err) {
							console.error(`Error updating thumbnail_image_id for venue "${venue.name}":`, err.message);
							return reject(err);
						}
						resolve();
					}
				);
			});

			console.log(`Venue "${venue.name}" linked to thumbnail image ID: ${imageId}`);
		} catch (error) {
			console.error(`Error processing venue "${venue.name}":`, error.message);
		}
	}
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

// Populate events and generate invitations/notifications
const populateEventInvitationsNotifications = async () => {
	const events = createEventsFromRentals(venueRentals);
	const eventIds = [];

	for (const event of events) {
		try {
			const eventId = await insertEvent(event);
			eventIds.push({ ...event, id: eventId });
		} catch (error) {
			console.error(error);
		}
	}
	console.log('All events have been added');

	// Generate and add invitations based on events
	await createInvitationsForEvents(eventIds);
};

// Populate community posts
const populateCommunityPosts = async () => {
	try {
		const acceptedInvitations = await new Promise((resolve, reject) => {
			db.all(`SELECT event_id, user_id FROM Invitations WHERE status = 'Accepted'`, (err, rows) => {
				if (err) {
					return reject('Error querying accepted invitations: ' + err.message);
				}
				resolve(rows);
			});
		});

		// Prepare community posts array
		const communityPosts = [];

		for (const { event_id, user_id } of acceptedInvitations) {
			const eventName = await new Promise((resolve, reject) => {
				db.get(`SELECT name FROM Events WHERE event_id = ?`, [event_id], (err, row) => {
					if (err) return reject('Error fetching event name: ' + err.message);
					resolve(row?.name);
				});
			});

			// Add a community post for a subset of users for realism
			const possiblePosts = postContent[eventName];
			if (possiblePosts && Math.random() < 0.6) {  // 60% chance of posting
				const content = possiblePosts[Math.floor(Math.random() * possiblePosts.length)];
				communityPosts.push({ event_id, user_id, content });
			}
		}

		// Insert community posts into the database
		for (const post of communityPosts) {
			try {
				await insertCommunityPost(post);
			} catch (error) {
				console.error('Error inserting community post:', error.message);
			}
		}
		console.log('All community posts have been added');
	} catch (error) {
		console.error(error);
	}
};

// Main function to populate the database
const populateDatabase = async () => {
	try {
		await populateUsers();
		await populateVenuesWithImages();
		await populateAvailableDates();
		await populateVenueRentals();
		await populateEventInvitationsNotifications();
		await populateCommunityPosts();
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