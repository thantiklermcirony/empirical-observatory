CREATE TABLE `lab_printouts` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_day` text NOT NULL,
	`expires_at` text NOT NULL,
	`printout_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `lab_printouts_created_day` ON `lab_printouts` (`created_day`);--> statement-breakpoint
CREATE INDEX `lab_printouts_expiry` ON `lab_printouts` (`expires_at`);