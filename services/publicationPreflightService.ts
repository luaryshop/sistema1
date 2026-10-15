import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { marketplaceCategoryMappings, products, productSeoProfiles, syncConflicts, publicationPreflightResults } from "../../drizzle/schema";
import { resolveProductMedia, validatePublicationMedia } from "./mediaResolver";
import { MarketplaceService } from "./marketplaceService";
import { SupportedMarketplace } from "../adapters/AdapterFactory";

export type PreflightIssue = { code: string; message: string; severity: "error" | "warning" };

export async function runPublicationPreflight(userId: number, productId: number, marketplaceType: SupportedMarketplace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const issues: PreflightIssue[] = [];
  const productRows = await db.select().from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1);
  const product = productRows[0];
  if (!product) issues.push({ code: "PRODUCT_NOT_FOUND", message: "Produto não encontrado para esta conta", severity: "error" });
  if (product && !product.sku.trim()) issues.push({ code: "SKU_REQUIRED", message: "SKU é obrigatório", severity: "error" });
  if (product && Number(product.basePrice ?? 0) <= 0) issues.push({ code: "SALE_PRICE_REQUIRED", message: "Preço de venda deve ser maior que zero", severity: "error" });
  if (product && Number(product.stock ?? 0) < 0) issues.push({ code: "STOCK_INVALID", message: "Estoque não pode ser negativo", severity: "error" });

  const mapping = product?.category ? await db.select().from(marketplaceCategoryMappings).where(and(
    eq(marketplaceCategoryMappings.userId, userId),
    eq(marketplaceCategoryMappings.marketplaceType, marketplaceType),
    eq(marketplaceCategoryMappings.internalCategory, product.category),
  )).limit(1) : [];
  if (!mapping.length) issues.push({ code: "CATEGORY_MAPPING_REQUIRED", message: `Categoria '${product?.category || ""}' ainda não está mapeada para ${marketplaceType}`, severity: "error" });

  if (product) {
    const mediaCheck = validatePublicationMedia(await resolveProductMedia(userId, productId));
    for (const message of mediaCheck.issues) issues.push({ code: "MEDIA_INVALID", message, severity: "error" });
  }

  const connection = await MarketplaceService.getConnection(userId, marketplaceType);
  if (!connection?.isConnected) issues.push({ code: "CONNECTION_REQUIRED", message: "Marketplace não está conectado", severity: "error" });
  const openConflicts = await db.select({ id: syncConflicts.id }).from(syncConflicts).where(and(
    eq(syncConflicts.userId, userId), eq(syncConflicts.productId, productId), eq(syncConflicts.status, "open"),
  )).limit(1);
  if (openConflicts.length) issues.push({ code: "OPEN_CONFLICT", message: "Resolva os conflitos abertos antes da publicação", severity: "error" });

  const seo = await db.select({ score: productSeoProfiles.score }).from(productSeoProfiles).where(and(eq(productSeoProfiles.userId, userId), eq(productSeoProfiles.productId, productId), eq(productSeoProfiles.channel, marketplaceType))).limit(1);
  if (!seo.length || Number(seo[0].score || 0) < 50) issues.push({ code: "SEO_LOW", message: "Perfil de SEO inexistente ou abaixo de 50 pontos", severity: "warning" });

  const errors = issues.filter((issue) => issue.severity === "error");
  const status = errors.length ? "blocked" : "ready";
  const score = Math.max(0, 100 - errors.length * 20 - (issues.length - errors.length) * 5);
  await db.insert(publicationPreflightResults).values({ userId, productId, marketplaceType, status, score, issues: JSON.stringify(issues) });
  return { status, score, issues, categoryId: mapping[0]?.externalCategoryId };
}
