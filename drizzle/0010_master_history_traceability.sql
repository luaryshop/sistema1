ALTER TABLE `supplier_inventory_history` ADD `previous_stock` int;--> statement-breakpoint
ALTER TABLE `supplier_inventory_history` ADD `difference` int;--> statement-breakpoint
ALTER TABLE `supplier_inventory_history` ADD `source` varchar(60) DEFAULT 'supplier_import' NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_inventory_history` ADD `import_id` int;--> statement-breakpoint
ALTER TABLE `supplier_price_history` ADD `previous_cost_cents` int;--> statement-breakpoint
ALTER TABLE `supplier_price_history` ADD `source` varchar(60) DEFAULT 'supplier_import' NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier_price_history` ADD `import_id` int;--> statement-breakpoint
ALTER TABLE `supplier_inventory_history` ADD CONSTRAINT `supplier_inventory_history_import_id_supplier_sync_runs_id_fk` FOREIGN KEY (`import_id`) REFERENCES `supplier_sync_runs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_price_history` ADD CONSTRAINT `supplier_price_history_import_id_supplier_sync_runs_id_fk` FOREIGN KEY (`import_id`) REFERENCES `supplier_sync_runs`(`id`) ON DELETE set null ON UPDATE no action;