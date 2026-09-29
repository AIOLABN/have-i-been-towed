CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`source_filename` text NOT NULL,
	`object_key` text NOT NULL,
	`state` text NOT NULL,
	`truck_id` text NOT NULL,
	`destination` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text NOT NULL,
	`lease_id` text,
	`lease_until` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`result_count` integer,
	`error` text,
	`analyzed_frames` integer
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_owner_created` ON `jobs` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_jobs_owner_status` ON `jobs` (`owner`,`status`);--> statement-breakpoint
CREATE TABLE `lookup_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`owner` text NOT NULL,
	`plate` text NOT NULL,
	`state` text NOT NULL,
	`confidence` real NOT NULL,
	`votes` integer NOT NULL,
	`detected_at` text NOT NULL,
	`truck_id` text NOT NULL,
	`destination` text NOT NULL,
	`source_filename` text NOT NULL,
	`snapshot_key` text,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`reviewed_at` text,
	`analyzed_frames` integer
);
--> statement-breakpoint
CREATE INDEX `idx_records_lookup` ON `records` (`plate`,`state`,`review_status`,`detected_at`);--> statement-breakpoint
CREATE INDEX `idx_records_owner` ON `records` (`owner`,`detected_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_records_job_plate` ON `records` (`job_id`,`plate`);--> statement-breakpoint
CREATE TABLE `worker_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_worker_owner` ON `worker_tokens` (`owner`);