// src/utils/config.js
if (process.env.NODE_ENV !== 'production') {
	console.log("🔁 Environment is not production. Loading dotenv...");
	require('dotenv').config();
  }

export const config = {
	jwtSecret: process.env.JWT_SECRET,
	db: {
		url: process.env.DB_URL,
	},
};