// src/db/models/events.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// Import related tables so we can reference their primary key columns.
import { venues } from "./venues";
import { users } from "./users";

export const events = sqliteTable("Events", {
	event_id: int("event_id").primaryKey({ autoIncrement: true }),
	venue_id: int("venue_id").notNull(),
	organizer_id: int("organizer_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	start_date: text("start_date").notNull(),
	end_date: text("end_date").notNull(),
	invite_only: int("invite_only").default(0),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relationships separately so that the DBML generator can detect the references.
export const eventsRelations = relations(events, ({ one }) => ({
	venue: one(venues, {
		fields: [events.venue_id],
		references: [venues.venue_id],
	}),
	organizer: one(users, {
		fields: [events.organizer_id],
		references: [users.user_id],
	}),
}));