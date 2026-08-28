CREATE TABLE `supplier_import_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`run_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`raw_payload` text NOT NULL,
	`normalized_payload` text,
	`validation_status` varchar(30) NOT NULL DEFAULT 'pending',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_import_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_import_items_run_external` UNIQUE(`run_id`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`integration_id` int NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'queued',
	`mode` varchar(30) NOT NULL DEFAULT 'catalog',
	`products_read` int NOT NULL DEFAULT 0,
	`products_created` int NOT NULL DEFAULT 0,
	`products_updated` int NOT NULL DEFAULT 0,
	`errors_count` int NOT NULL DEFAULT 0,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supplier_import_items` ADD CONSTRAINT `supplier_import_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_import_items` ADD CONSTRAINT `supplier_import_items_run_id_supplier_sync_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `supplier_sync_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_import_items` ADD CONSTRAINT `supplier_import_items_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD CONSTRAINT `supplier_sync_runs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD CONSTRAINT `supplier_sync_runs_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_sync_runs` ADD CONSTRAINT `supplier_sync_runs_integration_id_supplier_integrations_id_fk` FOREIGN KEY (`integration_id`) REFERENCES `supplier_integrations`(`id`) ON DELETE cascade ON UPDATE no action;