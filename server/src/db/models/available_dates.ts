import { sqliteTable, int, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import { venues } from "./venues";

export const availableDates = sqliteTable("Available_Dates", {
	id: int("id").primaryKey({ autoIncrement: true }),
	venue_id: int("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
	available_date: text("available_date").notNull(),
}, (table) => [
	uniqueIndex("unique_date").on(table.venue_id, table.available_date),
]);

export const availableDateRelations = relations(availableDates, ({ one }) => ({
	venue: one(venues, {
		fields: [availableDates.venue_id],
		references: [venues.id],
	}),
}));