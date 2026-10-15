import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { productSeoProfiles, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const channelSchema = z.enum(["store", "mercadolivre", "shopee"]);
const profileInput = z.object({
  productId: z.number().int().positive(),
  channel: channelSchema.default("store"),
  slug: z.string().max(255).optional(),
  seoTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(320).optional(),
  focusKeyword: z.string().max(150).optional(),
  secondaryKeywords: z.array(z.string().max(80)).max(20).default([]),
  altText: z.string().max(500).optional(),
  canonicalUrl: z.string().url().max(500).optional(),
  status: z.enum(["draft", "approved", "published"]).default("draft"),
});

function analyze(input: z.infer<typeof profileInput>, product: { name: string; description: string | null; photoUrl: string | null }) {
  const issues: string[] = [];
  let score = 0;
  const title = input.seoTitle?.trim() ?? "";
  const description = input.metaDescription?.trim() ?? "";
  const keyword = input.focusKeyword?.trim().toLowerCase() ?? "";
  const productName = product.name.toLowerCase();
  if (title.length >= 30 && title.length <= 60) score += 20; else issues.push("Título SEO deve ter entre 30 e 60 caracteres.");
  if (description.length >= 120 && description.length <= 160) score += 20; else issues.push("Meta description deve ter entre 120 e 160 caracteres.");
  if (keyword && title.toLowerCase().includes(keyword)) score += 15; else issues.push("Palavra-chave principal deve aparecer no título SEO.");
  if (keyword && (productName.includes(keyword) || (product.description ?? "").toLowerCase().includes(keyword))) score += 15; else issues.push("Palavra-chave deve aparecer no conteúdo do produto.");
  if (input.secondaryKeywords.length >= 2) score += 10; else issues.push("Adicione pelo menos duas palavras-chave secundárias.");
  if (input.altText?.trim() && (product.photoUrl || input.channel !== "store")) score += 10; else issues.push("Defina texto alternativo para a imagem principal.");
  if (input.channel !== "store" || input.canonicalUrl) score += 10; else issues.push("Defina URL canônica para a página da loja.");
  return { score, issues };
}

export const seoAdvancedRouter = router({
  get: protectedProcedure.input(z.object({ productId: z.number().int().positive(), channel: channelSchema.default("store") })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const rows = await db.select().from(productSeoProfiles).where(and(eq(productSeoProfiles.userId, ctx.user.id), eq(productSeoProfiles.productId, input.productId), eq(productSeoProfiles.channel, input.channel))).limit(1);
    return rows[0] ?? null;
  }),

  analyze: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const productRows = await db.select({ name: products.name, description: products.description, photoUrl: products.photoUrl }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
    if (!productRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
    const result = analyze(input, productRows[0]);
    return { ...result, schemaJson: buildProductSchema(input, productRows[0]) };
  }),

  save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const productRows = await db.select({ name: products.name, description: products.description, photoUrl: products.photoUrl }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
    if (!productRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
    const result = analyze(input, productRows[0]);
    const schemaJson = buildProductSchema(input, productRows[0]);
    const existing = await db.select({ id: productSeoProfiles.id }).from(productSeoProfiles).where(and(eq(productSeoProfiles.userId, ctx.user.id), eq(productSeoProfiles.productId, input.productId), eq(productSeoProfiles.channel, input.channel))).limit(1);
    const values = { userId: ctx.user.id, productId: input.productId, channel: input.channel, slug: input.slug, seoTitle: input.seoTitle, metaDescription: input.metaDescription, focusKeyword: input.focusKeyword, secondaryKeywords: JSON.stringify(input.secondaryKeywords), altText: input.altText, canonicalUrl: input.canonicalUrl, schemaJson, score: result.score, issues: JSON.stringify(result.issues), status: input.status };
    if (existing.length) { await db.update(productSeoProfiles).set({ ...values, updatedAt: new Date() }).where(eq(productSeoProfiles.id, existing[0].id)); return { id: existing[0].id, ...result, schemaJson }; }
    const inserted = await db.insert(productSeoProfiles).values(values);
    return { id: Number((inserted as any)[0]?.insertId ?? 0), ...result, schemaJson };
  }),
});

function buildProductSchema(input: z.infer<typeof profileInput>, product: { name: string; description: string | null; photoUrl: string | null }) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.photoUrl ? [product.photoUrl] : undefined,
    url: input.canonicalUrl ?? undefined,
    offers: { "@type": "Offer", availability: "https://schema.org/InStock" },
  });
}
