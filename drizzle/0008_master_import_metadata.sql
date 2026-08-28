ALTER TABLE `supplier_import_items` ADD `error_code` varchar(60);--> statement-breakpoint
ALTER TABLE `supplier_import_items` ADD `attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `source_type` varchar(30) DEFAULT 'adapter' NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `source_reference` varchar(500);--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `file_hash` varchar(128);--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `current_stage` varchar(40) DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `progress_percent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `total_records` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `processed_records` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `success_records` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `matched_records` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `unmatched_records` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `skipped_records` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD `error_summary` text;