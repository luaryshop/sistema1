ALTER TABLE `supplier_product_mappings` DROP FOREIGN KEY `supplier_product_mappings_product_id_products_id_fk`;
--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` MODIFY COLUMN `product_id` int;--> statement-breakpoint
ALTER TABLE `supplier_product_mappings` ADD CONSTRAINT `supplier_product_mappings_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;