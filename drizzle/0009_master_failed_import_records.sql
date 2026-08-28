CREATE TABLE `failed_import_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`run_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`record_reference` varchar(255) NOT NULL,
	`payload_sanitized` text,
	`error_code` varchar(60) NOT NULL,
	`error_message` text NOT NULL,
	`attempts` int NOT NULL DEFAULT 1,
	`status` varchar(30) NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `failed_import_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `failed_import_records` ADD CONSTRAINT `failed_import_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_import_records` ADD CONSTRAINT `failed_import_records_run_id_supplier_sync_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `supplier_sync_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_import_records` ADD CONSTRAINT `failed_import_records_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;