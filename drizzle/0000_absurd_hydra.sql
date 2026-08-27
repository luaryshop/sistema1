CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`entity` varchar(50) NOT NULL,
	`entity_id` int,
	`before` text,
	`after` text,
	`origin` varchar(50) NOT NULL DEFAULT 'system',
	`ip` varchar(64),
	`result` varchar(20) NOT NULL DEFAULT 'success',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `banhos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`metal` varchar(100),
	`color` varchar(100),
	`milesimos` int DEFAULT 0,
	`quotation` int DEFAULT 0,
	`operational_tax` int DEFAULT 0,
	`labor` int DEFAULT 0,
	`technical_loss` int DEFAULT 0,
	`technical_margin` int DEFAULT 0,
	`price_per_gram` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banhos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financeiro` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`amount` int DEFAULT 0,
	`date` timestamp DEFAULT (now()),
	`category` varchar(100),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financeiro_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insumos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`internal_code` varchar(100),
	`cost` int DEFAULT 0,
	`weight` int DEFAULT 0,
	`stock` int DEFAULT 0,
	`min_stock` int DEFAULT 0,
	`ideal_stock` int DEFAULT 0,
	`add_to_plating` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insumos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`variant_id` int,
	`order_id` int,
	`type` varchar(30) NOT NULL,
	`quantity` int NOT NULL,
	`reason` varchar(255),
	`reference` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`variant_id` int,
	`order_id` int,
	`quantity` int NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'reserved',
	`expires_at` timestamp,
	`released_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kit_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kit_id` int NOT NULL,
	`product_id` int,
	`insumo_id` int,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_cost` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kit_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cost_base` int DEFAULT 0,
	`weight_base` int DEFAULT 0,
	`margin_target` int DEFAULT 0,
	`margin_type` varchar(20) DEFAULT 'perc',
	`stock` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_channel_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`listing_id` int NOT NULL,
	`title` varchar(500),
	`description` text,
	`price` int,
	`category_id` varchar(150),
	`attributes` text,
	`media_ids` text,
	`seo_keywords` text,
	`approval_status` varchar(30) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_channel_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_import_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int NOT NULL,
	`external_listing_id` varchar(255) NOT NULL,
	`payload` text NOT NULL,
	`normalized_title` varchar(500),
	`suggested_product_id` int,
	`match_confidence` int NOT NULL DEFAULT 0,
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_import_staging_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`platform` varchar(100) NOT NULL,
	`scheduled_at` timestamp,
	`status` varchar(50) NOT NULL DEFAULT 'planned',
	`link` varchar(500),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `live_streams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_type` varchar(50) NOT NULL,
	`is_connected` int NOT NULL DEFAULT 0,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` timestamp,
	`seller_id` varchar(255),
	`seller_name` varchar(255),
	`client_id` varchar(255),
	`client_secret` text,
	`webhook_url` varchar(500),
	`webhook_secret` text,
	`last_sync_at` timestamp,
	`last_error_at` timestamp,
	`last_error_message` text,
	`sync_status` varchar(50) DEFAULT 'idle',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`marketplace_connection_id` int NOT NULL,
	`product_id` int NOT NULL,
	`marketplace_listing_id` varchar(255) NOT NULL,
	`title` varchar(500),
	`description` text,
	`price` int DEFAULT 0,
	`stock` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'active',
	`listing_url` varchar(500),
	`last_published_at` timestamp,
	`last_synced_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`marketplace_item_id` varchar(255),
	`title` varchar(255),
	`quantity` int DEFAULT 1,
	`unit_price` int DEFAULT 0,
	`total_price` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int NOT NULL,
	`marketplace_order_id` varchar(255) NOT NULL,
	`buyer_name` varchar(255),
	`buyer_email` varchar(320),
	`total_amount` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'pending',
	`order_date` timestamp,
	`shipping_address` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`namespace` varchar(50) NOT NULL DEFAULT 'catalog',
	`name` varchar(150) NOT NULL,
	`value` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_identifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`variant_id` int,
	`type` varchar(30) NOT NULL,
	`value` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_identifiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`variant_id` int,
	`kind` varchar(20) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`storage_key` varchar(500),
	`alt_text` varchar(500),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_cover` int NOT NULL DEFAULT 0,
	`status` varchar(30) NOT NULL DEFAULT 'ready',
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_seo_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`channel` varchar(50) NOT NULL DEFAULT 'store',
	`slug` varchar(255),
	`seo_title` varchar(255),
	`meta_description` varchar(320),
	`focus_keyword` varchar(150),
	`secondary_keywords` text,
	`alt_text` varchar(500),
	`canonical_url` varchar(500),
	`schema_json` text,
	`score` int NOT NULL DEFAULT 0,
	`issues` text,
	`status` varchar(30) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_seo_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_seo_profiles_product_channel` UNIQUE(`product_id`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`sku` varchar(100) NOT NULL,
	`gtin` varchar(50),
	`name` varchar(255),
	`attributes` text,
	`price` int NOT NULL DEFAULT 0,
	`stock` int NOT NULL DEFAULT 0,
	`reserved_stock` int NOT NULL DEFAULT 0,
	`status` varchar(30) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`subcategory` varchar(100),
	`brand` varchar(100),
	`color` varchar(100),
	`material` varchar(100),
	`description` text,
	`cost_base` int DEFAULT 0,
	`base_price` int DEFAULT 0,
	`weight_base` int DEFAULT 0,
	`height` int DEFAULT 0,
	`width` int DEFAULT 0,
	`length` int DEFAULT 0,
	`ncm` varchar(20),
	`cest` varchar(20),
	`origin` varchar(30),
	`mpn` varchar(100),
	`margin_target` int DEFAULT 0,
	`margin_type` varchar(20) DEFAULT 'perc',
	`stock` int DEFAULT 0,
	`min_stock` int DEFAULT 0,
	`photo_url` varchar(500),
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`marketplace_type` varchar(50),
	`commission_bp` int NOT NULL DEFAULT 0,
	`fixed_fee_cents` int NOT NULL DEFAULT 0,
	`shipping_cost_cents` int NOT NULL DEFAULT 0,
	`tax_bp` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`page_key` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`keywords` varchar(500),
	`canonical_url` varchar(500),
	`og_image_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_conflicts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int,
	`product_id` int,
	`listing_id` int,
	`entity` varchar(50) NOT NULL,
	`field` varchar(100) NOT NULL,
	`luary_value` text,
	`marketplace_value` text,
	`severity` varchar(20) NOT NULL DEFAULT 'medium',
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`resolution` varchar(50),
	`resolved_by` int,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_conflicts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int,
	`product_id` int,
	`order_id` int,
	`type` varchar(50) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`idempotency_key` varchar(255) NOT NULL,
	`payload` text,
	`error_message` text,
	`attempts` int NOT NULL DEFAULT 0,
	`next_run_at` timestamp NOT NULL DEFAULT (now()),
	`locked_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_jobs_user_idempotency` UNIQUE(`user_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int,
	`product_id` int,
	`order_id` int,
	`sync_type` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL,
	`error_message` text,
	`error_stack` text,
	`retry_count` int DEFAULT 0,
	`max_retries` int DEFAULT 3,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int NOT NULL,
	`external_event_id` varchar(255) NOT NULL,
	`topic` varchar(150) NOT NULL,
	`payload` text NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'received',
	`processed_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_events_connection_event` UNIQUE(`marketplace_connection_id`,`external_event_id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `banhos` ADD CONSTRAINT `banhos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financeiro` ADD CONSTRAINT `financeiro_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insumos` ADD CONSTRAINT `insumos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_kit_id_kits_id_fk` FOREIGN KEY (`kit_id`) REFERENCES `kits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_insumo_id_insumos_id_fk` FOREIGN KEY (`insumo_id`) REFERENCES `insumos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kits` ADD CONSTRAINT `kits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_channel_overrides` ADD CONSTRAINT `listing_channel_overrides_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_channel_overrides` ADD CONSTRAINT `listing_channel_overrides_listing_id_marketplace_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_import_staging` ADD CONSTRAINT `listing_import_staging_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_import_staging` ADD CONSTRAINT `listing_staging_conn_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_import_staging` ADD CONSTRAINT `listing_import_staging_suggested_product_id_products_id_fk` FOREIGN KEY (`suggested_product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_streams` ADD CONSTRAINT `live_streams_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_connections` ADD CONSTRAINT `marketplace_connections_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_conn_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_attributes` ADD CONSTRAINT `product_attributes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_attributes` ADD CONSTRAINT `product_attributes_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_identifiers` ADD CONSTRAINT `product_identifiers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_identifiers` ADD CONSTRAINT `product_identifiers_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_identifiers` ADD CONSTRAINT `product_identifiers_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_media` ADD CONSTRAINT `product_media_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_media` ADD CONSTRAINT `product_media_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_media` ADD CONSTRAINT `product_media_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_seo_profiles` ADD CONSTRAINT `product_seo_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_seo_profiles` ADD CONSTRAINT `product_seo_profiles_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_channels` ADD CONSTRAINT `sales_channels_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seo_settings` ADD CONSTRAINT `seo_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_conflicts` ADD CONSTRAINT `sync_conflicts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_conflicts` ADD CONSTRAINT `sync_conflicts_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_conflicts` ADD CONSTRAINT `sync_conflicts_listing_id_marketplace_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_conflicts` ADD CONSTRAINT `sync_conflicts_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_jobs` ADD CONSTRAINT `sync_jobs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_jobs` ADD CONSTRAINT `sync_jobs_conn_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_jobs` ADD CONSTRAINT `sync_jobs_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_jobs` ADD CONSTRAINT `sync_jobs_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_conn_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE cascade ON UPDATE no action;