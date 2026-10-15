import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { productIdentifiers, products, productVariants } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { writeAudit } from "../services/auditService";

const identifierType = z.enum(["SKU", "EAN", "GTIN", "MPN", "UPC", "INTERNAL", "SUPPLIER"]);
export const identifiersRouter = router({
  list: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.select().from(productIdentifiers).where(and(eq(productIdentifiers.userId, ctx.user.id), eq(productIdentifiers.productId, input.productId)));
  }),
  add: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), type: identifierType, value: z.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
    if (input.variantId) {
      const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(productVariants.userId, ctx.user.id))).limit(1);
      if (!variant.length) throw new TRPCError({ code: "NOT_FOUND", message: "Variante não encontrada" });
    }
    const duplicate = await db.select({ id: productIdentifiers.id }).from(productIdentifiers).where(and(eq(productIdentifiers.userId, ctx.user.id), eq(productIdentifiers.type, input.type), eq(productIdentifiers.value, input.value))).limit(1);
    if (duplicate.length) throw new TRPCError({ code: "CONFLICT", message: "Identificador já utilizado nesta conta" });
    const result = await db.insert(productIdentifiers).values({ userId: ctx.user.id, ...input });
    const id = Number((result as any)[0]?.insertId ?? 0);
    await writeAudit({ userId: ctx.user.id, action: "add_identifier", entity: "product_identifier", entityId: id, after: input, origin: "admin" });
    return { id };
  }),
  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const current = await db.select().from(productIdentifiers).where(and(eq(productIdentifiers.id, input.id), eq(productIdentifiers.userId, ctx.user.id))).limit(1);
    if (!current.length) throw new TRPCError({ code: "NOT_FOUND", message: "Identificador não encontrado" });
    await db.delete(productIdentifiers).where(and(eq(productIdentifiers.id, input.id), eq(productIdentifiers.userId, ctx.user.id)));
    await writeAudit({ userId: ctx.user.id, action: "remove_identifier", entity: "product_identifier", entityId: input.id, before: current[0], origin: "admin" });
    return { success: true };
  }),
});
