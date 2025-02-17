// src/db/models/venues.ts
import { sqliteTable, int, text, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { images } from "./images";
import { availableDates } from "./available_dates";
import { venueRentals } from "./venue_rentals";
import { events } from "./events";
import { users } from "./users";

export const venues = sqliteTable("Venues", {
	venue_id: int("venue_id").primaryKey({ autoIncrement: true }),
	owner_id: int("owner_id").notNull().references(() => users.user_id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	location: text("location").notNull(),
	description: text("description"),
	capacity: int("capacity"),
	price: real("price"),
	thumbnail_image_id: int("thumbnail_image_id").references(() => images.image_id, { onDelete: "set null" }),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const venuesOne = relations(venues, ({ one }) => ({
	owner: one(users, {
		fields: [venues.owner_id],
		references: [users.user_id],
	}),
	thumbnail_image: one(images, {
		fields: [venues.thumbnail_image_id],
		references: [images.image_id],
	}),
}));

export const venuesMany = relations(venues, ({ many }) => ({
	images: many(images),
	available_date: many(availableDates),
	rentals: many(venueRentals),
	events: many(events),
}));