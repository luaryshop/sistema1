import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { marketplaceCategoryMappings, marketplaceAttributeMappings } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { runPublicationPreflight } from "../services/publicationPreflightService";

export const mappingsRouter = router({
  listCategoryMappings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(marketplaceCategoryMappings).where(eq(marketplaceCategoryMappings.userId, ctx.user.id));
  }),
  upsertCategoryMapping: protectedProcedure.input(z.object({
    marketplaceType: z.string(),
    internalCategory: z.string(),
    externalCategoryId: z.string(),
    externalCategoryName: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(marketplaceCategoryMappings).where(and(
      eq(marketplaceCategoryMappings.userId, ctx.user.id),
      eq(marketplaceCategoryMappings.marketplaceType, input.marketplaceType),
      eq(marketplaceCategoryMappings.internalCategory, input.internalCategory),
    )).limit(1);
    if (existing.length) {
      return db.update(marketplaceCategoryMappings).set({
        externalCategoryId: input.externalCategoryId,
        externalCategoryName: input.externalCategoryName,
      }).where(eq(marketplaceCategoryMappings.id, existing[0].id));
    }
    return db.insert(marketplaceCategoryMappings).values({
      userId: ctx.user.id,
      ...input,
    });
  }),
  listAttributeMappings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(marketplaceAttributeMappings).where(eq(marketplaceAttributeMappings.userId, ctx.user.id));
  }),
  upsertAttributeMapping: protectedProcedure.input(z.object({
    marketplaceType: z.string(),
    sourceName: z.string(),
    externalName: z.string(),
    valueMap: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(marketplaceAttributeMappings).where(and(
      eq(marketplaceAttributeMappings.userId, ctx.user.id),
      eq(marketplaceAttributeMappings.marketplaceType, input.marketplaceType),
      eq(marketplaceAttributeMappings.sourceName, input.sourceName),
    )).limit(1);
    if (existing.length) {
      return db.update(marketplaceAttributeMappings).set({
        externalName: input.externalName,
        valueMap: input.valueMap,
      }).where(eq(marketplaceAttributeMappings.id, existing[0].id));
    }
    return db.insert(marketplaceAttributeMappings).values({
      userId: ctx.user.id,
      ...input,
    });
  }),
  runPreflight: protectedProcedure.input(z.object({
    productId: z.number(),
    marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
  })).mutation(async ({ ctx, input }) => {
    return runPublicationPreflight(ctx.user.id, input.productId, input.marketplaceType);
  }),
});
