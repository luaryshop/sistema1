import { and, eq } from "drizzle-orm";
import { listingImportStaging, productIdentifiers, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";

const normalize = (value: unknown) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (value: unknown) => new Set(normalize(value).split(" ").filter((token) => token.length >= 2));

export type MatchClass = "exact" | "probable" | "conflict" | "unmatched";
export type MatchReason = "sku" | "identifier" | "mpn" | "title_brand_attributes" | "title" | "none";
export type MatchEvidence = { field: string; status: "matched" | "conflict" | "missing"; detail?: string };
export type MatchResult = { productId: number | null; variantId?: number | null; confidence: number; matchClass: MatchClass; reason: MatchReason; evidence?: MatchEvidence[]; candidateGap?: number; candidates?: Array<{ productId: number; variantId?: number | null; confidence: number }> };

type ImportedMatchListing = { sku?: string; gtin?: string; mpn?: string; internalCode?: string; title: string; brand?: string; attributes?: Record<string, string> };
type Candidate = { productId: number; variantId?: number | null; sku?: string | null; gtin?: string | null; mpn?: string | null; name: string; brand?: string | null; color?: string | null; material?: string | null; attributes?: Record<string, string> };

function classify(confidence: number): MatchClass {
  if (confidence >= 99) return "exact";
  if (confidence >= 90) return "probable";
  if (confidence >= 70) return "conflict";
  return "unmatched";
}

function compareAttributes(listing: ImportedMatchListing, candidate: Candidate) {
  const listingAttributes = listing.attributes ?? {};
  const values = { ...listingAttributes, brand: listing.brand, color: candidate.color, material: candidate.material };
  let matched = 0;
  let present = 0;
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    present++;
    const candidateValue = key === "brand" ? candidate.brand : candidate.attributes?.[key] ?? (key === "color" ? candidate.color : candidate.material);
    if (candidateValue && normalize(candidateValue) === normalize(value)) matched++;
  }
  return present ? matched / present : 0;
}

export class MatchingService {
  static async match(userId: number, listing: ImportedMatchListing): Promise<MatchResult> {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const [productRows, variantRows, identifierRows] = await Promise.all([
      db.select({ id: products.id, sku: products.sku, name: products.name, brand: products.brand, color: products.color, material: products.material, mpn: products.mpn }).from(products).where(eq(products.userId, userId)),
      db.select({ id: productVariants.id, productId: productVariants.productId, sku: productVariants.sku, gtin: productVariants.gtin, mpn: productVariants.mpn, name: productVariants.name, attributes: productVariants.attributes }).from(productVariants).where(eq(productVariants.userId, userId)),
      db.select({ productId: productIdentifiers.productId, variantId: productIdentifiers.variantId, type: productIdentifiers.type, value: productIdentifiers.value }).from(productIdentifiers).where(eq(productIdentifiers.userId, userId)),
    ]);

    const productById = new Map(productRows.map((row) => [row.id, row]));
    const identifierIndex = new Map<string, { productId: number; variantId?: number | null }>();
    for (const identifier of identifierRows) identifierIndex.set(`${normalize(identifier.type)}:${normalize(identifier.value)}`, { productId: identifier.productId, variantId: identifier.variantId });
    const variantCandidates: Candidate[] = variantRows.map((variant) => ({
      productId: variant.productId,
      variantId: variant.id,
      sku: variant.sku,
      gtin: variant.gtin,
      mpn: variant.mpn,
      name: variant.name || productById.get(variant.productId)?.name || "",
      brand: productById.get(variant.productId)?.brand,
      color: productById.get(variant.productId)?.color,
      material: productById.get(variant.productId)?.material,
      attributes: variant.attributes ? JSON.parse(variant.attributes) as Record<string, string> : {},
    }));
    const productCandidates: Candidate[] = productRows.map((product) => ({ productId: product.id, sku: product.sku, name: product.name, brand: product.brand, color: product.color, material: product.material, mpn: product.mpn, attributes: {} }));
    const candidates = [...variantCandidates, ...productCandidates];

    const sku = normalize(listing.sku || listing.internalCode);
    if (sku) {
      const exact = candidates.find((candidate) => normalize(candidate.sku) === sku) ?? (() => {
        const identifier = ["sku", "internal", "supplier"].map((type) => identifierIndex.get(`${type}:${sku}`)).find(Boolean);
        return identifier ? candidates.find((candidate) => candidate.productId === identifier.productId && (identifier.variantId ? candidate.variantId === identifier.variantId : !candidate.variantId)) : undefined;
      })();
      if (exact) return { productId: exact.productId, variantId: exact.variantId, confidence: 100, matchClass: "exact", reason: "sku", evidence: [{ field: "sku", status: "matched", detail: "SKU exato" }], candidateGap: 100 };
    }

    for (const value of [listing.gtin, listing.mpn].filter(Boolean)) {
      const normalizedValue = normalize(value);
      const direct = candidates.find((candidate) => normalize(candidate.gtin) === normalizedValue || normalize(candidate.mpn) === normalizedValue);
      const indexed = identifierRows.find((identifier) => normalize(identifier.value) === normalizedValue);
      const found = direct ?? (indexed ? candidates.find((candidate) => candidate.productId === indexed.productId && (indexed.variantId ? candidate.variantId === indexed.variantId : !candidate.variantId)) : undefined);
      if (found) return { productId: found.productId, variantId: found.variantId, confidence: value === listing.gtin ? 98 : 96, matchClass: "probable", reason: value === listing.gtin ? "identifier" : "mpn", evidence: [{ field: value === listing.gtin ? "gtin" : "mpn", status: "matched", detail: "Identificador exato" }], candidateGap: 98 };
    }

    const listingTokens = tokens(listing.title);
    const scored = candidates.map((candidate) => {
      const candidateTokens = tokens(candidate.name);
      const intersection = Array.from(listingTokens).filter((token) => candidateTokens.has(token)).length;
      const union = new Set(Array.from(listingTokens).concat(Array.from(candidateTokens))).size;
      const titleSimilarity = union ? intersection / union : 0;
      const titleScore = titleSimilarity * 72;
      const brandMatch = Boolean(listing.brand && candidate.brand && normalize(listing.brand) === normalize(candidate.brand));
      const brandScore = brandMatch ? 12 : 0;
      const attributeRatio = compareAttributes(listing, candidate);
      const attributeScore = attributeRatio * 16;
      return { ...candidate, confidence: Math.round(Math.min(98, titleScore + brandScore + attributeScore)), titleSimilarity, brandMatch, attributeRatio };
    }).filter((candidate) => candidate.confidence >= 35).sort((a, b) => b.confidence - a.confidence);
    const best = scored[0];
    const second = scored[1];
    const candidateGap = second ? best.confidence - second.confidence : best?.confidence ?? 0;
    const evidence = best ? [
      { field: "title", status: best.titleSimilarity >= 0.7 ? "matched" : best.titleSimilarity >= 0.45 ? "conflict" : "missing", detail: `${Math.round(best.titleSimilarity * 100)}% de similaridade` },
      { field: "brand", status: listing.brand ? (best.brandMatch ? "matched" : "conflict") : "missing" },
      { field: "attributes", status: Object.keys(listing.attributes ?? {}).length ? (best.attributeRatio >= 0.5 ? "matched" : "conflict") : "missing" },
    ] as MatchEvidence[] : undefined;
    if (!best || best.confidence < 70) return { productId: null, confidence: best?.confidence ?? 0, matchClass: "unmatched", reason: "none", evidence, candidateGap, candidates: scored.slice(0, 5).map((item) => ({ productId: item.productId, variantId: item.variantId, confidence: item.confidence })) };
    const ambiguous = second && candidateGap < 8;
    const confidence = ambiguous ? Math.min(best.confidence, 89) : best.confidence;
    return { productId: best.productId, variantId: best.variantId, confidence, matchClass: classify(confidence), reason: listing.brand || Object.keys(listing.attributes ?? {}).length ? "title_brand_attributes" : "title", evidence, candidateGap, candidates: scored.slice(0, 5).map((item) => ({ productId: item.productId, variantId: item.variantId, confidence: item.confidence })) };
  }

  static async analyzeStaging(userId: number, stagingId: number) {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const rows = await db.select().from(listingImportStaging).where(and(eq(listingImportStaging.id, stagingId), eq(listingImportStaging.userId, userId))).limit(1);
    if (!rows.length) throw new Error("Staging não encontrado");
    const listing = JSON.parse(rows[0].payload) as ImportedMatchListing;
    const match = await this.match(userId, listing);
    await db.update(listingImportStaging).set({ suggestedProductId: match.productId, matchConfidence: match.confidence, matchClass: match.matchClass, matchReason: match.reason, matchEvidence: JSON.stringify({ evidence: match.evidence ?? [], candidateGap: match.candidateGap }), matchCandidates: JSON.stringify(match.candidates ?? []), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, stagingId), eq(listingImportStaging.userId, userId)));
    return match;
  }
}
