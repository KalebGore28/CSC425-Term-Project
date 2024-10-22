const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mydb.sqlite');

db.serialize(() => {
  // Create Jobs table
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT,
	description TEXT,
	salary INTEGER
  )`, (err) => {
	if (err) {
	  console.error('Error creating jobs table:', err.message);
	} else {
	  console.log('Jobs table created successfully');
	}
  });

  // Insert a sample job
  db.run(`INSERT INTO jobs (title, description, salary) VALUES ('Software Engineer', 'Develops software applications', 80000)`);
});

db.close();