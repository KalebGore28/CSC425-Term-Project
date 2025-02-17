// src/db/models/notifications.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// Import related tables to reference in relationships.
import { users } from "./users";
import { events } from "./events";

export const notifications = sqliteTable("Notifications", {
	notification_id: int("notification_id").primaryKey({ autoIncrement: true }),
	user_id: int("user_id").notNull().references(() => users.user_id, { onDelete: "cascade" }),
	event_id: int("event_id").references(() => events.event_id, { onDelete: "cascade" }),
	message: text("message").notNull(),
	// CHECK constraint is omitted; enforce valid values ('Unread', 'Read') at the application level.
	status: text("status").default("Unread"),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, {
		fields: [notifications.user_id],
		references: [users.user_id],
	}),
	event: one(events, {
		fields: [notifications.event_id],
		references: [events.event_id],
	}),
}));