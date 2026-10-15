import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { productAttributes, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const variantInput = z.object({ productId: z.number().int().positive(), sku: z.string().trim().min(1).max(100), gtin: z.string().max(50).optional(), name: z.string().max(255).optional(), attributes: z.record(z.string(), z.string()).default({}), price: z.number().int().min(0).default(0), stock: z.number().int().min(0).default(0), status: z.enum(["active", "inactive"]).default("active") });
const variantUpdateInput = z.object({ id: z.number().int().positive(), sku: z.string().trim().min(1).max(100).optional(), gtin: z.string().max(50).optional(), name: z.string().max(255).optional(), attributes: z.record(z.string(), z.string()).optional(), price: z.number().int().min(0).optional(), stock: z.number().int().min(0).optional(), status: z.enum(["active", "inactive"]).optional() });

export const catalogEnhancementsRouter = router({
  listVariants: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.select().from(productVariants).where(and(eq(productVariants.userId, ctx.user.id), eq(productVariants.productId, input.productId)));
  }),
  createVariant: protectedProcedure.input(variantInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto mestre não encontrado" });
    const duplicate = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.userId, ctx.user.id), eq(productVariants.sku, input.sku))).limit(1);
    if (duplicate.length) throw new TRPCError({ code: "CONFLICT", message: "SKU de variante já cadastrado" });
    const result = await db.insert(productVariants).values({ userId: ctx.user.id, productId: input.productId, sku: input.sku, gtin: input.gtin, name: input.name, attributes: JSON.stringify(input.attributes), price: input.price, stock: input.stock, status: input.status });
    return { id: Number((result as any)[0]?.insertId ?? 0) };
  }),
  updateVariant: protectedProcedure.input(variantUpdateInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const current = await db.select().from(productVariants).where(and(eq(productVariants.id, input.id), eq(productVariants.userId, ctx.user.id))).limit(1);
    if (!current.length) throw new TRPCError({ code: "NOT_FOUND", message: "Variante não encontrada" });
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (input.sku !== undefined) values.sku = input.sku; if (input.gtin !== undefined) values.gtin = input.gtin; if (input.name !== undefined) values.name = input.name; if (input.attributes !== undefined) values.attributes = JSON.stringify(input.attributes); if (input.price !== undefined) values.price = input.price; if (input.stock !== undefined) values.stock = input.stock; if (input.status !== undefined) values.status = input.status;
    await db.update(productVariants).set(values).where(and(eq(productVariants.id, input.id), eq(productVariants.userId, ctx.user.id))); return { success: true };
  }),
  removeVariant: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    await db.delete(productVariants).where(and(eq(productVariants.id, input.id), eq(productVariants.userId, ctx.user.id))); return { success: true };
  }),
  listAttributes: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.select().from(productAttributes).where(and(eq(productAttributes.userId, ctx.user.id), eq(productAttributes.productId, input.productId)));
  }),
  upsertAttribute: protectedProcedure.input(z.object({ productId: z.number().int().positive(), namespace: z.string().max(50).default("catalog"), name: z.string().min(1).max(150), value: z.string().max(10000) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1); if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
    const result = await db.insert(productAttributes).values({ userId: ctx.user.id, ...input }); return { id: Number((result as any)[0]?.insertId ?? 0) };
  }),
});
