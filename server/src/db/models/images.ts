// src/db/models/images.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { venues } from "./venues";

export const images = sqliteTable("Images", {
  image_id: int("image_id").primaryKey({ autoIncrement: true }),
  venue_id: int("venue_id").notNull().references(() => venues.venue_id, { onDelete: "cascade" }),
  image_url: text("image_url").notNull(),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const imagesRelations = relations(images, ({ one }) => ({
  venue: one(venues, {
    fields: [images.venue_id],
    references: [venues.venue_id],
  }),
}));