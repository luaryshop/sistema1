import { and, asc, eq, inArray } from "drizzle-orm";
import { fulfillmentGroupItems, fulfillmentGroups, orderItems, orders, purchaseOrderItems, purchaseOrders, returnRequests, supplierProductMappings, supplierProducts, suppliers, supplyRoutingPolicies } from "../../drizzle/schema";
import { getDb } from "../db";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");
  return db;
}

export class SupplierFulfillmentService {
  static async prepareForOrder(userId: number, orderId: number) {
    const db = requireDb(await getDb());
    const order = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
    if (!order.length) throw new Error("Pedido não encontrado");
    const existing = await db.select({ id: fulfillmentGroups.id, supplierId: fulfillmentGroups.supplierId, status: fulfillmentGroups.status }).from(fulfillmentGroups).where(and(eq(fulfillmentGroups.orderId, orderId), eq(fulfillmentGroups.userId, userId), inArray(fulfillmentGroups.status, ["pending", "awaiting_approval", "approved", "submitted"]))).limit(1);
    if (existing.length) return { orderId, status: "already_prepared", fulfillmentGroups: existing };
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const grouped = new Map<number, Array<{ itemId: number; supplierProductId: number; productId: number; quantity: number; unitCostCents: number; sku: string | null }>>();
    for (const item of items) {
      if (!item.productId) continue;
      const policies = await db.select().from(supplyRoutingPolicies).where(and(eq(supplyRoutingPolicies.userId, userId), eq(supplyRoutingPolicies.productId, item.productId), eq(supplyRoutingPolicies.isActive, 1), eq(supplyRoutingPolicies.autoFulfillmentAllowed, 1))).orderBy(asc(supplyRoutingPolicies.priority));
      for (const policy of policies) {
        if (policy.fulfillmentMode === "own_stock") continue;
        const rows = await db.select({ mapping: supplierProductMappings, product: supplierProducts, supplierStatus: suppliers.status }).from(supplierProductMappings).innerJoin(supplierProducts, eq(supplierProducts.id, supplierProductMappings.supplierProductId)).innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId)).where(and(eq(supplierProductMappings.userId, userId), eq(supplierProductMappings.productId, item.productId), eq(supplierProductMappings.status, "approved"), eq(supplierProducts.supplierId, policy.supplierId), eq(supplierProducts.userId, userId), eq(suppliers.status, "active"))).limit(1);
        const candidate = rows[0];
        if (!candidate) continue;
        const ageMinutes = candidate.product.lastSyncedAt ? (Date.now() - new Date(candidate.product.lastSyncedAt).getTime()) / 60000 : Number.POSITIVE_INFINITY;
        const quantity = item.quantity ?? 0;
        if (quantity <= 0 || ageMinutes > policy.staleAfterMinutes || candidate.product.stock < quantity + policy.supplierStockBuffer) continue;
        const bucket = grouped.get(policy.supplierId) ?? [];
        bucket.push({ itemId: item.id, supplierProductId: candidate.product.id, productId: item.productId, quantity, unitCostCents: candidate.product.costCents, sku: item.title });
        grouped.set(policy.supplierId, bucket);
        break;
      }
    }
    const created: Array<{ purchaseOrderId: number; fulfillmentGroupId: number; supplierId: number; itemCount: number }> = [];
    for (const [supplierId, supplierItems] of Array.from(grouped.entries())) {
      const subtotalCents = supplierItems.reduce((sum, item) => sum + item.quantity * item.unitCostCents, 0);
      const poResult = await db.insert(purchaseOrders).values({ userId, supplierId, orderId, status: "awaiting_approval", subtotalCents, shippingCents: 0, totalCents: subtotalCents, fiscalMode: "not_defined" });
      const purchaseOrderId = Number((poResult as any)[0]?.insertId ?? 0);
      if (!purchaseOrderId) throw new Error("Não foi possível criar Purchase Order");
      await db.insert(purchaseOrderItems).values(supplierItems.map((item) => ({ purchaseOrderId, supplierProductId: item.supplierProductId, productId: item.productId, sku: item.sku, quantity: item.quantity, unitCostCents: item.unitCostCents, totalCostCents: item.quantity * item.unitCostCents })));
      const fulfillmentResult = await db.insert(fulfillmentGroups).values({ userId, orderId, supplierId, mode: "supplier_fulfillment", status: "awaiting_approval" });
      const fulfillmentGroupId = Number((fulfillmentResult as any)[0]?.insertId ?? 0);
      if (!fulfillmentGroupId) throw new Error("Não foi possível criar grupo de fulfillment");
      await db.insert(fulfillmentGroupItems).values(supplierItems.map((item) => ({ fulfillmentGroupId, orderItemId: item.itemId, quantity: item.quantity })));
      created.push({ purchaseOrderId, fulfillmentGroupId, supplierId, itemCount: supplierItems.length });
    }
    return { orderId, status: created.length ? "awaiting_approval" : "own_stock_or_no_eligible_supplier", created };
  }

  static async updateFulfillment(userId: number, fulfillmentGroupId: number, input: { status: "awaiting_approval" | "approved" | "submitted" | "shipped" | "delivered" | "cancelled"; trackingCode?: string; carrier?: string }) {
    const db = requireDb(await getDb());
    const current = await db.select().from(fulfillmentGroups).where(and(eq(fulfillmentGroups.id, fulfillmentGroupId), eq(fulfillmentGroups.userId, userId))).limit(1);
    if (!current.length) throw new Error("Grupo de fulfillment não encontrado");
    const allowed: Record<string, string[]> = { awaiting_approval: ["approved", "cancelled"], approved: ["submitted", "cancelled"], submitted: ["shipped", "cancelled"], shipped: ["delivered"], delivered: [], cancelled: [] };
    if (!allowed[current[0].status]?.includes(input.status)) throw new Error(`Transição inválida: ${current[0].status} → ${input.status}`);
    const now = new Date();
    await db.update(fulfillmentGroups).set({ status: input.status, ...(input.trackingCode !== undefined ? { trackingCode: input.trackingCode } : {}), ...(input.carrier !== undefined ? { carrier: input.carrier } : {}), ...(input.status === "shipped" ? { shippedAt: now } : {}), ...(input.status === "delivered" ? { deliveredAt: now } : {}), updatedAt: now }).where(and(eq(fulfillmentGroups.id, fulfillmentGroupId), eq(fulfillmentGroups.userId, userId)));
    return { success: true, fulfillmentGroupId, status: input.status };
  }

  static async createReturnRequest(userId: number, input: { orderId: number; supplierId?: number; reason: string; refundAmountCents?: number }) {
    const db = requireDb(await getDb());
    const order = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.userId, userId))).limit(1);
    if (!order.length) throw new Error("Pedido não encontrado");
    const result = await db.insert(returnRequests).values({ userId, orderId: input.orderId, supplierId: input.supplierId, reason: input.reason.trim(), refundAmountCents: input.refundAmountCents ?? 0, status: "requested" });
    return { id: Number((result as any)[0]?.insertId ?? 0), status: "requested" };
  }
}
