import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  productMedia,
  products,
  syncJobs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { SyncJobService } from "../services/syncJobService";
import { TRPCError } from "@trpc/server";

const requireDb = async () => {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  }
  return db;
};

export const omnichannelRouter = router({
  listMedia: protectedProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      return db
        .select({ media: productMedia })
        .from(productMedia)
        .innerJoin(products, eq(products.id, productMedia.productId))
        .where(and(
          eq(productMedia.userId, ctx.user.id),
          eq(productMedia.productId, input.productId),
          eq(products.userId, ctx.user.id),
        ))
        .orderBy(productMedia.sortOrder, productMedia.id);
    }),

  addMedia: protectedProcedure
    .input(z.object({
      productId: z.number().int().positive(),
      kind: z.enum(["image", "video"]),
      url: z.string().url().max(1000),
      storageKey: z.string().max(500).optional(),
      altText: z.string().max(500).optional(),
      sortOrder: z.number().int().min(0).default(0),
      isCover: z.boolean().default(false),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const product = await db.select({ id: products.id }).from(products).where(
        and(eq(products.id, input.productId), eq(products.userId, ctx.user.id)),
      ).limit(1);
      if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });

      if (input.isCover) {
        await db.update(productMedia).set({ isCover: 0 }).where(
          and(eq(productMedia.productId, input.productId), eq(productMedia.userId, ctx.user.id)),
        );
      }
      const result = await db.insert(productMedia).values({
        userId: ctx.user.id,
        productId: input.productId,
        kind: input.kind,
        url: input.url,
        storageKey: input.storageKey,
        altText: input.altText,
        sortOrder: input.sortOrder,
        isCover: input.isCover ? 1 : 0,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });
      return { id: Number((result as any)[0]?.insertId ?? 0) };
    }),

  removeMedia: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.delete(productMedia).where(
        and(eq(productMedia.id, input.id), eq(productMedia.userId, ctx.user.id)),
      );
      return { success: Number((result as any)[0]?.affectedRows ?? 0) > 0 };
    }),

  enqueueSync: protectedProcedure
    .input(z.object({
      type: z.enum(["import_listing", "publish", "price", "stock", "order"]),
      marketplaceConnectionId: z.number().int().positive().optional(),
      productId: z.number().int().positive().optional(),
      orderId: z.number().int().positive().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
      idempotencyKey: z.string().min(8).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select({ id: syncJobs.id }).from(syncJobs).where(
        and(eq(syncJobs.userId, ctx.user.id), eq(syncJobs.idempotencyKey, input.idempotencyKey)),
      ).limit(1);
      if (existing.length) return { id: existing[0].id, duplicate: true };
      const result = await db.insert(syncJobs).values({
        userId: ctx.user.id,
        marketplaceConnectionId: input.marketplaceConnectionId,
        productId: input.productId,
        orderId: input.orderId,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      });
      return { id: Number((result as any)[0]?.insertId ?? 0), duplicate: false };
    }),

  processPendingJobs: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .mutation(async ({ ctx, input }) => SyncJobService.processPending(ctx.user.id, input.limit)),

  listJobs: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      return db.select().from(syncJobs)
        .where(eq(syncJobs.userId, ctx.user.id))
        .orderBy(desc(syncJobs.createdAt))
        .limit(input.limit);
    }),
});
