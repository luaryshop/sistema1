import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { productVariants, products, supplierInventoryHistory, supplierPriceHistory, supplierProductMappings, supplierProducts, suppliers, supplyAlerts, supplierSyncRuns, supplyRoutingPolicies } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { SupplierService } from "../suppliers/supplierService";
import { calculateLandedCost, calculateMargin, calculateMinimumSalePrice, calculateOpportunityScore, calculateSupplyScore, routeSupply } from "../supply/engines";
import { SupplierMatchingService } from "../sourcing/supplierMatchingService";
import { assertVariantOwnership } from "../supply/securityPolicy";
import { SupplierConnectionService } from "../suppliers/supplierConnectionService";
import { SupplierImportService } from "../suppliers/supplierImportService";
import { SupplierFulfillmentService } from "../supply/supplierFulfillmentService";
import { AffiliateService } from "../services/affiliateService";

const supplierStatus = z.enum(["active", "inactive", "blocked", "pending_review"]);
const fulfillmentMode = z.enum(["own_stock", "dropshipping", "cross_docking", "pre_order", "supplier_fulfillment", "hybrid"]);

function dbOrThrow(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db;
}

export const supplyRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = dbOrThrow(await getDb());
    const [supplierRows, productRows, blockedSupplierRows, policyRows, openAlertRows, runningImportRows] = await Promise.all([
      db.select().from(suppliers).where(eq(suppliers.userId, ctx.user.id)),
      db.select().from(supplierProducts).where(eq(supplierProducts.userId, ctx.user.id)),
      db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.userId, ctx.user.id), eq(suppliers.status, "blocked"))),
      db.select().from(supplyRoutingPolicies).where(eq(supplyRoutingPolicies.userId, ctx.user.id)),
      db.select({ id: supplyAlerts.id }).from(supplyAlerts).where(and(eq(supplyAlerts.userId, ctx.user.id), eq(supplyAlerts.status, "open"))),
      db.select({ id: supplierSyncRuns.id }).from(supplierSyncRuns).where(and(eq(supplierSyncRuns.userId, ctx.user.id), inArray(supplierSyncRuns.status, ["queued", "processing"]))),
    ]);
    const activeProducts = productRows.filter((row) => row.status === "active");
    return { suppliers: supplierRows.length, products: productRows.length, activeProducts: activeProducts.length, dropshipping: policyRows.filter((row) => row.fulfillmentMode === "dropshipping").length, hybrid: policyRows.filter((row) => row.fulfillmentMode === "hybrid").length, blockedSuppliers: blockedSupplierRows.length, openAlerts: openAlertRows.length, runningImports: runningImportRows.length };
  }),

  suppliers: router({
    list: protectedProcedure.query(({ ctx }) => SupplierService.list(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(255), legalName: z.string().max(255).optional(), document: z.string().max(50).optional(), email: z.string().email().optional(), phone: z.string().max(50).optional(), website: z.string().url().optional(), defaultShippingDays: z.number().int().nonnegative().default(0), returnPolicy: z.string().optional(), dropshippingEnabled: z.boolean().default(false), crossDockingEnabled: z.boolean().default(false), integrationType: z.string().max(30).default("manual") })).mutation(({ ctx, input }) => SupplierService.create(ctx.user.id, { ...input, dropshippingEnabled: input.dropshippingEnabled ? 1 : 0, crossDockingEnabled: input.crossDockingEnabled ? 1 : 0, apiEnabled: 0, feedEnabled: 0, status: "pending_review", rating: 0 })),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: supplierStatus })).mutation(({ ctx, input }) => SupplierService.updateStatus(ctx.user.id, input.id, input.status)),
    saveIntegration: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), type: z.enum(["api", "csv", "xlsx", "xml", "json", "manual", "erp", "ftp", "sftp"]), credentials: z.record(z.string(), z.unknown()).optional() })).mutation(({ ctx, input }) => SupplierService.saveIntegration(ctx.user.id, input)),
    connections: router({
      list: protectedProcedure.query(({ ctx }) => SupplierConnectionService.list(ctx.user.id)),
      test: protectedProcedure.input(z.object({ integrationId: z.number().int().positive() })).mutation(({ ctx, input }) => SupplierConnectionService.testConnection(ctx.user.id, input.integrationId)),
      imports: router({
        listRuns: protectedProcedure.input(z.object({ limit: z.number().int().positive().max(100).default(50) }).default({ limit: 50 })).query(({ ctx, input }) => SupplierImportService.listRuns(ctx.user.id, input.limit)),
        listFailed: protectedProcedure.input(z.object({ runId: z.number().int().positive().optional() }).default({})).query(({ ctx, input }) => SupplierImportService.listFailed(ctx.user.id, input.runId)),
        enqueue: protectedProcedure.input(z.object({ integrationId: z.number().int().positive() })).mutation(({ ctx, input }) => SupplierImportService.enqueue(ctx.user.id, input.integrationId)),
        retry: protectedProcedure.input(z.object({ runId: z.number().int().positive() })).mutation(({ ctx, input }) => SupplierImportService.retryRun(ctx.user.id, input.runId)),
      }),
    }),
  }),

  alerts: router({
    list: protectedProcedure.input(z.object({ status: z.enum(["open", "resolved", "dismissed"]).optional() }).default({})).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      return db.select().from(supplyAlerts).where(input.status ? and(eq(supplyAlerts.userId, ctx.user.id), eq(supplyAlerts.status, input.status)) : eq(supplyAlerts.userId, ctx.user.id)).orderBy(desc(supplyAlerts.createdAt)).limit(200);
    }),
    resolve: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const result = await db.update(supplyAlerts).set({ status: "resolved", resolvedAt: new Date() }).where(and(eq(supplyAlerts.id, input.id), eq(supplyAlerts.userId, ctx.user.id), eq(supplyAlerts.status, "open")));
      return { success: Number((result as any)[0]?.affectedRows ?? 0) > 0 };
    }),
  }),

  history: router({
    price: protectedProcedure.input(z.object({ supplierProductId: z.number().int().positive(), limit: z.number().int().positive().max(200).default(100) })).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const product = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(and(eq(supplierProducts.id, input.supplierProductId), eq(supplierProducts.userId, ctx.user.id))).limit(1);
      if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto do fornecedor não encontrado" });
      return db.select().from(supplierPriceHistory).where(and(eq(supplierPriceHistory.userId, ctx.user.id), eq(supplierPriceHistory.supplierProductId, input.supplierProductId))).orderBy(desc(supplierPriceHistory.recordedAt)).limit(input.limit);
    }),
    stock: protectedProcedure.input(z.object({ supplierProductId: z.number().int().positive(), limit: z.number().int().positive().max(200).default(100) })).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const product = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(and(eq(supplierProducts.id, input.supplierProductId), eq(supplierProducts.userId, ctx.user.id))).limit(1);
      if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto do fornecedor não encontrado" });
      return db.select().from(supplierInventoryHistory).where(and(eq(supplierInventoryHistory.userId, ctx.user.id), eq(supplierInventoryHistory.supplierProductId, input.supplierProductId))).orderBy(desc(supplierInventoryHistory.recordedAt)).limit(input.limit);
    }),
  }),

  catalog: router({
    list: protectedProcedure.input(z.object({ supplierId: z.number().int().positive().optional() }).default({})).query(({ ctx, input }) => SupplierService.listProducts(ctx.user.id, input.supplierId)),
    upsert: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), externalId: z.string().min(1).max(255), sku: z.string().max(100).optional(), internalCode: z.string().max(100).optional(), ean: z.string().max(50).optional(), gtin: z.string().max(50).optional(), mpn: z.string().max(100).optional(), name: z.string().min(1).max(500), description: z.string().optional(), brand: z.string().max(150).optional(), costCents: z.number().int().nonnegative().default(0), shippingCostCents: z.number().int().nonnegative().default(0), stock: z.number().int().nonnegative().default(0), weightGrams: z.number().int().nonnegative().default(0), widthMm: z.number().int().nonnegative().default(0), heightMm: z.number().int().nonnegative().default(0), lengthMm: z.number().int().nonnegative().default(0), images: z.array(z.string().url()).default([]), videos: z.array(z.string().url()).default([]), attributes: z.record(z.string(), z.string()).default({}), category: z.string().max(150).optional(), status: z.enum(["active", "inactive", "unmatched", "blocked"]).default("active") })).mutation(({ ctx, input }) => SupplierService.upsertProduct(ctx.user.id, { ...input, images: JSON.stringify(input.images), videos: JSON.stringify(input.videos), attributes: JSON.stringify(input.attributes) })),
    analyzeMatch: protectedProcedure.input(z.object({ supplierProductId: z.number().int().positive() })).mutation(({ ctx, input }) => SupplierMatchingService.analyze(ctx.user.id, input.supplierProductId)),
  }),

  mappings: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).default({})).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      return db.select().from(supplierProductMappings).where(input.status ? and(eq(supplierProductMappings.userId, ctx.user.id), eq(supplierProductMappings.status, input.status)) : eq(supplierProductMappings.userId, ctx.user.id)).orderBy(desc(supplierProductMappings.updatedAt));
    }),
    review: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected", "reviewed", "pending_review"]), productId: z.number().int().positive().optional(), variantId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const current = await db.select().from(supplierProductMappings).where(and(eq(supplierProductMappings.id, input.id), eq(supplierProductMappings.userId, ctx.user.id))).limit(1);
      if (!current.length) throw new TRPCError({ code: "NOT_FOUND", message: "Mapping não encontrado" });
      if (input.status === "approved" && !input.productId) throw new TRPCError({ code: "BAD_REQUEST", message: "Produto Mestre obrigatório para aprovar" });
      if (input.status === "approved" && !["exact", "probable"].includes(current[0].matchType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Este mapping não é elegível para aprovação" });
      if (input.status === "approved" && current[0].matchType === "probable" && current[0].status !== "reviewed") throw new TRPCError({ code: "BAD_REQUEST", message: "Match provável exige revisão explícita antes da aprovação" });
      const selectedProductId = input.productId ?? current[0].productId;
      if (input.variantId && !selectedProductId) throw new TRPCError({ code: "BAD_REQUEST", message: "Produto Mestre obrigatório para validar a variante" });
      if (selectedProductId) {
        const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, selectedProductId), eq(products.userId, ctx.user.id))).limit(1);
        if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto Mestre não encontrado" });
      }
      if (input.variantId) {
        const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.userId, ctx.user.id), eq(productVariants.productId, selectedProductId!))).limit(1);
        assertVariantOwnership({ variantExists: variant.length > 0, ownerMatches: variant.length > 0, productMatches: variant.length > 0 });
      }
      await db.update(supplierProductMappings).set({ status: input.status, ...(input.productId ? { productId: input.productId } : {}), ...(input.variantId ? { variantId: input.variantId } : {}), reviewedBy: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(supplierProductMappings.id, input.id), eq(supplierProductMappings.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

  fulfillment: router({
    prepareForOrder: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(({ ctx, input }) => SupplierFulfillmentService.prepareForOrder(ctx.user.id, input.orderId)),
    update: protectedProcedure.input(z.object({ fulfillmentGroupId: z.number().int().positive(), status: z.enum(["awaiting_approval", "approved", "submitted", "shipped", "delivered", "cancelled"]), trackingCode: z.string().trim().max(255).optional(), carrier: z.string().trim().max(150).optional() })).mutation(({ ctx, input }) => SupplierFulfillmentService.updateFulfillment(ctx.user.id, input.fulfillmentGroupId, input)),
    createReturn: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), supplierId: z.number().int().positive().optional(), reason: z.string().trim().min(3).max(5000), refundAmountCents: z.number().int().nonnegative().default(0) })).mutation(({ ctx, input }) => SupplierFulfillmentService.createReturnRequest(ctx.user.id, input)),
  }),

  routing: router({
    list: protectedProcedure.input(z.object({ productId: z.number().int().positive().optional() }).default({})).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      return db.select().from(supplyRoutingPolicies).where(input.productId ? and(eq(supplyRoutingPolicies.userId, ctx.user.id), eq(supplyRoutingPolicies.productId, input.productId)) : eq(supplyRoutingPolicies.userId, ctx.user.id)).orderBy(supplyRoutingPolicies.priority);
    }),
    upsert: protectedProcedure.input(z.object({ productId: z.number().int().positive(), supplierId: z.number().int().positive(), priority: z.number().int().nonnegative().default(0), fulfillmentMode, supplierStockBuffer: z.number().int().nonnegative().default(0), staleAfterMinutes: z.number().int().positive().default(120), blockAfterStaleMinutes: z.number().int().positive().default(1440), minimumMarginBp: z.number().int().nonnegative().default(0), autoFulfillmentAllowed: z.boolean().default(false), isActive: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const [product, supplier] = await Promise.all([
        db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1),
        db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, input.supplierId), eq(suppliers.userId, ctx.user.id))).limit(1),
      ]);
      if (!product.length || !supplier.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto ou fornecedor não encontrado" });
      const current = await db.select({ id: supplyRoutingPolicies.id }).from(supplyRoutingPolicies).where(and(eq(supplyRoutingPolicies.userId, ctx.user.id), eq(supplyRoutingPolicies.productId, input.productId), eq(supplyRoutingPolicies.supplierId, input.supplierId))).limit(1);
      const values = { priority: input.priority, fulfillmentMode: input.fulfillmentMode, supplierStockBuffer: input.supplierStockBuffer, staleAfterMinutes: input.staleAfterMinutes, blockAfterStaleMinutes: input.blockAfterStaleMinutes, minimumMarginBp: input.minimumMarginBp, autoFulfillmentAllowed: input.autoFulfillmentAllowed ? 1 : 0, isActive: input.isActive ? 1 : 0, updatedAt: new Date() };
      if (current.length) await db.update(supplyRoutingPolicies).set(values).where(and(eq(supplyRoutingPolicies.id, current[0].id), eq(supplyRoutingPolicies.userId, ctx.user.id)));
      else await db.insert(supplyRoutingPolicies).values({ ...values, userId: ctx.user.id, productId: input.productId, supplierId: input.supplierId });
      return { success: true };
    }),
  }),

  affiliates: router({
    list: protectedProcedure.query(({ ctx }) => AffiliateService.list(ctx.user.id)),
    createSource: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(150), network: z.string().trim().min(2).max(80), commissionBp: z.number().int().min(0).max(10000).default(0) })).mutation(({ ctx, input }) => AffiliateService.createSource(ctx.user.id, input)),
    createLink: protectedProcedure.input(z.object({ sourceId: z.number().int().positive(), productId: z.number().int().positive().optional(), slug: z.string().trim().min(2).max(180), destinationUrl: z.string().url() })).mutation(({ ctx, input }) => AffiliateService.createLink(ctx.user.id, input)),
    recordEvent: protectedProcedure.input(z.object({ linkId: z.number().int().positive(), eventType: z.enum(["click", "conversion", "reversal"]), externalEventId: z.string().trim().max(255).optional(), amountCents: z.number().int().nonnegative().default(0), commissionCents: z.number().int().nonnegative().default(0) })).mutation(({ ctx, input }) => AffiliateService.recordEvent(ctx.user.id, input)),
    events: protectedProcedure.input(z.object({ linkId: z.number().int().positive().optional() }).default({})).query(({ ctx, input }) => AffiliateService.listEvents(ctx.user.id, input.linkId)),
  }),

  analysis: router({
    landedCost: protectedProcedure.input(z.object({ supplierCostCents: z.number().int().nonnegative(), supplierShippingCents: z.number().int().nonnegative(), marketplaceFeesCents: z.number().int().nonnegative().default(0), paymentFeesCents: z.number().int().nonnegative().default(0), taxesCents: z.number().int().nonnegative().default(0), operationalCostCents: z.number().int().nonnegative().default(0), packagingCents: z.number().int().nonnegative().default(0), expectedReturnCostCents: z.number().int().nonnegative().default(0), riskReserveCents: z.number().int().nonnegative().default(0), salePriceCents: z.number().int().nonnegative().optional(), minimumMarginBp: z.number().int().nonnegative().default(0) })).query(({ input }) => { const landed = calculateLandedCost(input); return { ...landed, margin: input.salePriceCents === undefined ? null : calculateMargin(input.salePriceCents, landed.realCostCents, input.minimumMarginBp) }; }),
    minimumPrice: protectedProcedure.input(z.object({ fixedCostCents: z.number().int().nonnegative(), marketplaceFeeBp: z.number().int().nonnegative().default(0), paymentFeeBp: z.number().int().nonnegative().default(0), taxBp: z.number().int().nonnegative().default(0), minimumMarginBp: z.number().int().nonnegative().default(0) })).query(({ input }) => calculateMinimumSalePrice(input)),
    supplyScore: protectedProcedure.input(z.object({ marginBp: z.number(), stockScore: z.number(), demandScore: z.number(), supplierScore: z.number(), leadTimeScore: z.number(), riskScore: z.number() })).query(({ input }) => calculateSupplyScore(input)),
    opportunityScore: protectedProcedure.input(z.object({ demandScore: z.number(), marginScore: z.number(), supplierScore: z.number(), seoScore: z.number(), competitivenessScore: z.number(), riskScore: z.number() })).query(({ input }) => calculateOpportunityScore(input)),
    route: protectedProcedure.input(z.object({ quantity: z.number().int().positive().default(1), mode: fulfillmentMode, candidates: z.array(z.object({ supplierId: z.number().int().positive(), priority: z.number().int().nonnegative(), stock: z.number().int().nonnegative(), reservedStock: z.number().int().nonnegative().default(0), stockBuffer: z.number().int().nonnegative().default(0), costCents: z.number().int().nonnegative(), shippingCents: z.number().int().nonnegative(), leadTimeDays: z.number().int().nonnegative(), reliabilityBp: z.number().int().min(0).max(10000), cancellationRateBp: z.number().int().min(0).max(10000).default(0), returnRateBp: z.number().int().min(0).max(10000).default(0), stale: z.boolean(), blocked: z.boolean(), allowedModes: z.array(fulfillmentMode).optional() })) })).query(({ input }) => routeSupply(input.candidates, input.quantity, input.mode)),
  }),
});
