import { sqliteTable, int, text, check } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { events } from "./events";
import { users } from "./users";

export const invitations = sqliteTable("Invitations", {
	id: int("id").primaryKey({ autoIncrement: true }),
	event_id: int("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
	user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	sent_date: text("sent_date").default(sql`CURRENT_TIMESTAMP`),
	status: text("status"),
}, (table) => [
	check("valid_status", sql`${table.status} IN ('accepted', 'declined', 'pending')`),
]);

export const invitationRelations = relations(invitations, ({ one }) => ({
	event: one(events, {
		fields: [invitations.event_id],
		references: [events.id],
	}),
	user: one(users, {
		fields: [invitations.user_id],
		references: [users.id],
	}),
}));