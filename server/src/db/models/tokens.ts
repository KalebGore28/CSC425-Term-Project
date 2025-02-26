import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { users } from "./users";

export const tokens = sqliteTable("Tokens", {
	id: int("id").primaryKey({ autoIncrement: true }),
	user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const tokenRelations = relations(tokens, ({ one }) => ({
	user: one(users, {
		fields: [tokens.user_id],
		references: [users.id],
	}),
}));