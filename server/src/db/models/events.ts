// src/db/models/events.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// Import related tables so we can reference their primary key columns.
import { venues } from "./venues";
import { users } from "./users";
import { notifications } from "./notifications";
import { invitations } from "./invitations";
import { posts } from "./posts";

export const events = sqliteTable("Events", {
	event_id: int("event_id").primaryKey({ autoIncrement: true }),
	venue_id: int("venue_id").notNull().references(() => venues.venue_id, { onDelete: "cascade" }),
	organizer_id: int("organizer_id").notNull().references(() => users.user_id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	start_date: text("start_date").notNull(),
	end_date: text("end_date").notNull(),
	invite_only: int("invite_only").default(0),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relationships for Events table.
export const eventsOne = relations(events, ({ one }) => ({
	venue: one(venues, {
		fields: [events.venue_id],
		references: [venues.venue_id],
	}),
	organizer: one(users, {
		fields: [events.organizer_id],
		references: [users.user_id],
	}),
}));

export const eventsMany = relations(events, ({ many }) => ({
	notifications: many(notifications),
	invitations: many(invitations),
	posts: many(posts),
}));