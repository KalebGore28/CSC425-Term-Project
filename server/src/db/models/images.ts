import { sqliteTable, int, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { events } from "./events";
import { venues } from "./venues";

export const images = sqliteTable("Images", {
	id: int("id").primaryKey({ autoIncrement: true }),
	event_id: int("event_id").references(() => events.id, { onDelete: "cascade" }),
	venue_id: int("venue_id").references(() => venues.id, { onDelete: "cascade" }),
	thumbnail: int({ mode: 'boolean' }).default(false),
	image_url: text("image_url").notNull(),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	uniqueIndex("unique_thumbnail").on(table.venue_id, table.thumbnail).where(sql`${table.thumbnail} = 1`),
]);

export const imageRelations = relations(images, ({ one }) => ({
	event: one(events, {
		fields: [images.event_id],
		references: [events.id],
	}),
	venue: one(venues, {
		fields: [images.venue_id],
		references: [venues.id],
	})
}));