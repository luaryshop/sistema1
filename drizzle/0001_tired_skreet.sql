CREATE TABLE `marketplace_attribute_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_type` varchar(50) NOT NULL,
	`source_name` varchar(150) NOT NULL,
	`external_name` varchar(150) NOT NULL,
	`value_map` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_attribute_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_attribute_mapping_unique` UNIQUE(`user_id`,`marketplace_type`,`source_name`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_category_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_type` varchar(50) NOT NULL,
	`internal_category` varchar(150) NOT NULL,
	`external_category_id` varchar(150) NOT NULL,
	`external_category_name` varchar(255),
	`attributes_schema` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_category_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_category_mapping_unique` UNIQUE(`user_id`,`marketplace_type`,`internal_category`)
);
--> statement-breakpoint
CREATE TABLE `publication_preflight_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`marketplace_type` varchar(50) NOT NULL,
	`status` varchar(30) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`issues` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `publication_preflight_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `marketplace_attribute_mappings` ADD CONSTRAINT `marketplace_attribute_mappings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_category_mappings` ADD CONSTRAINT `marketplace_category_mappings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `publication_preflight_results` ADD CONSTRAINT `publication_preflight_results_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `publication_preflight_results` ADD CONSTRAINT `publication_preflight_results_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;