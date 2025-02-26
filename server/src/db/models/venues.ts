import { sqliteTable, int, text, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { availableDates } from "./available_dates";
import { events } from "./events";
import { images } from "./images";
import { users } from "./users";
import { venueRentals } from "./venue_rentals";

export const venues = sqliteTable("Venues", {
	id: int("id").primaryKey({ autoIncrement: true }),
	owner_id: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	location: text("location").notNull(),
	description: text("description"),
	capacity: int("capacity"),
	price: real("price"),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const venueRelations = relations(venues, ({ one, many }) => ({
	available_dates: many(availableDates),
	events: many(events),
	images: many(images),
	venue_rentals: many(venueRentals),
	owner: one(users, {
		fields: [venues.owner_id],
		references: [users.id],
	}),
}));
