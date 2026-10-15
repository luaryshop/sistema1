import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ProductSyncService } from "../services/productSyncService";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { products } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { writeAudit } from "../services/auditService";

const productFields = {
  sku: z.string().trim().min(1, "SKU é obrigatório").max(100),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(255),
  category: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  description: z.string().trim().max(10000).optional(),
  costBase: z.number().int().min(0).default(0),
  basePrice: z.number().int().min(0).default(0),
  weightBase: z.number().int().min(0).default(0),
  height: z.number().int().min(0).default(0),
  width: z.number().int().min(0).default(0),
  length: z.number().int().min(0).default(0),
  ncm: z.string().max(20).optional(),
  cest: z.string().max(20).optional(),
  origin: z.string().max(30).optional(),
  mpn: z.string().max(100).optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
};

export const productInput = z.object(productFields);

export function isProductOwnedByUser(productOwnerId: number, userId: number) {
  return productOwnerId === userId;
}

export const productsRouter = router({
  /**
   * Publish a product to a specific marketplace
   */
  publishToMarketplace: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.publishProductToMarketplace(
          ctx.user.id,
          input.productId,
          input.marketplaceType
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to publish product",
          });
        }

        return {
          success: true,
          listingId: result.listingId,
          message: `Product published to ${input.marketplaceType}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to publish product",
        });
      }
    }),

  /**
   * Publish a product to all connected marketplaces
   */
  publishToAllMarketplaces: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.publishProductToAllMarketplaces(
          ctx.user.id,
          input.productId
        );

        return {
          successful: result.successful,
          failed: result.failed,
          message: `Published to ${result.successful.length} marketplace(s)`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to publish product",
        });
      }
    }),

  /**
   * Update product price on a marketplace
   */
  updatePrice: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        marketplaceConnectionId: z.number(),
        newPrice: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.updatePriceOnMarketplace(
          ctx.user.id,
          input.listingId,
          input.marketplaceConnectionId,
          input.newPrice
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to update price",
          });
        }

        return { success: true, message: "Price updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update price",
        });
      }
    }),

  /**
   * Update product stock on a marketplace
   */
  updateStock: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        marketplaceConnectionId: z.number(),
        newStock: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.updateStockOnMarketplace(
          ctx.user.id,
          input.listingId,
          input.marketplaceConnectionId,
          input.newStock
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to update stock",
          });
        }

        return { success: true, message: "Stock updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update stock",
        });
      }
    }),

  /**
   * Get sync history for a product
   */
  getSyncHistory: protectedProcedure
    .input(z.object({ productId: z.number().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      try {
        const history = await ProductSyncService.getSyncHistory(
          ctx.user.id,
          input.productId,
          input.limit
        );

        return history;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch sync history",
        });
      }
    }),

  /**
   * List products for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userProducts = await db.select().from(products).where(eq(products.userId, ctx.user.id));

      return userProducts;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch products",
      });
    }
  }),

  /**
   * Get a specific product
   */
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const product = await db
        .select()
        .from(products)
        .where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)))
        .limit(1);

      if (product.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product[0];
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch product",
      });
    }
  }),

  /**
   * Create a new product
   */
  create: protectedProcedure
    .input(productInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const duplicate = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, ctx.user.id), eq(products.sku, input.sku))).limit(1);
        if (duplicate[0]) throw new TRPCError({ code: "CONFLICT", message: "Já existe um produto com este SKU" });
        const result = await db.insert(products).values({ userId: ctx.user.id, ...input });
        const id = Number((result as any)[0]?.insertId ?? 0);
        await writeAudit({ userId: ctx.user.id, action: "create_product", entity: "product", entityId: id, after: input, origin: "admin" });
        return { id, success: true, message: "Product created successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create product",
        });
      }
    }),

  /**
   * Update a product
   */
  update: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), ...productFields }).partial({ sku: true, name: true, category: true, brand: true, description: true, costBase: true, stock: true, minStock: true }).extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, unknown> = {};
        if (input.sku !== undefined) updateData.sku = input.sku;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.brand !== undefined) updateData.brand = input.brand;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.costBase !== undefined) updateData.costBase = input.costBase;
        if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
        if (input.weightBase !== undefined) updateData.weightBase = input.weightBase;
        if (input.height !== undefined) updateData.height = input.height;
        if (input.width !== undefined) updateData.width = input.width;
        if (input.length !== undefined) updateData.length = input.length;
        if (input.ncm !== undefined) updateData.ncm = input.ncm;
        if (input.cest !== undefined) updateData.cest = input.cest;
        if (input.origin !== undefined) updateData.origin = input.origin;
        if (input.mpn !== undefined) updateData.mpn = input.mpn;
        if (input.stock !== undefined) updateData.stock = input.stock;
        if (input.minStock !== undefined) updateData.minStock = input.minStock;

        const current = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
        if (!current[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
        if (input.sku !== undefined) {
          const duplicate = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, ctx.user.id), eq(products.sku, input.sku))).limit(1);
          if (duplicate[0] && duplicate[0].id !== input.id) throw new TRPCError({ code: "CONFLICT", message: "Já existe um produto com este SKU" });
        }
        if (Object.keys(updateData).length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe ao menos um campo para atualizar" });
        }
        const before = await db.select().from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
        await db.update(products).set(updateData).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
        await writeAudit({ userId: ctx.user.id, action: "update_product", entity: "product", entityId: input.id, before: before[0], after: updateData, origin: "admin" });
        return { success: true, message: "Product updated successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update product",
        });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const current = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
        if (!current[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
        const before = await db.select().from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
        await db.delete(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
        await writeAudit({ userId: ctx.user.id, action: "delete_product", entity: "product", entityId: input.id, before: before[0], origin: "admin" });
        return { success: true, message: "Product removed successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to remove product",
        });
      }
    }),
});
