// src/db/models/postLikes.ts
import { sqliteTable, int, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Import the related tables.
// Here, we're assuming that the "Posts" table is exported as "posts".
// Adjust the import if your naming differs.
import { posts } from "./posts";
import { users } from "./users";

// Define the Post_Likes table
export const postLikes = sqliteTable(
	"Post_Likes",
	{
		like_id: int("like_id").primaryKey({ autoIncrement: true }),
		post_id: int("post_id").notNull(),
		user_id: int("user_id").notNull(),
	},
	(table) => ([
		// Composite unique constraint on post_id and user_id
		uniqueIndex("unique_post_user").on(table.post_id, table.user_id)
	])
);

// Define relationships so that the DBML generator can detect foreign keys
export const postLikesRelations = relations(postLikes, ({ one }) => ({
	post: one(posts, {
		fields: [postLikes.post_id],
		references: [posts.post_id],
	}),
	user: one(users, {
		fields: [postLikes.user_id],
		references: [users.user_id],
	}),
}));