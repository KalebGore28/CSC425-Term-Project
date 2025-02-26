import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { events } from "./events";
import { users } from "./users";
import { postLikes } from "./post_likes";

export const posts = sqliteTable("Posts", {
	id: int("id").primaryKey({ autoIncrement: true }),
	event_id: int("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
	user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	like_count: int("like_count").default(0),
	parent_post_id: int("parent_post_id").references(() => posts.id, { onDelete: "cascade" }),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const postRelations = relations(posts, ({ one, many }) => ({
	post_likes: many(postLikes),
	event: one(events, {
		fields: [posts.event_id],
		references: [events.id],
	}),
	user: one(users, {
		fields: [posts.user_id],
		references: [users.id],
	}),
	parentPost: one(posts, {
		fields: [posts.parent_post_id],
		references: [posts.id],
	}),
}));