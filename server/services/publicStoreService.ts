import { and, eq } from "drizzle-orm";
import { productMedia, productSeoProfiles, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "../_core/env";

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string));
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export class PublicStoreService {
  static async list() {
    const db = await getDb(); if (!db || !ENV.publicStoreUserId) return [];
    return db.select({ product: products, seo: productSeoProfiles }).from(products).leftJoin(productSeoProfiles, and(eq(productSeoProfiles.productId, products.id), eq(productSeoProfiles.channel, "store"))).where(and(eq(products.userId, ENV.publicStoreUserId), eq(products.status, "active")));
  }

  static async getBySlug(slug: string) {
    const db = await getDb(); if (!db || !ENV.publicStoreUserId) return null;
    const rows = await db.select({ product: products, seo: productSeoProfiles }).from(products).leftJoin(productSeoProfiles, and(eq(productSeoProfiles.productId, products.id), eq(productSeoProfiles.channel, "store"))).where(and(eq(products.userId, ENV.publicStoreUserId), eq(products.status, "active"))).limit(500);
    const row = rows.find(({ product, seo }) => (seo?.slug || slugify(product.name)) === slug);
    if (!row) return null;
    const [variants, media] = await Promise.all([
      db.select().from(productVariants).where(and(eq(productVariants.userId, ENV.publicStoreUserId), eq(productVariants.productId, row.product.id), eq(productVariants.status, "active"))),
      db.select().from(productMedia).where(and(eq(productMedia.userId, ENV.publicStoreUserId), eq(productMedia.productId, row.product.id), eq(productMedia.status, "ready"))),
    ]);
    return { ...row, variants, media };
  }

  static jsonLd(record: NonNullable<Awaited<ReturnType<typeof PublicStoreService.getBySlug>>>) {
    const url = `${ENV.publicStoreUrl.replace(/\/$/, "")}/produtos/${record.seo?.slug || slugify(record.product.name)}`;
    const base = { "@context": "https://schema.org", "@type": record.variants.length ? "ProductGroup" : "Product", name: record.product.name, description: record.product.description || undefined, productGroupID: record.variants.length ? record.product.sku : undefined, variesBy: record.variants.length ? ["https://schema.org/color", "https://schema.org/size"] : undefined, image: record.media.filter((item) => item.kind === "image").map((item) => item.url), url } as Record<string, unknown>;
    if (record.variants.length) base.hasVariant = record.variants.map((variant) => ({ "@type": "Product", name: variant.name || record.product.name, sku: variant.sku, offers: { "@type": "Offer", priceCurrency: "BRL", price: (variant.price / 100).toFixed(2), availability: variant.stock - variant.reservedStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } }));
    else base.offers = { "@type": "Offer", priceCurrency: "BRL", price: ((record.product.costBase || 0) / 100).toFixed(2), availability: (record.product.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" };
    return JSON.stringify(base);
  }

  static renderHtml(record: NonNullable<Awaited<ReturnType<typeof PublicStoreService.getBySlug>>>) {
    const title = record.seo?.seoTitle || record.product.name;
    const description = record.seo?.metaDescription || record.product.description || "Confira detalhes deste produto.";
    const image = record.media.find((item) => item.isCover)?.url || record.product.photoUrl || "";
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(`${ENV.publicStoreUrl.replace(/\/$/, "")}/produtos/${record.seo?.slug || slugify(record.product.name)}`)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${image ? `<meta property="og:image" content="${esc(image)}">` : ""}<script type="application/ld+json">${this.jsonLd(record)}</script></head><body><main><h1>${esc(record.product.name)}</h1><p>${esc(record.product.description || "")}</p>${image ? `<img src="${esc(image)}" alt="${esc(record.seo?.altText || record.product.name)}">` : ""}</main></body></html>`;
  }

  static async sitemap() {
    const records = await this.list();
    const urls = records.map(({ product, seo }) => `${ENV.publicStoreUrl.replace(/\/$/, "")}/produtos/${seo?.slug || slugify(product.name)}`);
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${esc(url)}</loc></url>`).join("")}</urlset>`;
  }
}
