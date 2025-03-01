import Database, { type Database as DatabaseType } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../utils/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbConnection {
	orm: ReturnType<typeof drizzle>;
	db?: DatabaseType; // Only available for in-memory connections
}

let _dbConnection: Promise<DbConnection> | null = null;

/**
 * Creates a fresh database connection.
 * In test mode, this creates an in-memory DB with migrations (and optional seeding).
 * In production, it uses your config.db.url.
 */
export const createDb = async (
	useInMemory: boolean = false,
	seedTestData: boolean = false
): Promise<DbConnection> => {
	if (useInMemory) {
		const db = new Database(':memory:');
		const orm = drizzle(db);
		const migrationPath = path.join(__dirname, '../../drizzle', '0000_lying_otto_octavius.sql');  // This file varies depending on the project
		const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
		db.exec(migrationSQL);

		if (seedTestData) {
			// Optionally seed default test data here.
			// e.g., await orm.insert(users).values([...]).execute();
		}
		return { orm, db };
	} else {
		const orm = drizzle(config.db.url);
		return { orm };
	}
};

/**
 * Returns the current DB connection.
 * In production, this will be the singleton connection.
 * In test mode, you can call resetDbConnection() to get a fresh connection.
 */
export const getDbConnection = async (): Promise<DbConnection> => {
	if (!_dbConnection) {
		const useInMemory = process.env.NODE_ENV === 'test';
		_dbConnection = createDb(useInMemory, useInMemory);
	}
	return _dbConnection;
};

/**
 * Resets the DB connection.
 * In test mode, calling this will create a fresh in-memory connection.
 */
export const resetDbConnection = async (): Promise<DbConnection> => {
	const useInMemory = process.env.NODE_ENV === 'test';
	_dbConnection = createDb(useInMemory, useInMemory);
	return _dbConnection;
};

/**
 * Runs additional seed data on an existing connection.
 * This function accepts an array of seed functions that take the ORM as a parameter.
 */
export const seedDb = async (
	dbConn: DbConnection,
	seeders: Array<(orm: DbConnection['orm']) => Promise<void>>
): Promise<void> => {
	for (const seeder of seeders) {
		await seeder(dbConn.orm);
	}
};
