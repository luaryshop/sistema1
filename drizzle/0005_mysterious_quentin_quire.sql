CREATE TABLE `fulfillment_group_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fulfillment_group_id` int NOT NULL,
	`order_item_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fulfillment_group_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fulfillment_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`order_id` int NOT NULL,
	`supplier_id` int,
	`mode` varchar(30) NOT NULL DEFAULT 'own_stock',
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`tracking_code` varchar(255),
	`carrier` varchar(150),
	`shipped_at` timestamp,
	`delivered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fulfillment_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_order_id` int NOT NULL,
	`supplier_product_id` int,
	`product_id` int,
	`variant_id` int,
	`sku` varchar(100),
	`quantity` int NOT NULL DEFAULT 1,
	`unit_cost_cents` int NOT NULL DEFAULT 0,
	`total_cost_cents` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`order_id` int,
	`status` varchar(30) NOT NULL DEFAULT 'draft',
	`subtotal_cents` int NOT NULL DEFAULT 0,
	`shipping_cents` int NOT NULL DEFAULT 0,
	`total_cents` int NOT NULL DEFAULT 0,
	`external_id` varchar(255),
	`tracking_code` varchar(255),
	`carrier` varchar(150),
	`invoice_reference` varchar(255),
	`fiscal_mode` varchar(30) NOT NULL DEFAULT 'not_defined',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_supplier_external` UNIQUE(`user_id`,`supplier_id`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `return_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`order_id` int NOT NULL,
	`supplier_id` int,
	`reason` text NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'requested',
	`supplier_responsibility` int NOT NULL DEFAULT 0,
	`marketplace_responsibility` int NOT NULL DEFAULT 0,
	`refund_amount_cents` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `return_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_health_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`reliability_bp` int NOT NULL DEFAULT 0,
	`average_shipping_days` int NOT NULL DEFAULT 0,
	`delay_count` int NOT NULL DEFAULT 0,
	`cancellation_count` int NOT NULL DEFAULT 0,
	`return_count` int NOT NULL DEFAULT 0,
	`tracking_coverage_bp` int NOT NULL DEFAULT 0,
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_health_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`type` varchar(30) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'inactive',
	`encrypted_credentials` text,
	`last_sync_at` timestamp,
	`last_error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_integrations_user_supplier_type` UNIQUE(`user_id`,`supplier_id`,`type`)
);
--> statement-breakpoint
CREATE TABLE `supplier_inventory_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_product_id` int NOT NULL,
	`stock` int NOT NULL,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_inventory_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_product_id` int NOT NULL,
	`cost_cents` int NOT NULL,
	`shipping_cost_cents` int NOT NULL DEFAULT 0,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_product_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_product_id` int NOT NULL,
	`product_id` int NOT NULL,
	`variant_id` int,
	`confidence` int NOT NULL DEFAULT 0,
	`match_type` varchar(30) NOT NULL DEFAULT 'unmatched',
	`status` varchar(30) NOT NULL DEFAULT 'pending_review',
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_product_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_product_mapping_unique` UNIQUE(`user_id`,`supplier_product_id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`sku` varchar(100),
	`internal_code` varchar(100),
	`ean` varchar(50),
	`gtin` varchar(50),
	`mpn` varchar(100),
	`name` varchar(500) NOT NULL,
	`description` text,
	`brand` varchar(150),
	`cost_cents` int NOT NULL DEFAULT 0,
	`shipping_cost_cents` int NOT NULL DEFAULT 0,
	`stock` int NOT NULL DEFAULT 0,
	`weight_grams` int NOT NULL DEFAULT 0,
	`width_mm` int NOT NULL DEFAULT 0,
	`height_mm` int NOT NULL DEFAULT 0,
	`length_mm` int NOT NULL DEFAULT 0,
	`images` text,
	`videos` text,
	`attributes` text,
	`category` varchar(150),
	`status` varchar(30) NOT NULL DEFAULT 'active',
	`last_synced_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_products_supplier_external` UNIQUE(`user_id`,`supplier_id`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`legal_name` varchar(255),
	`document` varchar(50),
	`email` varchar(320),
	`phone` varchar(50),
	`website` varchar(500),
	`status` varchar(30) NOT NULL DEFAULT 'pending_review',
	`rating_bp` int NOT NULL DEFAULT 0,
	`default_shipping_days` int NOT NULL DEFAULT 0,
	`return_policy` text,
	`dropshipping_enabled` int NOT NULL DEFAULT 0,
	`cross_docking_enabled` int NOT NULL DEFAULT 0,
	`api_enabled` int NOT NULL DEFAULT 0,
	`feed_enabled` int NOT NULL DEFAULT 0,
	`integration_type` varchar(30) NOT NULL DEFAULT 'manual',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`supplier_id` int,
	`supplier_product_id` int,
	`product_id` int,
	`type` varchar(50) NOT NULL,
	`severity` varchar(20) NOT NULL DEFAULT 'warning',
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`message` text NOT NULL,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `supply_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_routing_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`fulfillment_mode` varchar(30) NOT NULL DEFAULT 'dropshipping',
	`supplier_stock_buffer` int NOT NULL DEFAULT 0,
	`stale_after_minutes` int NOT NULL DEFAULT 120,
	`block_after_stale_minutes` int NOT NULL DEFAULT 1440,
	`minimum_margin_bp` int NOT NULL DEFAULT 0,
	`auto_fulfillment_allowed` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supply_routing_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `supply_routing_product_supplier` UNIQUE(`user_id`,`product_id`,`supplier_id`)
);
--> statement-breakpoint
ALTER TABLE `fulfillment_group_items` ADD CONSTRAINT `fg_items_group_fk` FOREIGN KEY (`fulfillment_group_id`) REFERENCES `fulfillment_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fulfillment_group_items` ADD CONSTRAINT `fulfillment_group_items_order_item_id_order_items_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fulfillment_groups` ADD CONSTRAINT `fulfillment_groups_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fulfillment_groups` ADD CONSTRAINT `fulfillment_groups_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fulfillment_groups` ADD CONSTRAINT `fulfillment_groups_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `po_item_supplier_fk` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_health_snapshots` ADD CONSTRAINT `supplier_health_snapshots_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_health_snapshots` ADD CONSTRAINT `supplier_health_snapshots_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_integrations` ADD CONSTRAINT `supplier_integrations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_integrations` ADD CONSTRAINT `supplier_integrations_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_inventory_history` ADD CONSTRAINT `supplier_inventory_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_inventory_history` ADD CONSTRAINT `sp_inv_hist_product_fk` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_price_history` ADD CONSTRAINT `supplier_price_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_price_history` ADD CONSTRAINT `sp_price_hist_product_fk` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` ADD CONSTRAINT `supplier_product_mappings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` ADD CONSTRAINT `sp_mapping_product_fk` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` ADD CONSTRAINT `supplier_product_mappings_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` ADD CONSTRAINT `supplier_product_mappings_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` ADD CONSTRAINT `supplier_product_mappings_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_products` ADD CONSTRAINT `supplier_products_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_products` ADD CONSTRAINT `supplier_products_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_alerts` ADD CONSTRAINT `supply_alerts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_alerts` ADD CONSTRAINT `supply_alerts_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_alerts` ADD CONSTRAINT `supply_alert_supplier_fk` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_alerts` ADD CONSTRAINT `supply_alerts_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_routing_policies` ADD CONSTRAINT `supply_routing_policies_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_routing_policies` ADD CONSTRAINT `supply_routing_policies_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_routing_policies` ADD CONSTRAINT `supply_routing_policies_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;