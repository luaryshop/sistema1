import { and, eq } from "drizzle-orm";
import { supplierProductMappings, supplierProducts } from "../../drizzle/schema";
import { getDb } from "../db";
import { MatchingService, type MatchClass } from "../services/matchingService";
import { shouldAutoApproveExact } from "../supply/securityPolicy";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");
  return db;
}

export class SupplierMatchingService {
  static async analyze(userId: number, supplierProductId: number) {
    const db = requireDb(await getDb());
    const rows = await db.select().from(supplierProducts).where(and(eq(supplierProducts.id, supplierProductId), eq(supplierProducts.userId, userId))).limit(1);
    if (!rows.length) throw new Error("Produto do fornecedor não encontrado");
    const source = rows[0];
    let attributes: Record<string, string> = {};
    try { attributes = source.attributes ? JSON.parse(source.attributes) : {}; } catch { attributes = {}; }
    const result = await MatchingService.match(userId, {
      sku: source.sku ?? undefined,
      gtin: source.gtin ?? source.ean ?? undefined,
      mpn: source.mpn ?? undefined,
      internalCode: source.internalCode ?? undefined,
      title: source.name,
      brand: source.brand ?? undefined,
      attributes,
    });
    const autoApproved = result.matchClass === "exact" && shouldAutoApproveExact(process.env.AUTO_APPROVE_EXACT);
    const status = autoApproved ? "approved" as const : "pending_review" as const;
    const current = await db.select({ id: supplierProductMappings.id }).from(supplierProductMappings).where(and(eq(supplierProductMappings.userId, userId), eq(supplierProductMappings.supplierProductId, supplierProductId))).limit(1);
    const values = { productId: result.productId ?? null, variantId: result.variantId ?? null, confidence: result.confidence, matchType: result.matchClass, status, ...(autoApproved ? { reviewedAt: new Date() } : {}), updatedAt: new Date() };
    if (current.length) await db.update(supplierProductMappings).set(values).where(and(eq(supplierProductMappings.id, current[0].id), eq(supplierProductMappings.userId, userId)));
    else await db.insert(supplierProductMappings).values({ ...values, userId, supplierProductId });
    return { ...result, reviewRequired: !autoApproved, status };
  }

  static canApprove(matchClass: MatchClass, reviewed: boolean) {
    return reviewed && ["exact", "probable"].includes(matchClass);
  }
}
