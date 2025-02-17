// src/db/models/images.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const images = sqliteTable("Images", {
  image_id: int("image_id").primaryKey({ autoIncrement: true }),
  image_url: text("image_url").notNull(),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});