CREATE TABLE `affiliate_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`link_id` int NOT NULL,
	`event_type` varchar(30) NOT NULL,
	`external_event_id` varchar(255),
	`amount_cents` int NOT NULL DEFAULT 0,
	`commission_cents` int NOT NULL DEFAULT 0,
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliate_event_user_external` UNIQUE(`user_id`,`external_event_id`)
);
--> statement-breakpoint
CREATE TABLE `affiliate_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`source_id` int NOT NULL,
	`product_id` int,
	`slug` varchar(180) NOT NULL,
	`destination_url` text NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'active',
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`revenue_cents` int NOT NULL DEFAULT 0,
	`commission_cents` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliate_link_user_slug` UNIQUE(`user_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `affiliate_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`network` varchar(80) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'active',
	`commission_bp` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD `supplier_product_id` int;--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD `source_type` varchar(30) DEFAULT 'own_stock' NOT NULL;--> statement-breakpoint
ALTER TABLE `affiliate_events` ADD CONSTRAINT `affiliate_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `affiliate_events` ADD CONSTRAINT `affiliate_events_link_id_affiliate_links_id_fk` FOREIGN KEY (`link_id`) REFERENCES `affiliate_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `affiliate_links` ADD CONSTRAINT `affiliate_links_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `affiliate_links` ADD CONSTRAINT `affiliate_links_source_id_affiliate_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `affiliate_sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `affiliate_links` ADD CONSTRAINT `affiliate_links_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `affiliate_sources` ADD CONSTRAINT `affiliate_sources_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inv_res_supplier_fk` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`id`) ON DELETE set null ON UPDATE no action;