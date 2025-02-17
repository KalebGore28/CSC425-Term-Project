// src/db/schema.ts

import * as availableDates from './models/available_dates';
import * as events from './models/events';
import * as images from './models/images';
import * as invitations from './models/invitations';
import * as notifications from './models/notifications';
import * as postLikes from './models/post_likes';
import * as posts from './models/posts';
import * as tokens from './models/tokens';
import * as users from './models/users';
import * as venueRentals from './models/venue_rentals';
import * as venues from './models/venues';

export * from './models/available_dates';
export * from './models/events';
export * from './models/images';
export * from './models/invitations';
export * from './models/notifications';
export * from './models/post_likes';
export * from './models/posts';
export * from './models/tokens';
export * from './models/users';
export * from './models/venue_rentals';
export * from './models/venues';

export const schema = {
	availableDates,
	events,
	images,
	invitations,
	notifications,
	postLikes,
	posts,
	tokens,
	users,
	venueRentals,
	venues,
};