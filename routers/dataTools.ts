import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { productSeoProfiles, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { definedOnly, importRowSchema } from "../services/catalogImportRules";


export const dataToolsRouter = router({
  exportCatalog: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const rows = await db.select().from(products).where(eq(products.userId, ctx.user.id));
    const variants = await db.select().from(productVariants).where(eq(productVariants.userId, ctx.user.id));
    const seo = await db.select().from(productSeoProfiles).where(eq(productSeoProfiles.userId, ctx.user.id));
    return { version: 1, exportedAt: new Date().toISOString(), products: rows, variants, seo };
  }),
  importCatalog: protectedProcedure.input(z.object({ rows: z.array(importRowSchema).min(1).max(2000), mode: z.enum(["create_only", "upsert"]).default("create_only") })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    let created = 0; let updated = 0; const errors: Array<{ sku: string; message: string }> = [];
    for (const row of input.rows) {
      try {
        const existing = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, ctx.user.id), eq(products.sku, row.sku))).limit(1);
        if (existing.length) {
          if (input.mode === "create_only") throw new Error("SKU já existe");
          await db.update(products).set({ ...definedOnly(row), updatedAt: new Date() }).where(and(eq(products.id, existing[0].id), eq(products.userId, ctx.user.id))); updated++;
        } else {
          await db.insert(products).values({ ...definedOnly(row), userId: ctx.user.id, sku: row.sku, name: row.name }); created++;
        }
      } catch (error) { errors.push({ sku: row.sku, message: error instanceof Error ? error.message : String(error) }); }
    }
    return { created, updated, failed: errors.length, errors };
  }),
});
