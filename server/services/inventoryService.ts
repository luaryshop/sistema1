import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { inventoryReservations, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";

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

  static async reserve(input: { userId: number; productId: number; variantId?: number; orderId?: number; quantity: number; expiresAt?: Date }) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantidade de reserva inválida");
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const available = await this.available(input.userId, input.productId, input.variantId);
    if (available.available < input.quantity) throw new Error(`Estoque insuficiente: disponível ${available.available}`);
    const result = await db.insert(inventoryReservations).values({ ...input, status: "reserved" });
    if (input.variantId) await db.update(productVariants).set({ reservedStock: sql`${productVariants.reservedStock} + ${input.quantity}` }).where(and(eq(productVariants.id, input.variantId), eq(productVariants.userId, input.userId)));
    return { id: Number((result as any)[0]?.insertId ?? 0), availableAfter: available.available - input.quantity };
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
    if (reservation.variantId && (status === "released" || status === "expired")) await db.update(productVariants).set({ reservedStock: sql`greatest(0, ${productVariants.reservedStock} - ${reservation.quantity})` }).where(and(eq(productVariants.id, reservation.variantId), eq(productVariants.userId, userId)));
    return { success: true, status };
  }
}
