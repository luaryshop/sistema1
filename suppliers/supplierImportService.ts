import { and, desc, eq, ne, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { z } from "zod";
import { failedImportRecords, supplierImportItems, supplierIntegrations, supplierInventoryHistory, supplierPriceHistory, supplierProducts, supplierSyncRuns, suppliers, syncJobs } from "../../drizzle/schema";
import { getDb } from "../db";
import { decryptData } from "../services/encryption";
import { SupplierMatchingService } from "../sourcing/supplierMatchingService";
import { SupplierAdapterRegistry } from "./registry";
import { SupplierConnectionService } from "./supplierConnectionService";
import type { SupplierAdapterType, SupplierCredentials, SupplierProductRecord } from "./types";
import { SupplierService } from "./supplierService";
import { writeAudit } from "../services/auditService";

const supplierProductSchema = z.object({
  externalId: z.string().trim().min(1).max(255),
  sku: z.string().trim().max(100).optional(),
  internalCode: z.string().trim().max(100).optional(),
  ean: z.string().trim().max(50).optional(),
  gtin: z.string().trim().max(50).optional(),
  mpn: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1).max(500),
  description: z.string().max(100000).optional(),
  brand: z.string().trim().max(150).optional(),
  costCents: z.number().int().nonnegative(),
  shippingCostCents: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative(),
  weightGrams: z.number().int().nonnegative().optional(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  category: z.string().trim().max(150).optional(),
});

export function normalizeSupplierProduct(input: unknown): SupplierProductRecord {
  return supplierProductSchema.parse(input) as SupplierProductRecord;
}

function sanitizePayload(payload: string) {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const secretKeys = /password|secret|token|credential|api.?key|private.?key/i;
    return JSON.stringify(Object.fromEntries(Object.entries(parsed).filter(([key]) => !secretKeys.test(key))));
  } catch {
    return "{}";
  }
}

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");
  return db;
}

export class SupplierImportService {
  static async enqueue(userId: number, integrationId: number) {
    const db = requireDb(await getDb());
    const row = await SupplierConnectionService.getOwnedIntegration(userId, integrationId);
    if (row.integration.status !== "connected") throw new Error("A conexão precisa estar conectada antes da importação");
    const type = row.integration.type as SupplierAdapterType;
    if (!SupplierAdapterRegistry.capabilities(type).includes("CATALOG_READ")) throw new Error("Este adapter não suporta leitura de catálogo");
    const runResult = await db.insert(supplierSyncRuns).values({ userId, supplierId: row.integration.supplierId, integrationId, status: "queued", mode: "catalog", sourceType: "adapter", sourceReference: `${row.integration.type}:${integrationId}`, currentStage: "queued" });
    const runId = Number((runResult as any)[0]?.insertId ?? 0);
    if (!runId) throw new Error("Não foi possível criar o sync run");
    await db.insert(syncJobs).values({ userId, type: "supplier_catalog", idempotencyKey: `supplier-catalog:${integrationId}:${runId}`, payload: JSON.stringify({ runId, integrationId }) });
    await writeAudit({ userId, action: "IMPORT_STARTED", entity: "supplier_sync_run", entityId: runId, after: { integrationId, sourceType: "adapter", mode: "catalog" }, origin: "supplier_import" });
    return { runId, status: "queued" };
  }

  static async listRuns(userId: number, limit = 50) {
    const db = requireDb(await getDb());
    return db.select().from(supplierSyncRuns).innerJoin(suppliers, eq(supplierSyncRuns.supplierId, suppliers.id)).where(and(eq(supplierSyncRuns.userId, userId), eq(suppliers.userId, userId))).orderBy(desc(supplierSyncRuns.createdAt)).limit(Math.min(limit, 100));
  }

  static async listFailed(userId: number, runId?: number) {
    const db = requireDb(await getDb());
    return db.select().from(failedImportRecords).where(runId ? and(eq(failedImportRecords.userId, userId), eq(failedImportRecords.runId, runId)) : eq(failedImportRecords.userId, userId)).orderBy(desc(failedImportRecords.createdAt)).limit(100);
  }

  static async retryRun(userId: number, runId: number) {
    const db = requireDb(await getDb());
    const current = await db.select().from(supplierSyncRuns).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId))).limit(1);
    if (!current.length) throw new Error("Sync run não encontrado");
    if (["processing", "queued"].includes(current[0].status)) throw new Error("Este sync run já está em execução ou na fila");
    await db.update(supplierSyncRuns).set({ status: "queued", currentStage: "queued", progressPercent: 0, fileHash: null, errorMessage: null, errorSummary: null, completedAt: null, updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
    await db.insert(syncJobs).values({ userId, type: "supplier_catalog", idempotencyKey: `supplier-catalog:retry:${runId}:${Date.now()}`, payload: JSON.stringify({ runId, integrationId: current[0].integrationId }) });
    return { runId, status: "queued" };
  }

  static async processRun(userId: number, runId: number, integrationId: number) {
    const db = requireDb(await getDb());
    const run = await db.select().from(supplierSyncRuns).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId), eq(supplierSyncRuns.integrationId, integrationId))).limit(1);
    if (!run.length) throw new Error("Sync run não encontrado");
    const row = await SupplierConnectionService.getOwnedIntegration(userId, integrationId);
    await db.update(supplierSyncRuns).set({ status: "processing", startedAt: new Date(), updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
    try {
      const raw = row.integration.encryptedCredentials ? decryptData(row.integration.encryptedCredentials) : "{}";
      const credentials = JSON.parse(raw) as SupplierCredentials;
      const adapter = SupplierAdapterRegistry.create(row.integration.type as SupplierAdapterType, credentials);
      await adapter.authenticate();
      const fetched = await adapter.listProducts();
      const fileHash = createHash("sha256").update(JSON.stringify(fetched.products)).digest("hex");
      const previous = await db.select({ id: supplierSyncRuns.id }).from(supplierSyncRuns).where(and(eq(supplierSyncRuns.userId, userId), eq(supplierSyncRuns.integrationId, integrationId), eq(supplierSyncRuns.fileHash, fileHash), ne(supplierSyncRuns.id, runId), eq(supplierSyncRuns.status, "completed"))).limit(1);
      if (previous.length) {
        await db.update(supplierSyncRuns).set({ status: "completed", sourceType: "adapter", fileHash, currentStage: "skipped_unchanged", progressPercent: 100, totalRecords: fetched.products.length, processedRecords: 0, skippedRecords: fetched.products.length, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
        return { runId, status: "completed", productsRead: fetched.products.length, productsCreated: 0, productsUpdated: 0, errorsCount: 0, matchedRecords: 0, unmatchedRecords: 0, skippedRecords: fetched.products.length };
      }
      await db.update(supplierSyncRuns).set({ fileHash, sourceType: "adapter", currentStage: "fetched", totalRecords: fetched.products.length, updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
      let productsCreated = 0;
      let productsUpdated = 0;
      let errorsCount = 0;
      let matchedRecords = 0;
      let unmatchedRecords = 0;
      let processedRecords = 0;
      const errorSummary: string[] = [];
      await db.update(supplierSyncRuns).set({ totalRecords: fetched.products.length, currentStage: "validating", progressPercent: 0, updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
      for (const rawProduct of fetched.products) {
        const rawPayload = JSON.stringify(rawProduct);
        try {
          const product = normalizeSupplierProduct(rawProduct);
          await db.insert(supplierImportItems).values({ userId, runId, supplierId: row.integration.supplierId, externalId: product.externalId, rawPayload, normalizedPayload: JSON.stringify(product), validationStatus: "valid" }).onDuplicateKeyUpdate({ set: { rawPayload, normalizedPayload: JSON.stringify(product), validationStatus: "valid", errorMessage: null, updatedAt: new Date() } });
          const result = await SupplierService.upsertProduct(userId, {
            supplierId: row.integration.supplierId,
            externalId: product.externalId,
            sku: product.sku,
            internalCode: product.internalCode,
            ean: product.ean,
            gtin: product.gtin,
            mpn: product.mpn,
            name: product.name,
            description: product.description,
            brand: product.brand,
            costCents: product.costCents,
            shippingCostCents: product.shippingCostCents ?? 0,
            stock: product.stock,
            weightGrams: product.weightGrams ?? 0,
            images: JSON.stringify(product.images ?? []),
            videos: JSON.stringify(product.videos ?? []),
            attributes: JSON.stringify(product.attributes ?? {}),
            category: product.category,
            status: "active",
            lastSyncedAt: new Date(),
          });
          if (result.created) productsCreated++; else productsUpdated++;
          const current = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(and(eq(supplierProducts.userId, userId), eq(supplierProducts.supplierId, row.integration.supplierId), eq(supplierProducts.externalId, product.externalId))).limit(1);
          if (current.length) {
            const [lastPrice, lastStock] = await Promise.all([
              db.select({ costCents: supplierPriceHistory.costCents, shippingCostCents: supplierPriceHistory.shippingCostCents }).from(supplierPriceHistory).where(and(eq(supplierPriceHistory.userId, userId), eq(supplierPriceHistory.supplierProductId, current[0].id))).orderBy(desc(supplierPriceHistory.recordedAt)).limit(1),
              db.select({ stock: supplierInventoryHistory.stock }).from(supplierInventoryHistory).where(and(eq(supplierInventoryHistory.userId, userId), eq(supplierInventoryHistory.supplierProductId, current[0].id))).orderBy(desc(supplierInventoryHistory.recordedAt)).limit(1),
            ]);
            if (!lastPrice.length || lastPrice[0].costCents !== product.costCents || lastPrice[0].shippingCostCents !== (product.shippingCostCents ?? 0)) await db.insert(supplierPriceHistory).values({ userId, supplierProductId: current[0].id, previousCostCents: lastPrice[0]?.costCents ?? null, costCents: product.costCents, shippingCostCents: product.shippingCostCents ?? 0, source: "supplier_import", importId: runId });
            if (!lastStock.length || lastStock[0].stock !== product.stock) await db.insert(supplierInventoryHistory).values({ userId, supplierProductId: current[0].id, previousStock: lastStock[0]?.stock ?? null, stock: product.stock, difference: lastStock.length ? product.stock - lastStock[0].stock : null, source: "supplier_import", importId: runId });
            const match = await SupplierMatchingService.analyze(userId, current[0].id);
            if (match.productId) matchedRecords++; else unmatchedRecords++;
          }
          processedRecords++;
          await db.update(supplierSyncRuns).set({ processedRecords, successRecords: processedRecords - errorsCount, matchedRecords, unmatchedRecords, productsRead: fetched.products.length, productsCreated, productsUpdated, errorsCount, currentStage: "processing", progressPercent: fetched.products.length ? Math.floor((processedRecords / fetched.products.length) * 100) : 100, updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
        } catch (error) {
          errorsCount++;
          processedRecords++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorSummary.length < 20) errorSummary.push(errorMessage);
          const recordReference = typeof rawProduct.externalId === "string" ? rawProduct.externalId : `invalid-${errorsCount}`;
          await db.insert(supplierImportItems).values({ userId, runId, supplierId: row.integration.supplierId, externalId: recordReference, rawPayload, validationStatus: "invalid", errorCode: "VALIDATION_OR_UPSERT_ERROR", attempts: 1, errorMessage }).onDuplicateKeyUpdate({ set: { rawPayload, validationStatus: "invalid", errorCode: "VALIDATION_OR_UPSERT_ERROR", attempts: sql`${supplierImportItems.attempts} + 1`, errorMessage, updatedAt: new Date() } });
          await db.insert(failedImportRecords).values({ userId, runId, supplierId: row.integration.supplierId, recordReference, payloadSanitized: sanitizePayload(rawPayload), errorCode: "VALIDATION_OR_UPSERT_ERROR", errorMessage, attempts: 1, status: "open" });
          await db.update(supplierSyncRuns).set({ processedRecords, successRecords: processedRecords - errorsCount, errorsCount, errorSummary: JSON.stringify(errorSummary), currentStage: "processing", progressPercent: fetched.products.length ? Math.floor((processedRecords / fetched.products.length) * 100) : 100, updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
        }
      }
      const finalStatus = errorsCount ? "completed_with_errors" : "completed";
      await db.update(supplierSyncRuns).set({ status: finalStatus, currentStage: "completed", progressPercent: 100, productsRead: fetched.products.length, productsCreated, productsUpdated, errorsCount, matchedRecords, unmatchedRecords, processedRecords, successRecords: processedRecords - errorsCount, errorSummary: errorSummary.length ? JSON.stringify(errorSummary) : null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
      await db.update(supplierIntegrations).set({ lastSyncAt: new Date(), lastError: errorsCount ? `${errorsCount} item(ns) inválido(s)` : null, updatedAt: new Date() }).where(and(eq(supplierIntegrations.id, integrationId), eq(supplierIntegrations.userId, userId)));
      await writeAudit({ userId, action: "IMPORT_COMPLETED", entity: "supplier_sync_run", entityId: runId, after: { status: finalStatus, productsRead: fetched.products.length, productsCreated, productsUpdated, errorsCount, matchedRecords, unmatchedRecords }, origin: "supplier_import", result: errorsCount ? "partial" : "success" });
      return { runId, status: finalStatus, productsRead: fetched.products.length, productsCreated, productsUpdated, errorsCount, matchedRecords, unmatchedRecords, skippedRecords: 0, fileHash };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.update(supplierSyncRuns).set({ status: "failed", errorMessage: message, currentStage: "failed", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(supplierSyncRuns.id, runId), eq(supplierSyncRuns.userId, userId)));
      await writeAudit({ userId, action: "IMPORT_FAILED", entity: "supplier_sync_run", entityId: runId, after: { error: message.slice(0, 500) }, origin: "supplier_import", result: "error" });
      throw error;
    }
  }
}
