import { and, eq, sql } from "drizzle-orm";
import { inventoryMovements, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { writeAudit } from "./auditService";

export type MovementType = "in" | "out" | "sale" | "cancel" | "return" | "adjustment" | "transfer";

export class InventoryMovementService {
  static async apply(input: { userId: number; productId: number; variantId?: number; orderId?: number; type: MovementType; quantity: number; reason?: string; reference?: string; allowNegative?: boolean }) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantidade de movimentação inválida");
    const db = await getDb(); if (!db) throw new Error("Database not available");
    const delta = ["in", "cancel", "return"].includes(input.type) ? input.quantity : -input.quantity;
    let currentStock = 0;
    if (input.variantId) {
      const rows = await db.select({ id: productVariants.id, stock: productVariants.stock, productId: productVariants.productId }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(productVariants.userId, input.userId))).limit(1);
      if (!rows.length) throw new Error("Variante não encontrada"); currentStock = rows[0].stock;
      if (!input.allowNegative && currentStock + delta < 0) throw new Error("Movimentação resultaria em estoque negativo");
      await db.update(productVariants).set({ stock: sql`${productVariants.stock} + ${delta}`, updatedAt: new Date() }).where(and(eq(productVariants.id, input.variantId), eq(productVariants.userId, input.userId)));
    } else {
      const rows = await db.select({ id: products.id, stock: products.stock }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, input.userId))).limit(1);
      if (!rows.length) throw new Error("Produto não encontrado"); currentStock = Number(rows[0].stock ?? 0);
      if (!input.allowNegative && currentStock + delta < 0) throw new Error("Movimentação resultaria em estoque negativo");
      await db.update(products).set({ stock: sql`${products.stock} + ${delta}`, updatedAt: new Date() }).where(and(eq(products.id, input.productId), eq(products.userId, input.userId)));
    }
    const result = await db.insert(inventoryMovements).values({ userId: input.userId, productId: input.productId, variantId: input.variantId, orderId: input.orderId, type: input.type, quantity: input.quantity, reason: input.reason, reference: input.reference });
    await writeAudit({ userId: input.userId, action: "inventory_movement", entity: input.variantId ? "product_variant" : "product", entityId: input.variantId || input.productId, before: { stock: currentStock }, after: { stock: currentStock + delta, type: input.type, quantity: input.quantity }, origin: "inventory" });
    return { id: Number((result as any)[0]?.insertId ?? 0), previousStock: currentStock, newStock: currentStock + delta };
  }
}
