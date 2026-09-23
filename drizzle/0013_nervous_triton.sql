ALTER TABLE `products` ADD CONSTRAINT `products_user_sku_unique` UNIQUE(`user_id`,`sku`);
