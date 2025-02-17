// src/db/models/venue_rentals.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Import the related tables so they can be referenced in the relations definition.
import { users } from "./users";
import { venues } from "./venues";

// Define the Venue_Rentals table without inline .references() calls.
export const venueRentals = sqliteTable("Venue_Rentals", {
  rental_id: int("rental_id").primaryKey({ autoIncrement: true }),
  user_id: int("user_id").notNull().references(() => users.user_id, { onDelete: "cascade" }),
  venue_id: int("venue_id").notNull().references(() => venues.venue_id, { onDelete: "cascade" }),
  start_date: text("start_date").notNull(),
  end_date: text("end_date").notNull(),
});

// Define the relationships for Venue_Rentals table.
export const venueRentalsRelations = relations(venueRentals, ({ one }) => ({
  user: one(users, {
    fields: [venueRentals.user_id],
    references: [users.user_id],
  }),
  venue: one(venues, {
    fields: [venueRentals.venue_id],
    references: [venues.venue_id],
  }),
}));