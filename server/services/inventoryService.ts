import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { inventoryReservations, productVariants, products, supplierProductMappings, supplierProducts, suppliers, supplyRoutingPolicies } from "../../drizzle/schema";
import { getDb } from "../db";

export type AtsSupplierSource = { supplierId: number; supplierProductId: number; mode: string; available: number; stale: boolean; blocked: boolean; reason?: string };

export function calculateAvailableToSell(ownAvailable: number, sources: AtsSupplierSource[]) {
  const eligibleSources = sources.filter((source) => !source.stale && !source.blocked && source.available > 0);
  return { available: Math.max(0, ownAvailable) + eligibleSources.reduce((total, source) => total + source.available, 0), eligibleSources };
}

export class InventoryService {
  static async available(userId: number, productId: number, variantId?: number) {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const reserved = await db.select({ total: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(and(
      eq(inventoryReservations.userId, userId), eq(inventoryReservations.productId, productId),
      variantId ? eq(inventoryReservations.variantId, variantId) : sql`${inventoryReservations.variantId} is null`,
      inArray(inventoryReservations.status, ["reserved", "confirmed"]),
    ));
    if (variantId) {
      const variant = await db.select({ stock: productVariants.stock }).from(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.userId, userId), eq(productVariants.productId, productId))).limit(1);
      if (!variant.length) throw new Error("Variante não encontrada");
      return { stock: variant[0].stock, reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, variant[0].stock - Number(reserved[0]?.total ?? 0)) };
    }
    const product = await db.select({ stock: products.stock }).from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1);
    if (!product.length) throw new Error("Produto não encontrado");
    return { stock: Number(product[0].stock ?? 0), reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, Number(product[0].stock ?? 0) - Number(reserved[0]?.total ?? 0)) };
  }

  static async availableToSell(userId: number, productId: number, variantId?: number) {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const own = await this.available(userId, productId, variantId);
    const policies = await db.select().from(supplyRoutingPolicies).where(and(eq(supplyRoutingPolicies.userId, userId), eq(supplyRoutingPolicies.productId, productId), eq(supplyRoutingPolicies.isActive, 1))).orderBy(supplyRoutingPolicies.priority);
    let supplierAvailable = 0;
    const sources: AtsSupplierSource[] = [];
    for (const policy of policies) {
      if (policy.fulfillmentMode === "own_stock") continue;
      const mappings = await db.select({ supplierProductId: supplierProductMappings.supplierProductId }).from(supplierProductMappings).where(and(eq(supplierProductMappings.userId, userId), eq(supplierProductMappings.productId, productId), variantId ? eq(supplierProductMappings.variantId, variantId) : sql`${supplierProductMappings.variantId} is null`, eq(supplierProductMappings.status, "approved"))).limit(20);
      for (const mapping of mappings) {
        const rows = await db.select({ product: supplierProducts, supplierStatus: suppliers.status }).from(supplierProducts).innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId)).where(and(eq(supplierProducts.id, mapping.supplierProductId), eq(supplierProducts.userId, userId), eq(supplierProducts.supplierId, policy.supplierId))).limit(1);
        if (!rows.length) continue;
        const product = rows[0].product;
        const reservedRows = await db.select({ total: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(and(eq(inventoryReservations.userId, userId), eq(inventoryReservations.supplierProductId, product.id), inArray(inventoryReservations.status, ["reserved", "confirmed"])));
        const reserved = Number(reservedRows[0]?.total ?? 0);
        const ageMinutes = product.lastSyncedAt ? (Date.now() - new Date(product.lastSyncedAt).getTime()) / 60000 : Number.POSITIVE_INFINITY;
        const stale = ageMinutes > policy.staleAfterMinutes;
        const blocked = rows[0].supplierStatus !== "active" || ageMinutes > policy.blockAfterStaleMinutes;
        const available = blocked || stale ? 0 : Math.max(0, product.stock - policy.supplierStockBuffer - reserved);
        sources.push({ supplierId: policy.supplierId, supplierProductId: product.id, mode: policy.fulfillmentMode, available, stale, blocked, reason: blocked ? "fornecedor bloqueado ou estoque excessivamente desatualizado" : stale ? "estoque desatualizado" : undefined });
        supplierAvailable += available;
      }
    }
    const ats = calculateAvailableToSell(own.available, sources);
    return { ownStock: own.stock, ownReserved: own.reserved, supplierAvailable, available: ats.available, sources: ats.eligibleSources, blockedSources: sources.filter((source) => !ats.eligibleSources.includes(source)) };
  }

  static async reserve(input: { userId: number; productId: number; variantId?: number; supplierProductId?: number; sourceType?: "own_stock" | "supplier"; orderId?: number; quantity: number; expiresAt?: Date }) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantidade de reserva inválida");
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const sourceType = input.sourceType ?? (input.supplierProductId ? "supplier" : "own_stock");
    if (sourceType === "supplier") {
      if (!input.supplierProductId) throw new Error("Produto do fornecedor obrigatório para reserva de supplier");
      const mapping = await db.select({ supplierProductId: supplierProductMappings.supplierProductId }).from(supplierProductMappings).where(and(eq(supplierProductMappings.userId, input.userId), eq(supplierProductMappings.productId, input.productId), eq(supplierProductMappings.supplierProductId, input.supplierProductId), input.variantId ? eq(supplierProductMappings.variantId, input.variantId) : sql`${supplierProductMappings.variantId} is null`, eq(supplierProductMappings.status, "approved"))).limit(1);
      if (!mapping.length) throw new Error("Produto do fornecedor não possui mapping aprovado para reserva");
      const ats = await this.availableToSell(input.userId, input.productId, input.variantId);
      const source = ats.sources.find((candidate) => candidate.supplierProductId === input.supplierProductId);
      if (!source || source.available < input.quantity) throw new Error(`Estoque do fornecedor insuficiente: disponível ${source?.available ?? 0}`);
    } else {
      const available = await this.available(input.userId, input.productId, input.variantId);
      if (available.available < input.quantity) throw new Error(`Estoque insuficiente: disponível ${available.available}`);
    }
    const result = await db.insert(inventoryReservations).values({ userId: input.userId, productId: input.productId, variantId: input.variantId, supplierProductId: sourceType === "supplier" ? input.supplierProductId : null, sourceType, orderId: input.orderId, quantity: input.quantity, expiresAt: input.expiresAt, status: "reserved" });
    if (sourceType === "own_stock" && input.variantId) await db.update(productVariants).set({ reservedStock: sql`${productVariants.reservedStock} + ${input.quantity}` }).where(and(eq(productVariants.id, input.variantId), eq(productVariants.userId, input.userId)));
    return { id: Number((result as any)[0]?.insertId ?? 0), sourceType };
  }

  static async releaseExpired(userId: number) {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const expired = await db.select({ id: inventoryReservations.id }).from(inventoryReservations).where(and(eq(inventoryReservations.userId, userId), eq(inventoryReservations.status, "reserved"), lt(inventoryReservations.expiresAt, new Date())));
    for (const reservation of expired) await this.changeStatus(userId, reservation.id, "expired");
    return { released: expired.length };
  }

  static async changeStatus(userId: number, reservationId: number, status: "confirmed" | "released" | "expired") {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const rows = await db.select().from(inventoryReservations).where(and(eq(inventoryReservations.id, reservationId), eq(inventoryReservations.userId, userId), eq(inventoryReservations.status, "reserved"))).limit(1);
    if (!rows.length) throw new Error("Reserva não encontrada ou já processada");
    const reservation = rows[0];
    await db.update(inventoryReservations).set({ status, releasedAt: status === "released" || status === "expired" ? new Date() : null, updatedAt: new Date() }).where(eq(inventoryReservations.id, reservationId));
    if (reservation.sourceType === "own_stock" && reservation.variantId && (status === "released" || status === "expired")) await db.update(productVariants).set({ reservedStock: sql`greatest(0, ${productVariants.reservedStock} - ${reservation.quantity})` }).where(and(eq(productVariants.id, reservation.variantId), eq(productVariants.userId, userId)));
    return { success: true, status };
  }
}
