import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("Users", {
  user_id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  created_at: text().default(sql`CURRENT_TIMESTAMP`),
});