import { and, desc, eq } from "drizzle-orm";
import { supplierIntegrations, supplierProducts, suppliers, type InsertSupplier, type InsertSupplierProduct } from "../../drizzle/schema";
import { getDb } from "../db";
import { encryptData } from "../services/encryption";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");
  return db;
}

export class SupplierService {
  static async list(userId: number) {
    const db = requireDb(await getDb());
    return db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(desc(suppliers.updatedAt));
  }

  static async create(userId: number, input: Omit<InsertSupplier, "userId">) {
    const db = requireDb(await getDb());
    const result = await db.insert(suppliers).values({ ...input, userId });
    return Number((result as any)[0]?.insertId ?? 0);
  }

  static async updateStatus(userId: number, supplierId: number, status: string) {
    const db = requireDb(await getDb());
    const result = await db.update(suppliers).set({ status, updatedAt: new Date() }).where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)));
    if (!(result as any)[0]?.affectedRows) throw new Error("Fornecedor não encontrado");
    return { success: true };
  }

  static async saveIntegration(userId: number, input: { supplierId: number; type: string; credentials?: Record<string, unknown> }) {
    const db = requireDb(await getDb());
    const supplier = await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, input.supplierId), eq(suppliers.userId, userId))).limit(1);
    if (!supplier.length) throw new Error("Fornecedor não encontrado");
    const encryptedCredentials = input.credentials ? encryptData(JSON.stringify(input.credentials)) : undefined;
    const existing = await db.select({ id: supplierIntegrations.id }).from(supplierIntegrations).where(and(eq(supplierIntegrations.supplierId, input.supplierId), eq(supplierIntegrations.userId, userId), eq(supplierIntegrations.type, input.type))).limit(1);
    if (existing.length) {
      await db.update(supplierIntegrations).set({ status: "pending", ...(encryptedCredentials ? { encryptedCredentials } : {}), updatedAt: new Date() }).where(and(eq(supplierIntegrations.id, existing[0].id), eq(supplierIntegrations.userId, userId)));
      return existing[0].id;
    }
    const result = await db.insert(supplierIntegrations).values({ userId, supplierId: input.supplierId, type: input.type, status: "pending", encryptedCredentials });
    return Number((result as any)[0]?.insertId ?? 0);
  }

  static async listProducts(userId: number, supplierId?: number) {
    const db = requireDb(await getDb());
    return db.select().from(supplierProducts).where(supplierId ? and(eq(supplierProducts.userId, userId), eq(supplierProducts.supplierId, supplierId)) : eq(supplierProducts.userId, userId)).orderBy(desc(supplierProducts.updatedAt));
  }

  static async upsertProduct(userId: number, input: Omit<InsertSupplierProduct, "userId">) {
    const db = requireDb(await getDb());
    const supplier = await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, input.supplierId), eq(suppliers.userId, userId))).limit(1);
    if (!supplier.length) throw new Error("Fornecedor não encontrado");
    const existing = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(and(eq(supplierProducts.userId, userId), eq(supplierProducts.supplierId, input.supplierId), eq(supplierProducts.externalId, input.externalId))).limit(1);
    if (existing.length) {
      await db.update(supplierProducts).set({ ...input, updatedAt: new Date() }).where(and(eq(supplierProducts.id, existing[0].id), eq(supplierProducts.userId, userId)));
      return { id: existing[0].id, created: false };
    }
    const result = await db.insert(supplierProducts).values({ ...input, userId });
    return { id: Number((result as any)[0]?.insertId ?? 0), created: true };
  }
}
