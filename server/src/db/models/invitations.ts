// src/db/models/invitations.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

import { events } from "./events";
import { users } from "./users";

export const invitations = sqliteTable("Invitations", {
	invitation_id: int("invitation_id").primaryKey({ autoIncrement: true }),
	event_id: int("event_id").notNull().references(() => events.event_id, { onDelete: "cascade" }),
	user_id: int("user_id").notNull().references(() => users.user_id, { onDelete: "cascade" }),
	sent_date: text("sent_date").default(sql`CURRENT_TIMESTAMP`),
	status: text("status"), // CHECK constraint not directly supported; handle via application validation if needed
});

export const invitationsRelations = relations(invitations, ({ one }) => ({
	event: one(events, {
		fields: [invitations.event_id],
		references: [events.event_id],
	}),
	user: one(users, {
		fields: [invitations.user_id],
		references: [users.user_id],
	}),
}));