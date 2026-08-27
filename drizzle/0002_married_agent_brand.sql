ALTER TABLE `marketplace_listings` ADD `variant_id` int;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `mpn` varchar(100);--> statement-breakpoint
ALTER TABLE `product_variants` ADD `cost_base` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `weight_base` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;