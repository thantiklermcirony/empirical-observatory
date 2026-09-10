CREATE TABLE `daily_interest` (
	`day` text PRIMARY KEY NOT NULL,
	`page_views` integer DEFAULT 0 NOT NULL,
	`project_views` integer DEFAULT 0 NOT NULL,
	`lab_opens` integer DEFAULT 0 NOT NULL,
	`source_clicks` integer DEFAULT 0 NOT NULL,
	`github_entries` integer DEFAULT 0 NOT NULL,
	`search_entries` integer DEFAULT 0 NOT NULL,
	`social_entries` integer DEFAULT 0 NOT NULL,
	`other_entries` integer DEFAULT 0 NOT NULL,
	`direct_entries` integer DEFAULT 0 NOT NULL,
	`verification_events` integer DEFAULT 0 NOT NULL
);

