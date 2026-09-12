CREATE TABLE `framework_events` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	`action` text NOT NULL,
	`receipt` text
);
--> statement-breakpoint
CREATE INDEX `framework_events_proposal_created` ON `framework_events` (`proposal_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `framework_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`status` text DEFAULT 'generating' NOT NULL,
	`prompt` text NOT NULL,
	`body_json` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `framework_proposals_status_created` ON `framework_proposals` (`status`,`created_at`);