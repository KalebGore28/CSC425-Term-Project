import { sqliteTable, int, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import { posts } from "./posts";
import { users } from "./users";

export const postLikes = sqliteTable("Post_Likes", {
	id: int("id").primaryKey({ autoIncrement: true }),
	post_id: int("post_id").notNull().references(() => posts.id),
	user_id: int("user_id").notNull().references(() => users.id),
}, (table) => [
	uniqueIndex("unique_user_like").on(table.post_id, table.user_id)
]);

export const postLikesRelations = relations(postLikes, ({ one }) => ({
	post: one(posts, {
		fields: [postLikes.post_id],
		references: [posts.id],
	}),
	user: one(users, {
		fields: [postLikes.user_id],
		references: [users.id],
	}),
}));