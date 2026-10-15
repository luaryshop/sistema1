import { and, eq } from "drizzle-orm";
import { supplierIntegrations, suppliers } from "../../drizzle/schema";
import { getDb } from "../db";
import { decryptData } from "../services/encryption";
import { SupplierAdapterRegistry } from "./registry";
import type { SupplierAdapterType, SupplierCredentials } from "./types";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");
  return db;
}

export type SafeSupplierIntegration = {
  id: number;
  supplierId: number;
  type: string;
  status: string;
  lastSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toSafeSupplierIntegration(integration: SafeSupplierIntegration): SafeSupplierIntegration {
  return {
    id: integration.id,
    supplierId: integration.supplierId,
    type: integration.type,
    status: integration.status,
    lastSyncAt: integration.lastSyncAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

export class SupplierConnectionService {
  static async getOwnedIntegration(userId: number, integrationId: number) {
    const db = requireDb(await getDb());
    const rows = await db.select({ integration: supplierIntegrations, supplierName: suppliers.name }).from(supplierIntegrations).innerJoin(suppliers, eq(supplierIntegrations.supplierId, suppliers.id)).where(and(eq(supplierIntegrations.id, integrationId), eq(supplierIntegrations.userId, userId), eq(suppliers.userId, userId))).limit(1);
    if (!rows.length) throw new Error("Integração não encontrada");
    return rows[0];
  }

  static async list(userId: number) {
    const db = requireDb(await getDb());
    const rows = await db.select({
      integration: {
        id: supplierIntegrations.id,
        supplierId: supplierIntegrations.supplierId,
        type: supplierIntegrations.type,
        status: supplierIntegrations.status,
        lastSyncAt: supplierIntegrations.lastSyncAt,
        lastError: supplierIntegrations.lastError,
        createdAt: supplierIntegrations.createdAt,
        updatedAt: supplierIntegrations.updatedAt,
      },
      supplierName: suppliers.name,
    }).from(supplierIntegrations).innerJoin(suppliers, eq(supplierIntegrations.supplierId, suppliers.id)).where(and(eq(supplierIntegrations.userId, userId), eq(suppliers.userId, userId)));
    return rows.map((row) => ({ integration: toSafeSupplierIntegration(row.integration), supplierName: row.supplierName, capabilities: SupplierAdapterRegistry.capabilities(row.integration.type as SupplierAdapterType) }));
  }

  static async testConnection(userId: number, integrationId: number) {
    const db = requireDb(await getDb());
    const row = await this.getOwnedIntegration(userId, integrationId);
    await db.update(supplierIntegrations).set({ status: "testing", lastError: null, updatedAt: new Date() }).where(and(eq(supplierIntegrations.id, integrationId), eq(supplierIntegrations.userId, userId)));
    try {
      const raw = row.integration.encryptedCredentials ? decryptData(row.integration.encryptedCredentials) : "{}";
      const credentials = JSON.parse(raw) as SupplierCredentials;
      const adapter = SupplierAdapterRegistry.create(row.integration.type as SupplierAdapterType, credentials);
      await adapter.authenticate();
      const result = await adapter.testConnection();
      await db.update(supplierIntegrations).set({ status: result.ok ? "connected" : "error", lastError: result.ok ? null : result.message ?? "Teste de conexão rejeitado", updatedAt: new Date() }).where(and(eq(supplierIntegrations.id, integrationId), eq(supplierIntegrations.userId, userId)));
      return { ...result, integrationId, supplierName: row.supplierName, capabilities: adapter.capabilities };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida no teste de conexão";
      await db.update(supplierIntegrations).set({ status: "error", lastError: message, updatedAt: new Date() }).where(and(eq(supplierIntegrations.id, integrationId), eq(supplierIntegrations.userId, userId)));
      return { ok: false, integrationId, supplierName: row.supplierName, message, capabilities: [] as string[] };
    }
  }
}
