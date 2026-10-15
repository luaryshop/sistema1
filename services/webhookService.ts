import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { marketplaceConnections, syncJobs, webhookEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import { MarketplaceService } from "./marketplaceService";
import { SupportedMarketplace } from "../adapters/AdapterFactory";
import { routeWebhookEvent } from "./webhookEventRouter";

export class WebhookService {
  static async ingest(connectionId: number, marketplaceType: SupportedMarketplace, body: unknown, signature?: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(marketplaceConnections).where(and(eq(marketplaceConnections.id, connectionId), eq(marketplaceConnections.marketplaceType, marketplaceType))).limit(1);
    if (!rows.length || rows[0].isConnected !== 1) throw new Error("Conexão de marketplace inválida");
    const connection = rows[0];
    const adapter = await MarketplaceService.getAdapter(connection);
    const raw = JSON.stringify(body ?? {});
    const secret = MarketplaceService.decryptConnection(connection).webhookSecret ?? "";
    if (secret && signature && !adapter.verifyWebhookSignature(raw, signature, secret)) throw new Error("Assinatura de webhook inválida");
    if (secret && !signature) throw new Error("Assinatura de webhook ausente");
    const parsed = adapter.parseWebhookPayload(body);
    const route = routeWebhookEvent(parsed?.type, body);
    const externalEventId = String((body as Record<string, unknown> | null)?.id ?? crypto.createHash("sha256").update(raw).digest("hex"));
    const event = { userId: connection.userId, marketplaceConnectionId: connection.id, externalEventId, topic: route.normalizedTopic, payload: raw, status: route.jobType ? "received" : "ignored" } as const;
    try {
      const result = await db.insert(webhookEvents).values(event);
      const eventId = Number((result as any)[0]?.insertId ?? 0);
      if (route.jobType) {
        await db.insert(syncJobs).values({ userId: connection.userId, marketplaceConnectionId: connection.id, type: route.jobType, idempotencyKey: `webhook-${connection.id}-${externalEventId}`, payload: JSON.stringify({ eventId, data: parsed?.data ?? body }) });
      }
      return { accepted: true, duplicate: false, eventId, queued: Boolean(route.jobType), topic: route.normalizedTopic };
    } catch (error) {
      if (String(error).toLowerCase().includes("duplicate") || String(error).toLowerCase().includes("unique")) return { accepted: true, duplicate: true };
      throw error;
    }
  }
}
