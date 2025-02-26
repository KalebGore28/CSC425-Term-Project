import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { events } from "./events";
import { invitations } from "./invitations";
import { notifications } from "./notifications";
import { posts } from "./posts";
import { postLikes } from "./post_likes";
import { tokens } from "./tokens";
import { venues } from "./venues";
import { venueRentals } from "./venue_rentals";

export const users = sqliteTable("Users", {
	id: int("id").primaryKey({ autoIncrement: true }),
	display_name: text("name").notNull(),
	email: text("email").notNull().unique(),
	last_login: text().notNull().default(sql`CURRENT_TIMESTAMP`),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const userRelations = relations(users, ({ many }) => ({
	events: many(events),
	invitations: many(invitations),
	notifications: many(notifications),
	posts: many(posts),
	post_likes: many(postLikes),
	tokens: many(tokens),
	venues: many(venues),
	venue_rentals: many(venueRentals),
}));