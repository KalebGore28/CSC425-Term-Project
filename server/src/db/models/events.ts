import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { images } from "./images";
import { invitations } from "./invitations";
import { notifications } from "./notifications";
import { posts } from "./posts";
import { users } from "./users";
import { venues } from "./venues";

export const events = sqliteTable("Events", {
	id: int("id").primaryKey({ autoIncrement: true }),
	venue_id: int("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
	organizer_id: int("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	start_date: text("start_date").notNull(),
	end_date: text("end_date").notNull(),
	invite_only: int("invite_only").default(0),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventRelations = relations(events, ({ one, many }) => ({
	images: many(images),
	invitations: many(invitations),
	notifications: many(notifications),
	posts: many(posts),
	venue: one(venues, {
		fields: [events.venue_id],
		references: [venues.id],
	}),
	organizer: one(users, {
		fields: [events.organizer_id],
		references: [users.id],
	}),
}));