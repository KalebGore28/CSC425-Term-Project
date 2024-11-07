const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Open the database
const db = new sqlite3.Database('./mydb.sqlite', (err) => {
	if (err) {
		console.error('Error opening database:', err.message);
	} else {
		console.log('Connected to SQLite database');
	}
});

// Sample users to populate
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

// Function to add users
const addUser = (name, email, password) => {
	bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
		if (err) {
			console.error('Error hashing password:', err.message);
			return;
		}

		db.run(
			`INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
			[name, email, hashedPassword],
			function (err) {
				if (err) {
					console.error('Error adding user:', err.message);
				} else {
					console.log(`User ${name} added with ID ${this.lastID}`);
				}
			}
		);
	});
};

// Add each user from the users array
users.forEach(user => {
	addUser(user.name, user.email, user.password);
});

// Close the database
db.close((err) => {
	if (err) {
		console.error('Error closing the database:', err.message);
	} else {
		console.log('Database connection closed');
	}
});