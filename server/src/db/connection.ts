import { drizzle } from 'drizzle-orm/libsql';
import { config } from '../utils/config';

export const db = drizzle(config.db.url);