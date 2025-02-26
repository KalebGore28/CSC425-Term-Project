import { sqliteTable, int, text, check } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { events } from "./events";
import { users } from "./users";

export const notifications = sqliteTable("Notifications", {
	id: int("id").primaryKey({ autoIncrement: true }),
	user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	event_id: int("event_id").references(() => events.id, { onDelete: "cascade" }),
	message: text("message").notNull(),
	status: text("status").default("Unread"),
	created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	check("valid_status", sql`${table.status} IN ('Read', 'Unread')`),
]);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	event: one(events, {
		fields: [notifications.event_id],
		references: [events.id],
	}),
	user: one(users, {
		fields: [notifications.user_id],
		references: [users.id],
	}),
}));