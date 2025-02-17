// src/db/models/posts.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { events } from "./events";
import { users } from "./users";

export const posts = sqliteTable("Posts", {
	post_id: int("post_id").primaryKey({ autoIncrement: true }),
	event_id: int("event_id").notNull(),
	user_id: int("user_id").notNull(),
	content: text("content").notNull(),
	like_count: int("like_count").default(0),
	parent_post_id: int("parent_post_id"),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const postsRelations = relations(posts, ({ one }) => ({
	event: one(events, {
		fields: [posts.event_id],
		references: [events.event_id],
	}),
	user: one(users, {
		fields: [posts.user_id],
		references: [users.user_id],
	}),
	parentPost: one(posts, {
		fields: [posts.parent_post_id],
		references: [posts.post_id],
	}),
}));