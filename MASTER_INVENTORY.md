# INVENTÁRIO TÉCNICO — GABARITO MASTER

## Rotas e páginas
client/src/pages/Cadastros.tsx
client/src/pages/ComponentShowcase.tsx
client/src/pages/Dashboard.tsx
client/src/pages/Home.tsx
client/src/pages/Marketplaces.tsx
client/src/pages/NotFound.tsx
client/src/pages/Omnichannel.tsx
client/src/pages/Operations.tsx
client/src/pages/Orders.tsx
client/src/pages/Products.tsx
client/src/pages/SEOAdvanced.tsx
client/src/pages/SalesChannels.tsx
client/src/pages/Supply.tsx
client/src/pages/SupplySection.tsx
server/routers/catalog.ts
server/routers/catalogEnhancements.ts
server/routers/conflicts.ts
server/routers/dataTools.ts
server/routers/identifiers.ts
server/routers/inventory.ts
server/routers/inventoryMovements.ts
server/routers/mappings.ts
server/routers/marketplace.ts
server/routers/omnichannel.ts
server/routers/operations.ts
server/routers/orders.ts
server/routers/pricing.ts
server/routers/products.ts
server/routers/seoAdvanced.ts
server/routers/supply.ts

## Serviços e workers
server/services/attributeMappingService.ts
server/services/auditService.ts
server/services/encryption.ts
server/services/inventoryMovementService.ts
server/services/inventoryService.ts
server/services/listingImportService.ts
server/services/marketplaceSafetyService.ts
server/services/marketplaceService.ts
server/services/matchingPolicy.ts
server/services/matchingService.ts
server/services/mediaResolver.ts
server/services/orderSyncService.ts
server/services/productSyncService.ts
server/services/publicStoreService.ts
server/services/publicationPreflightService.ts
server/services/rateLimiter.ts
server/services/syncJobService.ts
server/services/webhookEventRouter.ts
server/services/webhookService.ts
server/sourcing/supplierMatchingService.ts
server/suppliers/adapters.test.ts
server/suppliers/connectionSecurity.test.ts
server/suppliers/csvAdapter.ts
server/suppliers/importValidation.test.ts
server/suppliers/manualAdapter.ts
server/suppliers/money.ts
server/suppliers/registry.ts
server/suppliers/supplierConnectionService.ts
server/suppliers/supplierImportService.ts
server/suppliers/supplierService.ts
server/suppliers/types.ts
server/supply/engines.test.ts
server/supply/engines.ts
server/supply/securityPolicy.test.ts
server/supply/securityPolicy.ts
server/supply/supplierFulfillmentService.ts

## Adapters
server/adapters/AdapterFactory.ts
server/adapters/AmazonAdapter.ts
server/adapters/BaseAdapter.ts
server/adapters/MercadoLivreAdapter.ts
server/adapters/ShopeeAdapter.ts
server/adapters/TikTokAdapter.ts
server/adapters/types.ts

## Migrations
0000_absurd_hydra.sql
0001_tired_skreet.sql
0002_married_agent_brand.sql
0003_red_infant_terrible.sql
0004_past_nightshade.sql
0005_mysterious_quentin_quire.sql
0006_flat_lady_mastermind.sql
0007_fat_franklin_storm.sql

## Testes
server/auth.logout.test.ts
server/catalog.auth.test.ts
server/catalog.logic.test.ts
server/inventory.ats.test.ts
server/marketplace.hardening.test.ts
server/marketplaceSafety.test.ts
server/matchingService.test.ts
server/migrationIdentifierLength.test.ts
server/products.logic.test.ts
server/products.router.test.ts
server/stock.sync.test.ts
server/suppliers/adapters.test.ts
server/suppliers/connectionSecurity.test.ts
server/suppliers/importValidation.test.ts
server/supply/engines.test.ts
server/supply/securityPolicy.test.ts
server/webhook.router.test.ts

## Tabelas declaradas
export const users = mysqlTable("users", {
export const marketplaceConnections = mysqlTable(
export const salesChannels = mysqlTable("sales_channels", {
export const products = mysqlTable("products", {
export const marketplaceListings = mysqlTable(
export const listingImportStaging = mysqlTable("listing_import_staging", {
export const orders = mysqlTable(
export const orderItems = mysqlTable(
export const syncLogs = mysqlTable(
export const syncConflicts = mysqlTable("sync_conflicts", {
export const auditLogs = mysqlTable("audit_logs", {
export const insumos = mysqlTable("insumos", {
export const banhos = mysqlTable("banhos", {
export const kits = mysqlTable("kits", {
export const kitItems = mysqlTable("kit_items", {
export const financeiro = mysqlTable("financeiro", {
export const seoSettings = mysqlTable("seo_settings", {
export const liveStreams = mysqlTable("live_streams", {
export const productMedia = mysqlTable("product_media", {
export const productVariants = mysqlTable("product_variants", {
export const productIdentifiers = mysqlTable("product_identifiers", {
export const productAttributes = mysqlTable("product_attributes", {
export const listingChannelOverrides = mysqlTable("listing_channel_overrides", {
export const syncJobs = mysqlTable("sync_jobs", {
export const webhookEvents = mysqlTable("webhook_events", {
export const productSeoProfiles = mysqlTable("product_seo_profiles", {
export const inventoryReservations = mysqlTable("inventory_reservations", {
export const inventoryMovements = mysqlTable("inventory_movements", {
export const marketplaceCategoryMappings = mysqlTable("marketplace_category_mappings", {
export const marketplaceAttributeMappings = mysqlTable("marketplace_attribute_mappings", {
export const publicationPreflightResults = mysqlTable("publication_preflight_results", {
export const suppliers = mysqlTable("suppliers", {
export const supplierIntegrations = mysqlTable("supplier_integrations", {
export const supplierSyncRuns = mysqlTable("supplier_sync_runs", {
export const supplierProducts = mysqlTable("supplier_products", {
export const supplierImportItems = mysqlTable("supplier_import_items", {
export const supplierProductMappings = mysqlTable("supplier_product_mappings", {
export const supplyRoutingPolicies = mysqlTable("supply_routing_policies", {
export const supplierPriceHistory = mysqlTable("supplier_price_history", {
export const supplierInventoryHistory = mysqlTable("supplier_inventory_history", {
export const supplyAlerts = mysqlTable("supply_alerts", {
export const purchaseOrders = mysqlTable("purchase_orders", {
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
export const fulfillmentGroups = mysqlTable("fulfillment_groups", {
export const fulfillmentGroupItems = mysqlTable("fulfillment_group_items", {
export const returnRequests = mysqlTable("return_requests", {
export const supplierHealthSnapshots = mysqlTable("supplier_health_snapshots", {

## Regras comerciais localizadas
server/adapters/AmazonAdapter.ts:132:          quantity: [{ value: payload.stock.toString() }],
server/adapters/AmazonAdapter.ts:138:      const response = await this.httpClient.post(`/feeds/2021-06-30/feeds`, {
server/adapters/AmazonAdapter.ts:139:        feedType: "POST_PRODUCT_DATA",
server/adapters/AmazonAdapter.ts:142:        feedDocument: itemPayload,
server/adapters/AmazonAdapter.ts:167:      if (payload.stock !== undefined) updateData.quantity = [{ value: payload.stock.toString() }];
server/adapters/AmazonAdapter.ts:201:   * Update product stock
server/adapters/AmazonAdapter.ts:208:        quantity: [{ value: payload.stock.toString() }],
server/adapters/AmazonAdapter.ts:277:      return { type: "stock_update", data: payload };
server/adapters/AmazonAdapter.ts:302:      shippingAddress: amazonOrder.ShippingAddress
server/adapters/MercadoLivreAdapter.ts:135:        stock: data.available_quantity,
server/adapters/MercadoLivreAdapter.ts:166:        available_quantity: payload.stock,
server/adapters/MercadoLivreAdapter.ts:200:      if (payload.stock !== undefined) updateData.available_quantity = payload.stock;
server/adapters/MercadoLivreAdapter.ts:235:   * Update product stock
server/adapters/MercadoLivreAdapter.ts:242:        available_quantity: payload.stock,
server/adapters/MercadoLivreAdapter.ts:390:      shippingAddress: mlOrder.shipping ? this.parseMLShippingAddress(mlOrder.shipping) : undefined,
server/adapters/MercadoLivreAdapter.ts:395:   * Helper: Parse Mercado Livre shipping address
server/adapters/MercadoLivreAdapter.ts:397:  private parseMLShippingAddress(shipping: any) {
server/adapters/MercadoLivreAdapter.ts:398:    const receiver = shipping.receiver_address;
server/adapters/ShopeeAdapter.ts:146:        stock: data.stock_info_v2?.summary_info?.total_reserved_stock ?? data.stock,
server/adapters/ShopeeAdapter.ts:175:          stock: payload.stock,
server/adapters/ShopeeAdapter.ts:208:      if (payload.stock !== undefined) updateData.stock = payload.stock;
server/adapters/ShopeeAdapter.ts:244:   * Update product stock
server/adapters/ShopeeAdapter.ts:250:      await this.httpClient.post(`/product/update_stock`, {
server/adapters/ShopeeAdapter.ts:252:        stock: payload.stock,
server/adapters/ShopeeAdapter.ts:367:      shippingAddress: shopeeOrder.recipient_address
server/adapters/TikTokAdapter.ts:134:            stock: payload.stock,
server/adapters/TikTokAdapter.ts:165:      if (payload.price || payload.stock !== undefined) {
server/adapters/TikTokAdapter.ts:170:            ...(payload.stock !== undefined && { stock: payload.stock }),
server/adapters/TikTokAdapter.ts:213:   * Update product stock
server/adapters/TikTokAdapter.ts:224:            stock: payload.stock,
server/adapters/TikTokAdapter.ts:322:      shippingAddress: tiktokOrder.recipient_address
server/adapters/types.ts:23:  stock: number;
server/adapters/types.ts:36:  stock?: number;
server/adapters/types.ts:47:  stock: number;
server/adapters/types.ts:76:  stock?: number;
server/adapters/types.ts:93:  shippingAddress?: ShippingAddress;
server/adapters/types.ts:168:   * Update product stock
server/catalog.auth.test.ts:21:      expectUnauthorized(caller.catalog.insumos.list()),
server/catalog.auth.test.ts:22:      expectUnauthorized(caller.catalog.banhos.list()),
server/catalog.auth.test.ts:34:      expectUnauthorized(caller.catalog.insumos.create({ name: "Metal", cost: 100, weight: 1, stock: 1, minStock: 0, idealStock: 1, addToPlating: false })),
server/catalog.auth.test.ts:35:      expectUnauthorized(caller.catalog.insumos.update({ id: 1, name: "Metal atualizado" })),
server/catalog.auth.test.ts:36:      expectUnauthorized(caller.catalog.insumos.remove({ id: 1 })),
server/catalog.auth.test.ts:37:      expectUnauthorized(caller.catalog.banhos.create({ name: "Dourado", milesimos: 1, quotation: 100, operationalTax: 0, labor: 100, technicalLoss: 0, technicalMargin: 0, pricePerGram: 100 })),
server/catalog.auth.test.ts:38:      expectUnauthorized(caller.catalog.banhos.update({ id: 1, name: "Dourado atualizado" })),
server/catalog.auth.test.ts:39:      expectUnauthorized(caller.catalog.banhos.remove({ id: 1 })),
server/catalog.auth.test.ts:40:      expectUnauthorized(caller.catalog.kits.create({ sku: "KIT-001", name: "Kit", costBase: 100, weightBase: 1, marginTarget: 10, marginType: "perc", stock: 1, status: "active", items: [] })),
server/catalog.logic.test.ts:5:  it("calculates total cost and limiting stock from components", () => {
server/catalog.logic.test.ts:9:    ])).toEqual({ costBase: 900, stock: 5 });
server/catalog.logic.test.ts:13:    expect(calculateKitTotals([])).toEqual({ costBase: 0, stock: 0 });
server/catalog.logic.test.ts:18:    expect(kitItemInput.safeParse({ productId: 1, insumoId: 2, quantity: 1 }).success).toBe(false);
server/products.logic.test.ts:6:    expect(productInput.safeParse({ sku: "SKU-001", name: "Brinco", costBase: 1250, stock: 3, minStock: 1 }).success).toBe(true);
server/products.logic.test.ts:9:    expect(productInput.safeParse({ sku: "SKU-001", name: "Brinco", stock: -1 }).success).toBe(false);
server/products.router.test.ts:118:    const created = await caller.products.create({ sku: "SKU-001", name: "Brinco", costBase: 1250, stock: 3, minStock: 1 });
server/products.router.test.ts:122:    await caller.products.update({ id: created.id, name: "Brinco atualizado", stock: 4 });
server/routers/catalog.ts:3:import { banhos, financeiro, insumos, kitItems, kits, liveStreams, products, seoSettings } from "../../drizzle/schema";
server/routers/catalog.ts:18:const insumosRouter = router({
server/routers/catalog.ts:21:    return db.select().from(insumos).where(eq(insumos.userId, ctx.user.id)).orderBy(desc(insumos.updatedAt));
server/routers/catalog.ts:28:      weight: positiveInt.default(0),
server/routers/catalog.ts:29:      stock: positiveInt.default(0),
server/routers/catalog.ts:36:      const result = await db.insert(insumos).values({
server/routers/catalog.ts:41:        weight: input.weight,
server/routers/catalog.ts:42:        stock: input.stock,
server/routers/catalog.ts:55:      weight: positiveInt.optional(),
server/routers/catalog.ts:56:      stock: positiveInt.optional(),
server/routers/catalog.ts:66:      await db.update(insumos).set(updateData).where(and(eq(insumos.id, id), eq(insumos.userId, ctx.user.id)));
server/routers/catalog.ts:73:      await db.delete(insumos).where(and(eq(insumos.id, input.id), eq(insumos.userId, ctx.user.id)));
server/routers/catalog.ts:78:const banhosRouter = router({
server/routers/catalog.ts:81:    return db.select().from(banhos).where(eq(banhos.userId, ctx.user.id)).orderBy(desc(banhos.updatedAt));
server/routers/catalog.ts:98:      const result = await db.insert(banhos).values({ userId: ctx.user.id, ...input });
server/routers/catalog.ts:118:      await db.update(banhos).set(fields).where(and(eq(banhos.id, id), eq(banhos.userId, ctx.user.id)));
server/routers/catalog.ts:125:      await db.delete(banhos).where(and(eq(banhos.id, input.id), eq(banhos.userId, ctx.user.id)));
server/routers/catalog.ts:132:  insumoId: z.number().int().positive().nullable().optional(),
server/routers/catalog.ts:136:  if (!item.productId && !item.insumoId) {
server/routers/catalog.ts:137:    issue.addIssue({ code: z.ZodIssueCode.custom, path: ["productId"], message: "Informe um produto ou insumo" });
server/routers/catalog.ts:139:  if (item.productId && item.insumoId) {
server/routers/catalog.ts:140:    issue.addIssue({ code: z.ZodIssueCode.custom, path: ["productId"], message: "Escolha produto ou insumo, não os dois" });
server/routers/catalog.ts:148:  costBase: moneyInCents.default(0),
server/routers/catalog.ts:149:  weightBase: positiveInt.default(0),
server/routers/catalog.ts:150:  marginTarget: positiveInt.default(0),
server/routers/catalog.ts:151:  marginType: z.enum(["perc", "fixed"]).default("perc"),
server/routers/catalog.ts:152:  stock: positiveInt.default(0),
server/routers/catalog.ts:163:  if (!items.length) return { costBase: 0, stock: 0 };
server/routers/catalog.ts:164:  const costBase = items.reduce((total, item) => total + item.unitCost * item.quantity, 0);
server/routers/catalog.ts:165:  const stock = Math.min(...items.map((item) => Math.floor(item.availableStock / item.quantity)));
server/routers/catalog.ts:166:  return { costBase, stock: Number.isFinite(stock) ? stock : 0 };
server/routers/catalog.ts:170:  if (!items.length) return { items: [], costBase: 0, stock: 0 };
server/routers/catalog.ts:173:  const insumoIds = items.flatMap((item) => item.insumoId ? [item.insumoId] : []);
server/routers/catalog.ts:174:  const [productRows, insumoRows] = await Promise.all([
server/routers/catalog.ts:176:    insumoIds.length ? db.select().from(insumos).where(and(eq(insumos.userId, userId), inArray(insumos.id, insumoIds))) : [],
server/routers/catalog.ts:179:  const insumoMap = new Map(insumoRows.map((row: any) => [row.id, row]));
server/routers/catalog.ts:181:    const component: any = item.productId ? productMap.get(item.productId) : insumoMap.get(item.insumoId);
server/routers/catalog.ts:183:    const unitCost = item.productId ? Number(component.costBase ?? 0) : Number(component.cost ?? 0);
server/routers/catalog.ts:184:    return { ...item, unitCost, availableStock: Number(component.stock ?? 0) };
server/routers/catalog.ts:210:      costBase: items.length ? composition.costBase : kitData.costBase,
server/routers/catalog.ts:211:      stock: items.length ? composition.stock : kitData.stock,
server/routers/catalog.ts:217:    return { id: kitId, success: true, calculatedCostBase: items.length ? composition.costBase : kitData.costBase, calculatedStock: items.length ? composition.stock : kitData.stock };
server/routers/catalog.ts:226:      let calculated: { costBase?: number; stock?: number } = {};
server/routers/catalog.ts:229:        calculated = { costBase: composition.costBase, stock: composition.stock };
server/routers/catalog.ts:230:        updateData.costBase = composition.costBase;
server/routers/catalog.ts:231:        updateData.stock = composition.stock;
server/routers/catalog.ts:371:    const [productRows, insumoRows, kitRows] = await Promise.all([
server/routers/catalog.ts:373:      db.select().from(insumos).where(eq(insumos.userId, ctx.user.id)),
server/routers/catalog.ts:378:      insumos: insumoRows,
server/routers/catalog.ts:380:      lowStockProducts: productRows.filter((item) => (item.stock ?? 0) <= (item.minStock ?? 0)),
server/routers/catalog.ts:381:      lowStockInsumos: insumoRows.filter((item) => (item.stock ?? 0) <= (item.minStock ?? 0)),
server/routers/catalog.ts:387:  insumos: insumosRouter,
server/routers/catalog.ts:388:  banhos: banhosRouter,
server/routers/marketplace.ts:219:      const listing = JSON.parse(staged[0].payload) as { listingId: string; title?: string; description?: string; price?: number; stock?: number; status?: string; listingUrl?: string };
server/routers/marketplace.ts:221:      const values = { marketplaceConnectionId: connection[0].id, productId: input.productId, variantId: input.variantId, marketplaceListingId: listing.listingId, title: listing.title, description: listing.description, price: listing.price, stock: listing.stock, status: listing.status || "paused", listingUrl: listing.listingUrl, lastSyncedAt: new Date() };
server/routers/marketplace.ts:257:      stock: z.number().int().min(0).optional(),
server/routers/marketplace.ts:280:        stock: input.stock,
server/routers/pricing.ts:11:  commissionBp: z.number().int().min(0).max(10000).default(0), // 0 a 100,00%
server/routers/pricing.ts:13:  shippingCostCents: z.number().int().min(0).default(0),
server/routers/pricing.ts:14:  taxBp: z.number().int().min(0).max(10000).default(0),
server/routers/pricing.ts:20: * margem líquida real de um preço já definido, descontando comissão, taxa
server/routers/pricing.ts:23: * Fórmulas (P = preço de venda, C = custo, em centavos; comm/tax em fração 0-1):
server/routers/pricing.ts:25: *     P = (C + fee + ship) / (1 - comm - tax - margemAlvo)
server/routers/pricing.ts:27: *     P = (C + fee + ship + margemAlvoCents) / (1 - comm - tax)
server/routers/pricing.ts:31:  commissionBp: number;
server/routers/pricing.ts:33:  shippingCostCents: number;
server/routers/pricing.ts:34:  taxBp: number;
server/routers/pricing.ts:35:  marginMode: "percent" | "fixed";
server/routers/pricing.ts:36:  marginValue: number; // percent: pontos-base (1500 = 15%); fixed: centavos
server/routers/pricing.ts:38:  const comm = params.commissionBp / 10000;
server/routers/pricing.ts:39:  const tax = params.taxBp / 10000;
server/routers/pricing.ts:40:  const baseCosts = params.costCents + params.fixedFeeCents + params.shippingCostCents;
server/routers/pricing.ts:44:  if (params.marginMode === "percent") {
server/routers/pricing.ts:45:    const margin = params.marginValue / 10000;
server/routers/pricing.ts:46:    const denom = 1 - comm - tax - margin;
server/routers/pricing.ts:51:    const denom = 1 - comm - tax;
server/routers/pricing.ts:53:      suggestedPrice = Math.ceil((baseCosts + params.marginValue) / denom);
server/routers/pricing.ts:63:  commissionBp: number;
server/routers/pricing.ts:65:  shippingCostCents: number;
server/routers/pricing.ts:66:  taxBp: number;
server/routers/pricing.ts:68:  const comm = params.commissionBp / 10000;
server/routers/pricing.ts:69:  const tax = params.taxBp / 10000;
server/routers/pricing.ts:70:  const commissionValue = Math.round(params.price * comm);
server/routers/pricing.ts:71:  const taxValue = Math.round(params.price * tax);
server/routers/pricing.ts:72:  const netRevenue = params.price - commissionValue - taxValue - params.fixedFeeCents - params.shippingCostCents;
server/routers/pricing.ts:74:  const marginPercentOfPrice = params.price > 0 ? Math.round((profitCents / params.price) * 10000) : 0;
server/routers/pricing.ts:79:    marginPercentOfPrice, // pontos-base sobre o preço de venda
server/routers/pricing.ts:81:    commissionValue,
server/routers/pricing.ts:82:    taxValue,
server/routers/pricing.ts:101:        commissionBp: input.commissionBp,
server/routers/pricing.ts:103:        shippingCostCents: input.shippingCostCents,
server/routers/pricing.ts:104:        taxBp: input.taxBp,
server/routers/pricing.ts:122:            commissionBp: rest.commissionBp,
server/routers/pricing.ts:124:            shippingCostCents: rest.shippingCostCents,
server/routers/pricing.ts:125:            taxBp: rest.taxBp,
server/routers/pricing.ts:149:        marginMode: z.enum(["percent", "fixed"]).default("percent"),
server/routers/pricing.ts:150:        marginValue: z.number().int().min(0), // percent: pontos-base; fixed: centavos
server/routers/pricing.ts:169:        costCents = rows[0].costBase ?? 0;
server/routers/pricing.ts:181:          commissionBp: channel.commissionBp,
server/routers/pricing.ts:183:          shippingCostCents: channel.shippingCostCents,
server/routers/pricing.ts:184:          taxBp: channel.taxBp,
server/routers/pricing.ts:185:          marginMode: input.marginMode,
server/routers/pricing.ts:186:          marginValue: input.marginValue,
server/routers/pricing.ts:200:              commissionBp: channel.commissionBp,
server/routers/pricing.ts:202:              shippingCostCents: channel.shippingCostCents,
server/routers/pricing.ts:203:              taxBp: channel.taxBp,
server/routers/pricing.ts:245:          commissionBp: channel.commissionBp,
server/routers/pricing.ts:247:          shippingCostCents: channel.shippingCostCents,
server/routers/pricing.ts:248:          taxBp: channel.taxBp,
server/routers/products.ts:16:  costBase: z.number().int().min(0).default(0),
server/routers/products.ts:17:  basePrice: z.number().int().min(0).default(0),
server/routers/products.ts:18:  weightBase: z.number().int().min(0).default(0),
server/routers/products.ts:26:  stock: z.number().int().min(0).default(0),
server/routers/products.ts:137:   * Update product stock on a marketplace
server/routers/products.ts:159:            message: result.error || "Failed to update stock",
server/routers/products.ts:167:          message: error instanceof Error ? error.message : "Failed to update stock",
server/routers/products.ts:273:    .input(z.object({ id: z.number().int().positive(), ...productFields }).partial({ sku: true, name: true, category: true, brand: true, description: true, costBase: true, stock: true, minStock: true }).extend({ id: z.number().int().positive() }))
server/routers/products.ts:285:        if (input.costBase !== undefined) updateData.costBase = input.costBase;
server/routers/products.ts:286:        if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
server/routers/products.ts:287:        if (input.weightBase !== undefined) updateData.weightBase = input.weightBase;
server/routers/products.ts:295:        if (input.stock !== undefined) updateData.stock = input.stock;
server/routers/omnichannel.ts:87:      type: z.enum(["import_listing", "publish", "price", "stock", "order"]),
server/routers/catalogEnhancements.ts:8:const variantInput = z.object({ productId: z.number().int().positive(), sku: z.string().trim().min(1).max(100), gtin: z.string().max(50).optional(), name: z.string().max(255).optional(), attributes: z.record(z.string(), z.string()).default({}), price: z.number().int().min(0).default(0), stock: z.number().int().min(0).default(0), status: z.enum(["active", "inactive"]).default("active") });
server/routers/catalogEnhancements.ts:9:const variantUpdateInput = z.object({ id: z.number().int().positive(), sku: z.string().trim().min(1).max(100).optional(), gtin: z.string().max(50).optional(), name: z.string().max(255).optional(), attributes: z.record(z.string(), z.string()).optional(), price: z.number().int().min(0).optional(), stock: z.number().int().min(0).optional(), status: z.enum(["active", "inactive"]).optional() });
server/routers/catalogEnhancements.ts:22:    const result = await db.insert(productVariants).values({ userId: ctx.user.id, productId: input.productId, sku: input.sku, gtin: input.gtin, name: input.name, attributes: JSON.stringify(input.attributes), price: input.price, stock: input.stock, status: input.status });
server/routers/catalogEnhancements.ts:30:    if (input.sku !== undefined) values.sku = input.sku; if (input.gtin !== undefined) values.gtin = input.gtin; if (input.name !== undefined) values.name = input.name; if (input.attributes !== undefined) values.attributes = JSON.stringify(input.attributes); if (input.price !== undefined) values.price = input.price; if (input.stock !== undefined) values.stock = input.stock; if (input.status !== undefined) values.status = input.status;
server/routers/dataTools.ts:8:const importRow = z.object({ sku: z.string().trim().min(1).max(100), name: z.string().trim().min(2).max(255), description: z.string().max(10000).optional(), category: z.string().max(100).optional(), brand: z.string().max(100).optional(), stock: z.number().int().min(0).default(0), costBase: z.number().int().min(0).default(0), minStock: z.number().int().min(0).default(0) });
server/routers/operations.ts:11:    if (!db) return { ready: false, marketplaceMode: process.env.MARKETPLACE_MODE || "READ_ONLY", database: false, workerConfigured: false, pendingJobs: 0, blockedReasons: ["Banco indisponível"] };
server/routers/operations.ts:13:    const marketplaceMode = process.env.MARKETPLACE_MODE || "READ_ONLY";
server/routers/supply.ts:16:const fulfillmentMode = z.enum(["own_stock", "dropshipping", "cross_docking", "pre_order", "supplier_fulfillment", "hybrid"]);
server/routers/supply.ts:33:    return { suppliers: supplierRows.length, products: productRows.length, activeProducts: activeProducts.length, dropshipping: policyRows.filter((row) => row.fulfillmentMode === "dropshipping").length, hybrid: policyRows.filter((row) => row.fulfillmentMode === "hybrid").length, blockedSuppliers: alertRows.length };
server/routers/supply.ts:38:    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(255), legalName: z.string().max(255).optional(), document: z.string().max(50).optional(), email: z.string().email().optional(), phone: z.string().max(50).optional(), website: z.string().url().optional(), defaultShippingDays: z.number().int().nonnegative().default(0), returnPolicy: z.string().optional(), dropshippingEnabled: z.boolean().default(false), crossDockingEnabled: z.boolean().default(false), integrationType: z.string().max(30).default("manual") })).mutation(({ ctx, input }) => SupplierService.create(ctx.user.id, { ...input, dropshippingEnabled: input.dropshippingEnabled ? 1 : 0, crossDockingEnabled: input.crossDockingEnabled ? 1 : 0, apiEnabled: 0, feedEnabled: 0, status: "pending_review", rating: 0 })),
server/routers/supply.ts:53:    upsert: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), externalId: z.string().min(1).max(255), sku: z.string().max(100).optional(), internalCode: z.string().max(100).optional(), ean: z.string().max(50).optional(), gtin: z.string().max(50).optional(), mpn: z.string().max(100).optional(), name: z.string().min(1).max(500), description: z.string().optional(), brand: z.string().max(150).optional(), costCents: z.number().int().nonnegative().default(0), shippingCostCents: z.number().int().nonnegative().default(0), stock: z.number().int().nonnegative().default(0), weightGrams: z.number().int().nonnegative().default(0), widthMm: z.number().int().nonnegative().default(0), heightMm: z.number().int().nonnegative().default(0), lengthMm: z.number().int().nonnegative().default(0), images: z.array(z.string().url()).default([]), videos: z.array(z.string().url()).default([]), attributes: z.record(z.string(), z.string()).default({}), category: z.string().max(150).optional(), status: z.enum(["active", "inactive", "unmatched", "blocked"]).default("active") })).mutation(({ ctx, input }) => SupplierService.upsertProduct(ctx.user.id, { ...input, images: JSON.stringify(input.images), videos: JSON.stringify(input.videos), attributes: JSON.stringify(input.attributes) })),
server/routers/supply.ts:93:    upsert: protectedProcedure.input(z.object({ productId: z.number().int().positive(), supplierId: z.number().int().positive(), priority: z.number().int().nonnegative().default(0), fulfillmentMode, supplierStockBuffer: z.number().int().nonnegative().default(0), staleAfterMinutes: z.number().int().positive().default(120), blockAfterStaleMinutes: z.number().int().positive().default(1440), minimumMarginBp: z.number().int().nonnegative().default(0), autoFulfillmentAllowed: z.boolean().default(false), isActive: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
server/routers/supply.ts:101:      const values = { priority: input.priority, fulfillmentMode: input.fulfillmentMode, supplierStockBuffer: input.supplierStockBuffer, staleAfterMinutes: input.staleAfterMinutes, blockAfterStaleMinutes: input.blockAfterStaleMinutes, minimumMarginBp: input.minimumMarginBp, autoFulfillmentAllowed: input.autoFulfillmentAllowed ? 1 : 0, isActive: input.isActive ? 1 : 0, updatedAt: new Date() };
server/routers/supply.ts:109:    landedCost: protectedProcedure.input(z.object({ supplierCostCents: z.number().int().nonnegative(), supplierShippingCents: z.number().int().nonnegative(), marketplaceFeesCents: z.number().int().nonnegative().default(0), paymentFeesCents: z.number().int().nonnegative().default(0), taxesCents: z.number().int().nonnegative().default(0), operationalCostCents: z.number().int().nonnegative().default(0), packagingCents: z.number().int().nonnegative().default(0), expectedReturnCostCents: z.number().int().nonnegative().default(0), riskReserveCents: z.number().int().nonnegative().default(0), salePriceCents: z.number().int().nonnegative().optional(), minimumMarginBp: z.number().int().nonnegative().default(0) })).query(({ input }) => { const landed = calculateLandedCost(input); return { ...landed, margin: input.salePriceCents === undefined ? null : calculateMargin(input.salePriceCents, landed.realCostCents, input.minimumMarginBp) }; }),
server/routers/supply.ts:110:    supplyScore: protectedProcedure.input(z.object({ marginBp: z.number(), stockScore: z.number(), demandScore: z.number(), supplierScore: z.number(), leadTimeScore: z.number(), riskScore: z.number() })).query(({ input }) => calculateSupplyScore(input)),
server/routers/supply.ts:111:    opportunityScore: protectedProcedure.input(z.object({ demandScore: z.number(), marginScore: z.number(), supplierScore: z.number(), seoScore: z.number(), competitivenessScore: z.number(), riskScore: z.number() })).query(({ input }) => calculateOpportunityScore(input)),
server/routers/supply.ts:112:    route: protectedProcedure.input(z.object({ quantity: z.number().int().positive().default(1), mode: fulfillmentMode, candidates: z.array(z.object({ supplierId: z.number().int().positive(), priority: z.number().int().nonnegative(), stock: z.number().int().nonnegative(), reservedStock: z.number().int().nonnegative().default(0), stockBuffer: z.number().int().nonnegative().default(0), costCents: z.number().int().nonnegative(), shippingCents: z.number().int().nonnegative(), leadTimeDays: z.number().int().nonnegative(), reliabilityBp: z.number().int().min(0).max(10000), cancellationRateBp: z.number().int().min(0).max(10000).default(0), returnRateBp: z.number().int().min(0).max(10000).default(0), stale: z.boolean(), blocked: z.boolean(), allowedModes: z.array(fulfillmentMode).optional() })) })).query(({ input }) => routeSupply(input.candidates, input.quantity, input.mode)),
server/services/orderSyncService.ts:10: * Handles importing orders from marketplaces and syncing stock
server/services/orderSyncService.ts:81:              shippingAddress: order.shippingAddress ? JSON.stringify(order.shippingAddress) : null,
server/services/productSyncService.ts:54:        throw new Error(`Publication Gate bloqueou a publicação: ${preflight.issues.filter((issue) => issue.severity === "error").map((issue) => issue.message).join("; ")}`);
server/services/productSyncService.ts:68:        price: prod.basePrice || 0,
server/services/productSyncService.ts:69:        stock: availability.available,
server/services/productSyncService.ts:87:        price: prod.basePrice || 0,
server/services/productSyncService.ts:88:        stock: availability.available,
server/services/productSyncService.ts:194:   * Update product stock on a marketplace
server/services/productSyncService.ts:231:      // Update stock from unified ATS when the listing is linked to a master product.
server/services/productSyncService.ts:234:      const payload: UpdateStockPayload = { listingId, stock: effectiveStock };
server/services/productSyncService.ts:242:        syncType: "stock_sync",
server/services/productSyncService.ts:255:        syncType: "stock_sync",
server/services/syncJobService.ts:34:        if (job.type === "stock") {
server/services/syncJobService.ts:35:          if (!job.marketplaceConnectionId || !job.productId || typeof payload.listingId !== "string" || typeof payload.stock !== "number") {
server/services/syncJobService.ts:38:          await ProductSyncService.updateStockOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.stock);
server/services/inventoryService.ts:15:    const reserved = await db.select({ total: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(and(
server/services/inventoryService.ts:18:      inArray(inventoryReservations.status, ["reserved", "confirmed"]),
server/services/inventoryService.ts:21:      const variant = await db.select({ stock: productVariants.stock }).from(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.userId, userId), eq(productVariants.productId, productId))).limit(1);
server/services/inventoryService.ts:23:      return { stock: variant[0].stock, reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, variant[0].stock - Number(reserved[0]?.total ?? 0)) };
server/services/inventoryService.ts:25:    const product = await db.select({ stock: products.stock }).from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1);
server/services/inventoryService.ts:27:    return { stock: Number(product[0].stock ?? 0), reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, Number(product[0].stock ?? 0) - Number(reserved[0]?.total ?? 0)) };
server/services/inventoryService.ts:37:      if (policy.fulfillmentMode === "own_stock") continue;
server/services/inventoryService.ts:46:        const available = blocked || stale ? 0 : Math.max(0, product.stock - policy.supplierStockBuffer);
server/services/inventoryService.ts:52:    return { ownStock: own.stock, ownReserved: own.reserved, supplierAvailable, available: ats.available, sources: ats.eligibleSources, blockedSources: sources.filter((source) => !ats.eligibleSources.includes(source)) };
server/services/inventoryService.ts:60:    const result = await db.insert(inventoryReservations).values({ ...input, status: "reserved" });
server/services/inventoryService.ts:61:    if (input.variantId) await db.update(productVariants).set({ reservedStock: sql`${productVariants.reservedStock} + ${input.quantity}` }).where(and(eq(productVariants.id, input.variantId), eq(productVariants.userId, input.userId)));
server/services/inventoryService.ts:67:    const expired = await db.select({ id: inventoryReservations.id }).from(inventoryReservations).where(and(eq(inventoryReservations.userId, userId), eq(inventoryReservations.status, "reserved"), lt(inventoryReservations.expiresAt, new Date())));
server/services/inventoryService.ts:74:    const rows = await db.select().from(inventoryReservations).where(and(eq(inventoryReservations.id, reservationId), eq(inventoryReservations.userId, userId), eq(inventoryReservations.status, "reserved"))).limit(1);
server/services/inventoryService.ts:78:    if (reservation.variantId && (status === "released" || status === "expired")) await db.update(productVariants).set({ reservedStock: sql`greatest(0, ${productVariants.reservedStock} - ${reservation.quantity})` }).where(and(eq(productVariants.id, reservation.variantId), eq(productVariants.userId, userId)));
server/services/publicStoreService.ts:30:    if (record.variants.length) base.hasVariant = record.variants.map((variant) => ({ "@type": "Product", name: variant.name || record.product.name, sku: variant.sku, offers: { "@type": "Offer", priceCurrency: "BRL", price: (variant.price / 100).toFixed(2), availability: variant.stock - variant.reservedStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } }));
server/services/publicStoreService.ts:31:    else base.offers = { "@type": "Offer", priceCurrency: "BRL", price: ((record.product.costBase || 0) / 100).toFixed(2), availability: (record.product.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" };
server/services/inventoryMovementService.ts:15:      const rows = await db.select({ id: productVariants.id, stock: productVariants.stock, productId: productVariants.productId }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(productVariants.userId, input.userId))).limit(1);
server/services/inventoryMovementService.ts:16:      if (!rows.length) throw new Error("Variante não encontrada"); currentStock = rows[0].stock;
server/services/inventoryMovementService.ts:18:      await db.update(productVariants).set({ stock: sql`${productVariants.stock} + ${delta}`, updatedAt: new Date() }).where(and(eq(productVariants.id, input.variantId), eq(productVariants.userId, input.userId)));
server/services/inventoryMovementService.ts:20:      const rows = await db.select({ id: products.id, stock: products.stock }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, input.userId))).limit(1);
server/services/inventoryMovementService.ts:21:      if (!rows.length) throw new Error("Produto não encontrado"); currentStock = Number(rows[0].stock ?? 0);
server/services/inventoryMovementService.ts:23:      await db.update(products).set({ stock: sql`${products.stock} + ${delta}`, updatedAt: new Date() }).where(and(eq(products.id, input.productId), eq(products.userId, input.userId)));
server/services/inventoryMovementService.ts:26:    await writeAudit({ userId: input.userId, action: "inventory_movement", entity: input.variantId ? "product_variant" : "product", entityId: input.variantId || input.productId, before: { stock: currentStock }, after: { stock: currentStock + delta, type: input.type, quantity: input.quantity }, origin: "inventory" });
server/services/rateLimiter.ts:3:/** Lightweight process-local limiter. Production should use a shared store when horizontally scaled. */
server/services/publicationPreflightService.ts:18:  if (product && Number(product.basePrice ?? 0) <= 0) issues.push({ code: "SALE_PRICE_REQUIRED", message: "Preço de venda deve ser maior que zero", severity: "error" });
server/services/publicationPreflightService.ts:19:  if (product && Number(product.stock ?? 0) < 0) issues.push({ code: "STOCK_INVALID", message: "Estoque não pode ser negativo", severity: "error" });
server/services/webhookEventRouter.ts:1:export type WebhookJobType = "order" | "stock" | "price" | null;
server/services/webhookEventRouter.ts:10:  if (normalized.includes("stock") || normalized.includes("inventory") || normalized.includes("item") || normalized.includes("listing")) {
server/services/webhookEventRouter.ts:11:    return { jobType: "stock", normalizedTopic: normalized };
server/services/marketplaceSafetyService.ts:4:  return String(process.env.MARKETPLACE_MODE || "READ_ONLY").toLowerCase() === "live" ? "live" : "read_only";
server/services/marketplaceSafetyService.ts:10:    throw new Error(`MARKETPLACE_MODE=READ_ONLY bloqueou ${operation}${channel}. Ative o modo live explicitamente após a homologação.`);
server/webhook.router.test.ts:12:    expect(routeWebhookEvent("inventory_updated", {}).jobType).toBe("stock");
server/webhook.router.test.ts:14:    expect(routeWebhookEvent("listing_updated", {}).jobType).toBe("stock");
server/marketplaceSafety.test.ts:5:  delete process.env.MARKETPLACE_MODE;
server/marketplaceSafety.test.ts:15:    process.env.MARKETPLACE_MODE = "READ_ONLY";
server/marketplaceSafety.test.ts:22:    process.env.MARKETPLACE_MODE = "LIVE";
server/suppliers/types.ts:19:  shippingCostCents?: number;
server/suppliers/types.ts:20:  stock: number;
server/suppliers/types.ts:21:  weightGrams?: number;
server/suppliers/types.ts:31:  shippingAddress?: Record<string, string>;
server/suppliers/csvAdapter.ts:31:  const stock = Number(normalized);
server/suppliers/csvAdapter.ts:32:  if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Estoque inválido: ${normalized}`);
server/suppliers/csvAdapter.ts:33:  return stock;
server/suppliers/csvAdapter.ts:60:      return { externalId, sku: row.sku || undefined, internalCode: row.internalcode || row.codigo_interno || undefined, ean: row.ean || undefined, gtin: row.gtin || undefined, mpn: row.mpn || undefined, name, description: row.description || row.descricao || undefined, brand: row.brand || row.marca || undefined, costCents: parseMoneyToCents(row.cost || row.custo), shippingCostCents: parseMoneyToCents(row.shipping || row.frete), stock: parseStock(row.stock || row.estoque), category: row.category || row.categoria || undefined };
server/suppliers/adapters.test.ts:29:    expect(result.products[1].stock).toBe(2);
server/suppliers/adapters.test.ts:37:    expect(result.products[0].stock).toBe(10);
server/suppliers/adapters.test.ts:53:    const adapter = new ManualSupplierAdapter({ products: [{ externalId: "1", name: "Produto", costCents: 1000, stock: 3 }] });
server/suppliers/adapters.test.ts:54:    expect((await adapter.getProduct("1"))?.stock).toBe(3);
server/suppliers/supplierImportService.ts:23:  shippingCostCents: z.number().int().nonnegative().optional(),
server/suppliers/supplierImportService.ts:24:  stock: z.number().int().nonnegative(),
server/suppliers/supplierImportService.ts:25:  weightGrams: z.number().int().nonnegative().optional(),
server/suppliers/supplierImportService.ts:92:            shippingCostCents: product.shippingCostCents ?? 0,

## Scripts
{
  "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
  "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && esbuild server/worker.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/worker.js",
  "start": "NODE_ENV=production node dist/index.js",
  "worker": "NODE_ENV=production node dist/worker.js",
  "check": "tsc --noEmit",
  "format": "prettier --write .",
  "test": "vitest run",
  "db:push": "drizzle-kit generate && drizzle-kit migrate"
}
