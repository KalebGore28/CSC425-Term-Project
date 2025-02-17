CREATE TABLE `Available_Dates` (
	`availability_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`available_date` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `Venues`(`venue_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`organizer_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`invite_only` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`venue_id`) REFERENCES `Venues`(`venue_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizer_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Images` (
	`image_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`venue_id`) REFERENCES `Venues`(`venue_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Invitations` (
	`invitation_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`sent_date` text DEFAULT CURRENT_TIMESTAMP,
	`status` text,
	FOREIGN KEY (`event_id`) REFERENCES `Events`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Notifications` (
	`notification_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`event_id` integer,
	`message` text NOT NULL,
	`status` text DEFAULT 'Unread',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `Events`(`event_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Post_Likes` (
	`like_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `Posts`(`post_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_post_user` ON `Post_Likes` (`post_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `Posts` (
	`post_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`like_count` integer DEFAULT 0,
	`parent_post_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`event_id`) REFERENCES `Events`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_post_id`) REFERENCES `Posts`(`post_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Tokens` (
	`token_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tokens_token_unique` ON `Tokens` (`token`);--> statement-breakpoint
CREATE TABLE `Users` (
	`user_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Users_email_unique` ON `Users` (`email`);--> statement-breakpoint
CREATE TABLE `Venue_Rentals` (
	`rental_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`venue_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `Venues`(`venue_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Venues` (
	`venue_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`description` text,
	`capacity` integer,
	`price` real,
	`thumbnail_image_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`owner_id`) REFERENCES `Users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thumbnail_image_id`) REFERENCES `Images`(`image_id`) ON UPDATE no action ON DELETE set null
);
