ALTER TABLE `listing_import_staging` ADD `match_class` varchar(20) DEFAULT 'unmatched' NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_import_staging` ADD `match_reason` varchar(50);