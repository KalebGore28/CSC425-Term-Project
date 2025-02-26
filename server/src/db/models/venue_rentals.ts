import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import { users } from "./users";
import { venues } from "./venues";

export const venueRentals = sqliteTable("Venue_Rentals", {
	id: int("id").primaryKey({ autoIncrement: true }),
	user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	venue_id: int("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
	start_date: text("start_date").notNull(),
	end_date: text("end_date").notNull(),
});

export const venueRentalRelations = relations(venueRentals, ({ one }) => ({
	user: one(users, {
		fields: [venueRentals.user_id],
		references: [users.id],
	}),
	venue: one(venues, {
		fields: [venueRentals.venue_id],
		references: [venues.id],
	}),
}));