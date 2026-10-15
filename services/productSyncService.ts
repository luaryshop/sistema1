import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { products, marketplaceListings, syncLogs, marketplaceConnections } from "../../drizzle/schema";
import { resolveProductMedia, validatePublicationMedia } from "./mediaResolver";
import { runPublicationPreflight } from "./publicationPreflightService";
import { resolveMarketplaceAttributes } from "./attributeMappingService";
import { MarketplaceService } from "./marketplaceService";
import { PublishProductPayload, UpdatePricePayload, UpdateStockPayload } from "../adapters/types";
import { SupportedMarketplace } from "../adapters/AdapterFactory";
import { assertMarketplaceWriteEnabled } from "./marketplaceSafetyService";
import { InventoryService } from "./inventoryService";

/**
 * Product Sync Service
 * Handles publishing, updating, and syncing products across marketplaces
 */

export class ProductSyncService {
  /**
   * Publish a product to a specific marketplace
   */
  static async publishProductToMarketplace(
    userId: number,
    productId: number,
    marketplaceType: SupportedMarketplace
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const startTime = new Date();

    try {
      assertMarketplaceWriteEnabled("publicação", marketplaceType);
      // Get product
      const product = await db
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.userId, userId)))
        .limit(1);
      if (product.length === 0) {
        throw new Error("Product not found");
      }

      const prod = product[0];

      // Get marketplace connection
      const connection = await MarketplaceService.getConnection(userId, marketplaceType);
      if (!connection || !connection.isConnected) {
        throw new Error(`Marketplace ${marketplaceType} not connected`);
      }

      const preflight = await runPublicationPreflight(userId, productId, marketplaceType);
      if (preflight.status === "blocked") {
        throw new Error(`Publication Gate bloqueou a publicação: ${preflight.issues.filter((issue) => issue.severity === "error").map((issue) => issue.message).join("; ")}`);
      }

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      const media = validatePublicationMedia(await resolveProductMedia(userId, productId));
      const availability = await InventoryService.availableToSell(userId, productId);
      const payload: PublishProductPayload = {
        title: prod.name,
        description: prod.description || "",
        price: prod.basePrice || 0,
        stock: availability.available,
        sku: prod.sku,
        images: media.images,
        brand: prod.brand || undefined,
        category: preflight.categoryId || prod.category || undefined,
        attributes: await resolveMarketplaceAttributes(userId, productId, marketplaceType),
      };

      // Publish product
      const result = await adapter.publishProduct(accessToken, payload);

      // Save listing to database
      await db.insert(marketplaceListings).values({
        marketplaceConnectionId: connection.id,
        productId,
        marketplaceListingId: result.listingId,
        title: prod.name,
        description: prod.description || undefined,
        price: prod.basePrice || 0,
        stock: availability.available,
        status: "active",
        listingUrl: result.listingUrl,
        lastPublishedAt: result.publishedAt,
      });

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId: connection.id,
        productId,
        syncType: "product_publish",
        status: "success",
        metadata: JSON.stringify({ listingId: result.listingId }),
      });

      return { success: true, listingId: result.listingId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        productId,
        syncType: "product_publish",
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update product price on a marketplace
   */
  static async updatePriceOnMarketplace(
    userId: number,
    listingId: string,
    marketplaceConnectionId: number,
    newPrice: number
  ): Promise<{ success: boolean; error?: string }> {
    assertMarketplaceWriteEnabled("atualização de preço");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Get marketplace connection
      const connections = await db
        .select()
        .from(marketplaceConnections)
        .where(
          and(
            eq(marketplaceConnections.id, marketplaceConnectionId),
            eq(marketplaceConnections.userId, userId)
          )
        )
        .limit(1);

      if (connections.length === 0) {
        throw new Error("Marketplace connection not found");
      }

      const connection = connections[0];

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      // Update price
      const payload: UpdatePricePayload = {
        listingId,
        price: newPrice,
      };

      await adapter.updatePrice(accessToken, payload);

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "price_update",
        status: "success",
        metadata: JSON.stringify({ listingId, newPrice }),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "price_update",
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update product stock on a marketplace
   */
  static async updateStockOnMarketplace(
    userId: number,
    listingId: string,
    marketplaceConnectionId: number,
    newStock: number
  ): Promise<{ success: boolean; error?: string }> {
    assertMarketplaceWriteEnabled("atualização de estoque");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Get marketplace connection
      const connections = await db
        .select()
        .from(marketplaceConnections)
        .where(
          and(
            eq(marketplaceConnections.id, marketplaceConnectionId),
            eq(marketplaceConnections.userId, userId)
          )
        )
        .limit(1);

      if (connections.length === 0) {
        throw new Error("Marketplace connection not found");
      }

      const connection = connections[0];

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      // Update stock from unified ATS when the listing is linked to a master product.
      const listing = await db.select({ productId: marketplaceListings.productId }).from(marketplaceListings).where(and(eq(marketplaceListings.marketplaceConnectionId, marketplaceConnectionId), eq(marketplaceListings.marketplaceListingId, listingId))).limit(1);
      const effectiveStock = listing.length ? (await InventoryService.availableToSell(userId, listing[0].productId)).available : Math.max(0, newStock);
      const payload: UpdateStockPayload = { listingId, stock: effectiveStock };

      await adapter.updateStock(accessToken, payload);

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "stock_sync",
        status: "success",
        metadata: JSON.stringify({ listingId, newStock: effectiveStock }),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "stock_sync",
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Publish product to all connected marketplaces
   */
  static async publishProductToAllMarketplaces(
    userId: number,
    productId: number
  ): Promise<{ successful: string[]; failed: { marketplace: string; error: string }[] }> {
    const connections = await MarketplaceService.getUserConnections(userId);
    const successful: string[] = [];
    const failed: { marketplace: string; error: string }[] = [];

    for (const connection of connections) {
      if (connection.isConnected === 1) {
        const result = await this.publishProductToMarketplace(
          userId,
          productId,
          connection.marketplaceType as SupportedMarketplace
        );

        if (result.success) {
          successful.push(connection.marketplaceType);
        } else {
          failed.push({
            marketplace: connection.marketplaceType,
            error: result.error || "Unknown error",
          });
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Get sync history for a product
   */
  static async getSyncHistory(userId: number, productId?: number, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let query = db.select().from(syncLogs).where(eq(syncLogs.userId, userId)) as any;

    if (productId) {
      query = query.where(eq(syncLogs.productId, productId));
    }

    return query.limit(limit);
  }
}
