// src/db/models/availableDates.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { venues } from "./venues";

export const availableDates = sqliteTable("Available_Dates", {
  availability_id: int("availability_id").primaryKey({ autoIncrement: true }),
  venue_id: int("venue_id").notNull().references(() => venues.venue_id, { onDelete: "cascade" }),
  available_date: text("available_date").notNull(),
});

export const availableDatesOne = relations(availableDates, ({ one }) => ({
  venue: one(venues, {
    fields: [availableDates.venue_id],
    references: [venues.venue_id],
  }),
}));