// src/db/models/venues.ts
import { sqliteTable, int, text, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { images } from "./images";

export const venues = sqliteTable("Venues", {
	venue_id: int("venue_id").primaryKey({ autoIncrement: true }),
	owner_id: int("owner_id").notNull(),//.references(() => users.user_id, { onDelete: "cascade" })
	name: text("name").notNull(),
	location: text("location").notNull(),
	description: text("description"),
	capacity: int("capacity"),
	price: real("price"),
	thumbnail_image_id: int("thumbnail_image_id"),//.references(() => images.image_id, { onDelete: "set null" })
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const venueImages = relations(venues, ({ one }) => ({
	thumbnail_image: one(images, {
		fields: [venues.thumbnail_image_id],
		references: [images.image_id],
	}),
}));