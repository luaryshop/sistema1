import { and, eq, lte } from "drizzle-orm";
import { marketplaceConnections, syncJobs } from "../../drizzle/schema";
import { getDb } from "../db";
import { ProductSyncService } from "./productSyncService";
import { OrderSyncService } from "./orderSyncService";
import { SupportedMarketplace } from "../adapters/AdapterFactory";
import { MarketplaceRateLimiter } from "./rateLimiter";
import { SupplierImportService } from "../suppliers/supplierImportService";

const MAX_ATTEMPTS = 5;
const backoffMinutes = (attempt: number) => Math.min(60, 2 ** Math.max(0, attempt - 1));

export class SyncJobService {
  static async processPending(userId: number, limit = 10) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const jobs = await db.select().from(syncJobs).where(
      and(eq(syncJobs.userId, userId), eq(syncJobs.status, "pending"), lte(syncJobs.nextRunAt, new Date())),
    ).limit(Math.min(limit, 50));
    const results: Array<{ id: number; status: string; error?: string }> = [];

    for (const job of jobs) {
      await db.update(syncJobs).set({ status: "processing", lockedAt: new Date(), updatedAt: new Date() }).where(
        and(eq(syncJobs.id, job.id), eq(syncJobs.status, "pending")),
      );
      try {
        const payload = job.payload ? JSON.parse(job.payload) as Record<string, unknown> : {};
        if (job.type === "supplier_catalog") {
          if (typeof payload.runId !== "number" || typeof payload.integrationId !== "number") throw new Error("Payload de importação de fornecedor incompleto");
          await SupplierImportService.processRun(userId, payload.runId, payload.integrationId);
        } else {
          await MarketplaceRateLimiter.acquire(`connection:${job.marketplaceConnectionId || "internal"}`);
        }
        if (job.type === "stock") {
          if (!job.marketplaceConnectionId || !job.productId || typeof payload.listingId !== "string" || typeof payload.stock !== "number") {
            throw new Error("Payload de atualização de estoque incompleto");
          }
          await ProductSyncService.updateStockOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.stock);
        } else if (job.type === "price") {
          if (!job.marketplaceConnectionId || typeof payload.listingId !== "string" || typeof payload.price !== "number") {
            throw new Error("Payload de atualização de preço incompleto");
          }
          await ProductSyncService.updatePriceOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.price);
        } else if (job.type === "order") {
          if (!job.marketplaceConnectionId) throw new Error("Conexão ausente para importação de pedido");
          const connection = await db.select().from(marketplaceConnections).where(eq(marketplaceConnections.id, job.marketplaceConnectionId)).limit(1);
          if (!connection.length) throw new Error("Conexão do marketplace não encontrada");
          await OrderSyncService.importOrdersFromMarketplace(userId, connection[0].marketplaceType as SupportedMarketplace);
        } else if (job.type !== "supplier_catalog") {
          throw new Error(`Tipo de job ainda não suportado pelo worker: ${job.type}`);
        }
        await db.update(syncJobs).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(syncJobs.id, job.id));
        results.push({ id: job.id, status: "completed" });
      } catch (error) {
        const attempts = (job.attempts ?? 0) + 1;
        const terminal = attempts >= MAX_ATTEMPTS;
        await db.update(syncJobs).set({
          status: terminal ? "failed" : "pending",
          attempts,
          nextRunAt: new Date(Date.now() + backoffMinutes(attempts) * 60_000),
          errorMessage: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        }).where(eq(syncJobs.id, job.id));
        results.push({ id: job.id, status: terminal ? "failed" : "retrying", error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { processed: results.length, results };
  }
}
