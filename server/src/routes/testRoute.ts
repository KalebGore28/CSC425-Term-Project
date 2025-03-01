import { Elysia, t } from 'elysia';
import { getDbConnection } from '../db/connection';
import { users, venues, events } from '../db/schema';

export const testRoute = new Elysia()

	// Endpoint to insert a new user
	.post('/users', async ({ body }) => {
		const db = (await getDbConnection()).orm;
		try {
			const { name, email } = body;
			const id = 0;
			const display_name = name;
			const result = await db.insert(users).values({ id, display_name, email});
			return { message: 'User created successfully', result };
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500 });
		}
	}, {
		body: t.Object({
			name: t.String(),
			email: t.String({
				format: 'email',
				transform: (email: string) => email.toLowerCase(),
			}),
		}),
	})

	// Endpoint to insert a new venue
	.post('/venues', async ({ body }) => {
		const db = (await getDbConnection()).orm;
		try {
			const { owner_id, name, location, description, capacity, price } = body;
			const result = await db.insert(venues).values({
				owner_id,
				name,
				location,
				description,
				capacity,
				price
			});
			return { message: 'Venue created successfully', result };
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500 });
		}
	}, {
		body: t.Object({
			owner_id: t.Number(),
			name: t.String(),
			location: t.String(),
			description: t.String(),
			capacity: t.Number(),
			price: t.Number(),
		}),
	})

	// Endpoint to insert a new event
	.post('/events', async ({ body }) => {
		const db = (await getDbConnection()).orm;
		try {
			const { venue_id, organizer_id, name, description, start_date, end_date, invite_only } = body;
			const result = await db.insert(events).values({
				venue_id,
				organizer_id,
				name,
				description,
				start_date,
				end_date,
				invite_only
			});
			return { message: 'Event created successfully', result };
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500 });
		}
	}, {
		body: t.Object({
			venue_id: t.Number(),
			organizer_id: t.Number(),
			name: t.String(),
			description: t.String(),
			start_date: t.String(),
			end_date: t.String(),
			invite_only: t.Number()
		}),
	});