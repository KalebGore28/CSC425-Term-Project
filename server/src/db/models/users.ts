import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { posts } from "./posts";
import { postLikes } from "./post_likes";
import { events } from "./events";
import { notifications } from "./notifications";
import { venueRentals } from "./venue_rentals";
import { invitations } from "./invitations";
import { venues } from "./venues";

export const users = sqliteTable("Users", {
  user_id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  created_at: text().default(sql`CURRENT_TIMESTAMP`),
});

export const usersMany = relations(users, ({ many }) => ({
  posts: many(posts),
  post_likes: many(postLikes),
  events: many(events),
  notifications: many(notifications),
  venue_rentals: many(venueRentals),
  invitations: many(invitations),
  venues: many(venues),
}));