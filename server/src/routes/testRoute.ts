import { Elysia, t } from 'elysia';
import { db } from '../db/connection';
import { users, venues, events } from '../db/schema';

export const testRoute = new Elysia()

	// Endpoint to insert a new user
	.post('/users', async ({ body }) => {
		try {
			const { name, email, password } = body;
			const result = await db.insert(users).values({ name, email, password });
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
			password: t.String()
		}),
	})

	// Endpoint to insert a new venue
	.post('/venues', async ({ body }) => {
		try {
			const { owner_id, name, location, description, capacity, price, thumbnail_image_id } = body;
			const result = await db.insert(venues).values({
				owner_id,
				name,
				location,
				description,
				capacity,
				price,
				thumbnail_image_id
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
			thumbnail_image_id: t.Number()
		}),
	})

	// Endpoint to insert a new event
	.post('/events', async ({ body }) => {
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