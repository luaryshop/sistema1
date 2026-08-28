import { and, desc, eq, sql } from "drizzle-orm";
import { affiliateEvents, affiliateLinks, affiliateSources, products } from "../../drizzle/schema";
import { getDb } from "../db";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");
  return db;
}

export class AffiliateService {
  static async list(userId: number) {
    const db = requireDb(await getDb());
    const [sources, links] = await Promise.all([
      db.select().from(affiliateSources).where(eq(affiliateSources.userId, userId)).orderBy(desc(affiliateSources.createdAt)),
      db.select().from(affiliateLinks).where(eq(affiliateLinks.userId, userId)).orderBy(desc(affiliateLinks.createdAt)),
    ]);
    return { sources, links };
  }

  static async createSource(userId: number, input: { name: string; network: string; commissionBp: number }) {
    const db = requireDb(await getDb());
    const result = await db.insert(affiliateSources).values({ userId, name: input.name.trim(), network: input.network.trim(), commissionBp: input.commissionBp, status: "active" });
    return { id: Number((result as any)[0]?.insertId ?? 0), status: "active" };
  }

  static async createLink(userId: number, input: { sourceId: number; productId?: number; slug: string; destinationUrl: string }) {
    const db = requireDb(await getDb());
    const source = await db.select({ id: affiliateSources.id }).from(affiliateSources).where(and(eq(affiliateSources.id, input.sourceId), eq(affiliateSources.userId, userId), eq(affiliateSources.status, "active"))).limit(1);
    if (!source.length) throw new Error("Fonte de afiliado não encontrada ou inativa");
    if (input.productId) {
      const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, userId))).limit(1);
      if (!product.length) throw new Error("Produto Mestre não encontrado");
    }
    const result = await db.insert(affiliateLinks).values({ userId, sourceId: input.sourceId, productId: input.productId, slug: input.slug.trim(), destinationUrl: input.destinationUrl.trim(), status: "active" });
    return { id: Number((result as any)[0]?.insertId ?? 0), status: "active" };
  }

  static async recordEvent(userId: number, input: { linkId: number; eventType: "click" | "conversion" | "reversal"; externalEventId?: string; amountCents?: number; commissionCents?: number }) {
    const db = requireDb(await getDb());
    const link = await db.select({ id: affiliateLinks.id }).from(affiliateLinks).where(and(eq(affiliateLinks.id, input.linkId), eq(affiliateLinks.userId, userId), eq(affiliateLinks.status, "active"))).limit(1);
    if (!link.length) throw new Error("Link de afiliado não encontrado ou inativo");
    if (input.externalEventId) {
      const duplicate = await db.select({ id: affiliateEvents.id }).from(affiliateEvents).where(and(eq(affiliateEvents.userId, userId), eq(affiliateEvents.externalEventId, input.externalEventId))).limit(1);
      if (duplicate.length) return { id: duplicate[0].id, duplicate: true };
    }
    const amountCents = Math.max(0, input.amountCents ?? 0);
    const commissionCents = Math.max(0, input.commissionCents ?? 0);
    const result = await db.insert(affiliateEvents).values({ userId, linkId: input.linkId, eventType: input.eventType, externalEventId: input.externalEventId, amountCents, commissionCents });
    const sign = input.eventType === "reversal" ? -1 : 1;
    await db.update(affiliateLinks).set({ clicks: input.eventType === "click" ? sql`${affiliateLinks.clicks} + 1` : undefined, conversions: input.eventType === "conversion" || input.eventType === "reversal" ? sql`greatest(0, ${affiliateLinks.conversions} + ${sign})` : undefined, revenueCents: input.eventType !== "click" ? sql`greatest(0, ${affiliateLinks.revenueCents} + ${sign * amountCents})` : undefined, commissionCents: input.eventType !== "click" ? sql`greatest(0, ${affiliateLinks.commissionCents} + ${sign * commissionCents})` : undefined, updatedAt: new Date() }).where(and(eq(affiliateLinks.id, input.linkId), eq(affiliateLinks.userId, userId)));
    return { id: Number((result as any)[0]?.insertId ?? 0), duplicate: false };
  }

  static async listEvents(userId: number, linkId?: number) {
    const db = requireDb(await getDb());
    return db.select().from(affiliateEvents).where(linkId ? and(eq(affiliateEvents.userId, userId), eq(affiliateEvents.linkId, linkId)) : eq(affiliateEvents.userId, userId)).orderBy(desc(affiliateEvents.occurredAt)).limit(200);
  }
}
