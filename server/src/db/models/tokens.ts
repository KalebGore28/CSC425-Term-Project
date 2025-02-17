// src/db/models/tokens.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// Import the Users table so that we can reference its primary key.
import { users } from "./users";

export const tokens = sqliteTable("Tokens", {
	token_id: int("token_id").primaryKey({ autoIncrement: true }),
	user_id: int("user_id").notNull(),
	token: text("token").notNull().unique(),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const tokensRelations = relations(tokens, ({ one }) => ({
	user: one(users, {
		fields: [tokens.user_id],
		references: [users.user_id],
	}),
}));