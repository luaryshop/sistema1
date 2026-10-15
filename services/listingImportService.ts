import { SupportedMarketplace } from "../adapters/AdapterFactory";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { listingImportStaging, products } from "../../drizzle/schema";
import { MarketplaceService } from "./marketplaceService";
import type { ImportedListing } from "../adapters/types";
import { MatchingService } from "./matchingService";

export class ListingImportService {
  static async previewListings(
    userId: number,
    marketplaceType: SupportedMarketplace,
    status: string = "all",
    limit: number = 50,
  ): Promise<ImportedListing[]> {
    const connection = await MarketplaceService.getConnection(userId, marketplaceType);
    if (!connection || !connection.isConnected) {
      throw new Error(`Marketplace ${marketplaceType} não está conectado`);
    }
    const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);
    const adapter = await MarketplaceService.getAdapter(connection);
    return adapter.listListings(accessToken, { status, limit });
  }

  static async stageListings(userId: number, marketplaceType: SupportedMarketplace, status = "all", limit = 100) {
    const connection = await MarketplaceService.getConnection(userId, marketplaceType);
    if (!connection || !connection.isConnected) throw new Error(`Marketplace ${marketplaceType} não está conectado`);
    const listings = await this.previewListings(userId, marketplaceType, status, Math.min(limit, 200));
    const db = await getDb(); if (!db) throw new Error("Database not available");
    let staged = 0;
    for (const listing of listings) {
      const match = await MatchingService.match(userId, listing);
      await db.insert(listingImportStaging).values({ userId, marketplaceConnectionId: connection.id, externalListingId: listing.listingId, payload: JSON.stringify(listing), normalizedTitle: listing.title.trim().toLowerCase(), suggestedProductId: match.productId ?? undefined, matchConfidence: match.confidence, matchClass: match.matchClass, matchReason: match.reason, matchEvidence: JSON.stringify({ evidence: match.evidence ?? [], candidateGap: match.candidateGap }), matchCandidates: JSON.stringify(match.candidates ?? []), status: "pending" }).onDuplicateKeyUpdate({ set: { payload: JSON.stringify(listing), suggestedProductId: match.productId ?? null, matchConfidence: match.confidence, matchClass: match.matchClass, matchReason: match.reason, matchEvidence: JSON.stringify({ evidence: match.evidence ?? [], candidateGap: match.candidateGap }), matchCandidates: JSON.stringify(match.candidates ?? []), updatedAt: new Date() } });
      staged++;
    }
    return { staged };
  }

  static async listStaged(userId: number, status = "pending") {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const condition = status === "all" ? eq(listingImportStaging.userId, userId) : and(eq(listingImportStaging.userId, userId), eq(listingImportStaging.status, status));
    return db.select().from(listingImportStaging).where(condition).limit(200);
  }
}
