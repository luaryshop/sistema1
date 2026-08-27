import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Marketplace configurations and credentials
 */
export const marketplaceConnections = mysqlTable(
  "marketplace_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(), // 'mercadolivre', 'shopee', 'amazon', 'tiktok', etc
    isConnected: int("is_connected").default(0).notNull(), // 0 = false, 1 = true
    accessToken: text("access_token"), // encrypted
    refreshToken: text("refresh_token"), // encrypted
    tokenExpiresAt: timestamp("token_expires_at"),
    sellerId: varchar("seller_id", { length: 255 }), // marketplace-specific seller ID
    sellerName: varchar("seller_name", { length: 255 }),
    clientId: varchar("client_id", { length: 255 }), // stored for reference
    clientSecret: text("client_secret"), // encrypted
    webhookUrl: varchar("webhook_url", { length: 500 }),
    webhookSecret: text("webhook_secret"), // encrypted
    lastSyncAt: timestamp("last_sync_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    syncStatus: varchar("sync_status", { length: 50 }).default("idle"), // 'idle', 'syncing', 'error'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userMarketplaceIdx: `UNIQUE KEY user_mkt_idx (user_id, marketplace_type)`,
  })
);

export type MarketplaceConnection = typeof marketplaceConnections.$inferSelect;
export type InsertMarketplaceConnection = typeof marketplaceConnections.$inferInsert;

/**
 * Canais de venda para cálculo de preço/margem — desacoplado da integração OAuth.
 * Cobre marketplaces conectados, mas também loja própria, Instagram, WhatsApp etc.
 * Percentuais são armazenados x100 (ex: 12,5% = 1250) para evitar ponto flutuante.
 */
export const salesChannels = mysqlTable("sales_channels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // "Mercado Livre", "Loja Própria", "Instagram"...
  marketplaceType: varchar("marketplace_type", { length: 50 }), // liga com marketplace_connections, se aplicável
  commissionBp: int("commission_bp").default(0).notNull(), // comissão, em pontos-base (1250 = 12,50%)
  fixedFeeCents: int("fixed_fee_cents").default(0).notNull(), // taxa fixa por venda, em centavos
  shippingCostCents: int("shipping_cost_cents").default(0).notNull(), // frete médio pago pelo vendedor, em centavos
  taxBp: int("tax_bp").default(0).notNull(), // imposto, em pontos-base
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SalesChannel = typeof salesChannels.$inferSelect;
export type InsertSalesChannel = typeof salesChannels.$inferInsert;

/**
 * Products in the ERP system
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  color: varchar("color", { length: 100 }),
  material: varchar("material", { length: 100 }),
  description: text("description"),
  costBase: int("cost_base").default(0), // in cents
  basePrice: int("base_price").default(0), // sale price in cents; never derived directly from costBase
  weightBase: int("weight_base").default(0), // in grams
  height: int("height").default(0), // millimeters
  width: int("width").default(0), // millimeters
  length: int("length").default(0), // millimeters
  ncm: varchar("ncm", { length: 20 }),
  cest: varchar("cest", { length: 20 }),
  origin: varchar("origin", { length: 30 }),
  mpn: varchar("mpn", { length: 100 }),
  marginTarget: int("margin_target").default(0), // percentage or fixed value in cents
  marginType: varchar("margin_type", { length: 20 }).default("perc"), // 'perc' or 'fixed'
  stock: int("stock").default(0),
  minStock: int("min_stock").default(0),
  photoUrl: varchar("photo_url", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"), // 'active', 'inactive', 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Marketplace listings (published products)
 */
export const marketplaceListings = mysqlTable(
  "marketplace_listings",
  {
    id: int("id").autoincrement().primaryKey(),
    marketplaceConnectionId: int("marketplace_connection_id")
      .notNull(),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    marketplaceListingId: varchar("marketplace_listing_id", { length: 255 }).notNull(), // external ID from marketplace
    title: varchar("title", { length: 500 }),
    description: text("description"),
    price: int("price").default(0), // in cents
    stock: int("stock").default(0),
    status: varchar("status", { length: 50 }).default("active"), // 'active', 'inactive', 'paused', 'sold_out'
    listingUrl: varchar("listing_url", { length: 500 }),
    lastPublishedAt: timestamp("last_published_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    marketplaceListingIdx: `UNIQUE KEY mkt_listing_idx (marketplace_connection_id, marketplace_listing_id)`,
    productIdx: `KEY product_idx (product_id)`,
    variantIdx: `KEY marketplace_listing_variant_idx (variant_id)`,
    // Nota: a FK de marketplace_connection_id (nome curto "mkt_listings_conn_fk") é
    // adicionada manualmente no arquivo de migration, pois o nome automático do
    // drizzle passava de 64 caracteres (limite do MySQL/MariaDB).
  })
);

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

/** Read-only staging records for safe marketplace imports and review before linking. */
export const listingImportStaging = mysqlTable("listing_import_staging", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id").notNull().references(() => marketplaceConnections.id, { onDelete: "cascade" }),
  externalListingId: varchar("external_listing_id", { length: 255 }).notNull(),
  payload: text("payload").notNull(),
  normalizedTitle: varchar("normalized_title", { length: 500 }),
  suggestedProductId: int("suggested_product_id").references(() => products.id, { onDelete: "set null" }),
  matchConfidence: int("match_confidence").default(0).notNull(),
  matchClass: varchar("match_class", { length: 20 }).default("unmatched").notNull(), // exact | probable | conflict | unmatched
  matchReason: varchar("match_reason", { length: 50 }),
  matchEvidence: text("match_evidence"), // JSON: matched/conflicting fields
  matchCandidates: text("match_candidates"), // JSON: ranked candidates and score gap
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  stagingUnique: `UNIQUE KEY listing_staging_unique (marketplace_connection_id, external_listing_id)`,
  userIdx: `KEY listing_staging_user_idx (user_id, status)`,
}));
export type ListingImportStaging = typeof listingImportStaging.$inferSelect;
export type InsertListingImportStaging = typeof listingImportStaging.$inferInsert;

/**
 * Orders from marketplaces
 */
export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceConnectionId: int("marketplace_connection_id")
      .notNull()
      .references(() => marketplaceConnections.id, { onDelete: "cascade" }),
    marketplaceOrderId: varchar("marketplace_order_id", { length: 255 }).notNull(),
    buyerName: varchar("buyer_name", { length: 255 }),
    buyerEmail: varchar("buyer_email", { length: 320 }),
    totalAmount: int("total_amount").default(0), // in cents
    status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
    orderDate: timestamp("order_date"),
    shippingAddress: text("shipping_address"), // JSON
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    marketplaceOrderIdx: `UNIQUE KEY mkt_order_idx (marketplace_connection_id, marketplace_order_id)`,
    userIdx: `KEY user_idx (user_id)`,
  })
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items (products in an order)
 */
export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    marketplaceItemId: varchar("marketplace_item_id", { length: 255 }),
    title: varchar("title", { length: 255 }),
    quantity: int("quantity").default(1),
    unitPrice: int("unit_price").default(0), // in cents
    totalPrice: int("total_price").default(0), // in cents
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: `KEY order_idx (order_id)`,
  })
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Synchronization history and logs
 */
export const syncLogs = mysqlTable(
  "sync_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceConnectionId: int("marketplace_connection_id"),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
    syncType: varchar("sync_type", { length: 50 }).notNull(), // 'product_publish', 'product_update', 'stock_sync', 'price_update', 'order_import'
    status: varchar("status", { length: 50 }).notNull(), // 'success', 'failed', 'pending', 'retrying'
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    retryCount: int("retry_count").default(0),
    maxRetries: int("max_retries").default(3),
    metadata: text("metadata"), // JSON with additional context
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: `KEY user_idx (user_id)`,
    marketplaceIdx: `KEY marketplace_idx (marketplace_connection_id)`,
    productIdx: `KEY product_idx (product_id)`,
    syncTypeIdx: `KEY sync_type_idx (sync_type, status)`,
    // Nota: a FK de marketplace_connection_id (nome curto "sync_logs_conn_fk") é
    // adicionada manualmente no arquivo de migration, pelo mesmo motivo acima.
  })
);

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

/** Divergences between the Luary source of truth and a channel offer. */
export const syncConflicts = mysqlTable("sync_conflicts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id"),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  listingId: int("listing_id").references(() => marketplaceListings.id, { onDelete: "set null" }),
  entity: varchar("entity", { length: 50 }).notNull(),
  field: varchar("field", { length: 100 }).notNull(),
  luaryValue: text("luary_value"),
  marketplaceValue: text("marketplace_value"),
  severity: varchar("severity", { length: 20 }).default("medium").notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  resolution: varchar("resolution", { length: 50 }),
  resolvedBy: int("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  conflictUserIdx: `KEY sync_conflict_user_idx (user_id, status, severity)`,
}));
export type SyncConflict = typeof syncConflicts.$inferSelect;
export type InsertSyncConflict = typeof syncConflicts.$inferInsert;

/** Business audit trail with before/after snapshots. */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: int("entity_id"),
  before: text("before"),
  after: text("after"),
  origin: varchar("origin", { length: 50 }).default("system").notNull(),
  ip: varchar("ip", { length: 64 }),
  result: varchar("result", { length: 20 }).default("success").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  auditUserIdx: `KEY audit_user_idx (user_id, created_at)`,
  auditEntityIdx: `KEY audit_entity_idx (entity, entity_id, created_at)`,
}));
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Insumos (supplies/components)
 */
export const insumos = mysqlTable("insumos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  internalCode: varchar("internal_code", { length: 100 }),
  cost: int("cost").default(0), // in cents
  weight: int("weight").default(0), // in grams
  stock: int("stock").default(0),
  minStock: int("min_stock").default(0),
  idealStock: int("ideal_stock").default(0),
  addToPlating: int("add_to_plating").default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Insumo = typeof insumos.$inferSelect;
export type InsertInsumo = typeof insumos.$inferInsert;

/**
 * Banhos (plating/finishing treatments)
 */
export const banhos = mysqlTable("banhos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  metal: varchar("metal", { length: 100 }),
  color: varchar("color", { length: 100 }),
  milesimos: int("milesimos").default(0), // thousandths
  quotation: int("quotation").default(0), // in cents
  operationalTax: int("operational_tax").default(0), // percentage
  labor: int("labor").default(0), // in cents
  technicalLoss: int("technical_loss").default(0), // percentage
  technicalMargin: int("technical_margin").default(0), // percentage
  pricePerGram: int("price_per_gram").default(0), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Banho = typeof banhos.$inferSelect;
export type InsertBanho = typeof banhos.$inferInsert;

/**
 * Kits (product bundles)
 */
export const kits = mysqlTable("kits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  costBase: int("cost_base").default(0), // in cents
  weightBase: int("weight_base").default(0), // in grams
  marginTarget: int("margin_target").default(0),
  marginType: varchar("margin_type", { length: 20 }).default("perc"),
  stock: int("stock").default(0),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Kit = typeof kits.$inferSelect;
export type InsertKit = typeof kits.$inferInsert;

/**
 * Components used by a kit. A row can reference either an ERP product or an insumo.
 */
export const kitItems = mysqlTable("kit_items", {
  id: int("id").autoincrement().primaryKey(),
  kitId: int("kit_id").notNull().references(() => kits.id, { onDelete: "cascade" }),
  productId: int("product_id").references(() => products.id, { onDelete: "cascade" }),
  insumoId: int("insumo_id").references(() => insumos.id, { onDelete: "cascade" }),
  quantity: int("quantity").default(1).notNull(),
  unitCost: int("unit_cost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KitItem = typeof kitItems.$inferSelect;
export type InsertKitItem = typeof kitItems.$inferInsert;

/**
 * Financial transactions
 */
export const financeiro = mysqlTable("financeiro", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'income', 'expense'
  amount: int("amount").default(0), // in cents
  date: timestamp("date").defaultNow(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Financeiro = typeof financeiro.$inferSelect;
export type InsertFinanceiro = typeof financeiro.$inferInsert;

/**
 * SEO settings maintained by the ERP owner.
 */
export const seoSettings = mysqlTable("seo_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageKey: varchar("page_key", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  keywords: varchar("keywords", { length: 500 }),
  canonicalUrl: varchar("canonical_url", { length: 500 }),
  ogImageUrl: varchar("og_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SeoSetting = typeof seoSettings.$inferSelect;
export type InsertSeoSetting = typeof seoSettings.$inferInsert;

/**
 * Live stream planning and catalog.
 */
export const liveStreams = mysqlTable("live_streams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: varchar("status", { length: 50 }).default("planned").notNull(),
  link: varchar("link", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = typeof liveStreams.$inferInsert;

/**
 * Omnichannel product media library.
 */
export const productMedia = mysqlTable("product_media", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  kind: varchar("kind", { length: 20 }).notNull(), // image | video
  url: varchar("url", { length: 1000 }).notNull(),
  storageKey: varchar("storage_key", { length: 500 }),
  altText: varchar("alt_text", { length: 500 }),
  sortOrder: int("sort_order").default(0).notNull(),
  isCover: int("is_cover").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("ready").notNull(),
  metadata: text("metadata"), // JSON: dimensions, checksum, channel upload IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdx: `KEY product_media_product_idx (product_id)`,
  variantIdx: `KEY product_media_variant_idx (variant_id)`,
}));
export type ProductMedia = typeof productMedia.$inferSelect;
export type InsertProductMedia = typeof productMedia.$inferInsert;

/**
 * Sellable product variants. Each variant may have its own SKU, GTIN and stock.
 */
export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  gtin: varchar("gtin", { length: 50 }),
  mpn: varchar("mpn", { length: 100 }),
  costBase: int("cost_base").default(0),
  weightBase: int("weight_base").default(0),
  name: varchar("name", { length: 255 }),
  attributes: text("attributes"), // JSON: color, size, material, etc.
  price: int("price").default(0).notNull(),
  stock: int("stock").default(0).notNull(),
  reservedStock: int("reserved_stock").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

/** Stable identifiers for matching products across channels and suppliers. */
export const productIdentifiers = mysqlTable("product_identifiers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  identifierUnique: `UNIQUE KEY product_identifier_unique (user_id, type, value)`,
  productIdx: `KEY product_identifier_product_idx (product_id)`,
  variantIdx: `KEY product_identifier_variant_idx (variant_id)`,
}));
export type ProductIdentifier = typeof productIdentifiers.$inferSelect;
export type InsertProductIdentifier = typeof productIdentifiers.$inferInsert;

/**
 * Flexible catalog attributes for marketplace-specific requirements.
 */
export const productAttributes = mysqlTable("product_attributes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  namespace: varchar("namespace", { length: 50 }).default("catalog").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type InsertProductAttribute = typeof productAttributes.$inferInsert;

/**
 * Per-channel content and commercial overrides for a listing.
 */
export const listingChannelOverrides = mysqlTable("listing_channel_overrides", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: int("listing_id").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  price: int("price"),
  categoryId: varchar("category_id", { length: 150 }),
  attributes: text("attributes"),
  mediaIds: text("media_ids"), // JSON array
  seoKeywords: text("seo_keywords"),
  approvalStatus: varchar("approval_status", { length: 30 }).default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ListingChannelOverride = typeof listingChannelOverrides.$inferSelect;
export type InsertListingChannelOverride = typeof listingChannelOverrides.$inferInsert;

/**
 * Durable synchronization jobs. The unique idempotency key prevents duplicate work.
 */
export const syncJobs = mysqlTable("sync_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id").references(() => marketplaceConnections.id, { onDelete: "cascade" }),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(), // import_listing | publish | price | stock | order
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  payload: text("payload"),
  errorMessage: text("error_message"),
  attempts: int("attempts").default(0).notNull(),
  nextRunAt: timestamp("next_run_at").defaultNow().notNull(),
  lockedAt: timestamp("locked_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdempotencyIdx: uniqueIndex("sync_jobs_user_idempotency").on(table.userId, table.idempotencyKey),
}));
export type SyncJob = typeof syncJobs.$inferSelect;
export type InsertSyncJob = typeof syncJobs.$inferInsert;

/**
 * Incoming marketplace events, retained for deduplication and replay.
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id").notNull().references(() => marketplaceConnections.id, { onDelete: "cascade" }),
  externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 150 }).notNull(),
  payload: text("payload").notNull(),
  status: varchar("status", { length: 30 }).default("received").notNull(),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  connectionEventIdx: uniqueIndex("webhook_events_connection_event").on(table.marketplaceConnectionId, table.externalEventId),
}));
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/**
 * Product SEO and marketplace content optimization profile.
 */
export const productSeoProfiles = mysqlTable("product_seo_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).default("store").notNull(),
  slug: varchar("slug", { length: 255 }),
  seoTitle: varchar("seo_title", { length: 255 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  focusKeyword: varchar("focus_keyword", { length: 150 }),
  secondaryKeywords: text("secondary_keywords"),
  altText: varchar("alt_text", { length: 500 }),
  canonicalUrl: varchar("canonical_url", { length: 500 }),
  schemaJson: text("schema_json"),
  score: int("score").default(0).notNull(),
  issues: text("issues"),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productChannelIdx: uniqueIndex("product_seo_profiles_product_channel").on(table.productId, table.channel),
}));
export type ProductSeoProfile = typeof productSeoProfiles.$inferSelect;
export type InsertProductSeoProfile = typeof productSeoProfiles.$inferInsert;

/**
 * Internal inventory reservations used to prevent overselling while orders are pending.
 */
export const inventoryReservations = mysqlTable("inventory_reservations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
  quantity: int("quantity").notNull(),
  status: varchar("status", { length: 30 }).default("reserved").notNull(),
  expiresAt: timestamp("expires_at"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type InsertInventoryReservation = typeof inventoryReservations.$inferInsert;

/** Immutable inventory ledger for entradas, vendas, reservas, devoluções and adjustments. */
export const inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
  type: varchar("type", { length: 30 }).notNull(),
  quantity: int("quantity").notNull(),
  reason: varchar("reason", { length: 255 }),
  reference: varchar("reference", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  movementProductIdx: `KEY inventory_movement_product_idx (product_id, variant_id, created_at)`,
  movementUserIdx: `KEY inventory_movement_user_idx (user_id, type, created_at)`,
}));
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

/** Configurable category mapping from the Luary catalog to an external marketplace. */
export const marketplaceCategoryMappings = mysqlTable("marketplace_category_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
  internalCategory: varchar("internal_category", { length: 150 }).notNull(),
  externalCategoryId: varchar("external_category_id", { length: 150 }).notNull(),
  externalCategoryName: varchar("external_category_name", { length: 255 }),
  attributesSchema: text("attributes_schema"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryUnique: uniqueIndex("marketplace_category_mapping_unique").on(table.userId, table.marketplaceType, table.internalCategory),
}));
export type MarketplaceCategoryMapping = typeof marketplaceCategoryMappings.$inferSelect;
export type InsertMarketplaceCategoryMapping = typeof marketplaceCategoryMappings.$inferInsert;

/** Configurable attribute name/value mapping for an external marketplace. */
export const marketplaceAttributeMappings = mysqlTable("marketplace_attribute_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
  sourceName: varchar("source_name", { length: 150 }).notNull(),
  externalName: varchar("external_name", { length: 150 }).notNull(),
  valueMap: text("value_map"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  attributeUnique: uniqueIndex("marketplace_attribute_mapping_unique").on(table.userId, table.marketplaceType, table.sourceName),
}));
export type MarketplaceAttributeMapping = typeof marketplaceAttributeMappings.$inferSelect;
export type InsertMarketplaceAttributeMapping = typeof marketplaceAttributeMappings.$inferInsert;

export const publicationPreflightResults = mysqlTable("publication_preflight_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  score: int("score").default(0).notNull(),
  issues: text("issues").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PublicationPreflightResult = typeof publicationPreflightResults.$inferSelect;
export type InsertPublicationPreflightResult = typeof publicationPreflightResults.$inferInsert;


/** Approved supplier sources for hybrid supply and dropshipping operations. */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  document: varchar("document", { length: 50 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  status: varchar("status", { length: 30 }).default("pending_review").notNull(),
  rating: int("rating_bp").default(0).notNull(),
  defaultShippingDays: int("default_shipping_days").default(0).notNull(),
  returnPolicy: text("return_policy"),
  dropshippingEnabled: int("dropshipping_enabled").default(0).notNull(),
  crossDockingEnabled: int("cross_docking_enabled").default(0).notNull(),
  apiEnabled: int("api_enabled").default(0).notNull(),
  feedEnabled: int("feed_enabled").default(0).notNull(),
  integrationType: varchar("integration_type", { length: 30 }).default("manual").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierUserIdx: `KEY suppliers_user_idx (user_id, status)`,
}));
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/** Encrypted supplier integration credentials and synchronization state. */
export const supplierIntegrations = mysqlTable("supplier_integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).default("inactive").notNull(),
  encryptedCredentials: text("encrypted_credentials"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierIntegrationUnique: uniqueIndex("supplier_integrations_user_supplier_type").on(table.userId, table.supplierId, table.type),
}));
export type SupplierIntegration = typeof supplierIntegrations.$inferSelect;
export type InsertSupplierIntegration = typeof supplierIntegrations.$inferInsert;

/** Supplier catalog rows; never replaces the Luary Product Master. */
export const supplierProducts = mysqlTable("supplier_products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  internalCode: varchar("internal_code", { length: 100 }),
  ean: varchar("ean", { length: 50 }),
  gtin: varchar("gtin", { length: 50 }),
  mpn: varchar("mpn", { length: 100 }),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 150 }),
  costCents: int("cost_cents").default(0).notNull(),
  shippingCostCents: int("shipping_cost_cents").default(0).notNull(),
  stock: int("stock").default(0).notNull(),
  weightGrams: int("weight_grams").default(0).notNull(),
  widthMm: int("width_mm").default(0).notNull(),
  heightMm: int("height_mm").default(0).notNull(),
  lengthMm: int("length_mm").default(0).notNull(),
  images: text("images"),
  videos: text("videos"),
  attributes: text("attributes"),
  category: varchar("category", { length: 150 }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierExternalUnique: uniqueIndex("supplier_products_supplier_external").on(table.userId, table.supplierId, table.externalId),
  supplierProductUserIdx: `KEY supplier_products_user_status_idx (user_id, status)`,
}));
export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type InsertSupplierProduct = typeof supplierProducts.$inferInsert;

/** Human-reviewed supplier product to Product Master relationship. */
export const supplierProductMappings = mysqlTable("supplier_product_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").notNull().references(() => supplierProducts.id, { onDelete: "cascade" }),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  confidence: int("confidence").default(0).notNull(),
  matchType: varchar("match_type", { length: 30 }).default("unmatched").notNull(),
  status: varchar("status", { length: 30 }).default("pending_review").notNull(),
  reviewedBy: int("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierProductMappingUnique: uniqueIndex("supplier_product_mapping_unique").on(table.userId, table.supplierProductId),
  supplierMappingProductIdx: `KEY supplier_product_mapping_product_idx (product_id, status)`,
}));
export type SupplierProductMapping = typeof supplierProductMappings.$inferSelect;
export type InsertSupplierProductMapping = typeof supplierProductMappings.$inferInsert;

/** Product-level sourcing and safety policy; priority 0 is primary, larger values are backups. */
export const supplyRoutingPolicies = mysqlTable("supply_routing_policies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  priority: int("priority").default(0).notNull(),
  fulfillmentMode: varchar("fulfillment_mode", { length: 30 }).default("dropshipping").notNull(),
  supplierStockBuffer: int("supplier_stock_buffer").default(0).notNull(),
  staleAfterMinutes: int("stale_after_minutes").default(120).notNull(),
  blockAfterStaleMinutes: int("block_after_stale_minutes").default(1440).notNull(),
  minimumMarginBp: int("minimum_margin_bp").default(0).notNull(),
  autoFulfillmentAllowed: int("auto_fulfillment_allowed").default(0).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplyRoutingUnique: uniqueIndex("supply_routing_product_supplier").on(table.userId, table.productId, table.supplierId),
  supplyRoutingPriorityIdx: `KEY supply_routing_priority_idx (user_id, product_id, priority)`,
}));
export type SupplyRoutingPolicy = typeof supplyRoutingPolicies.$inferSelect;
export type InsertSupplyRoutingPolicy = typeof supplyRoutingPolicies.$inferInsert;

export const supplierPriceHistory = mysqlTable("supplier_price_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").notNull().references(() => supplierProducts.id, { onDelete: "cascade" }),
  costCents: int("cost_cents").notNull(),
  shippingCostCents: int("shipping_cost_cents").default(0).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});
export type SupplierPriceHistory = typeof supplierPriceHistory.$inferSelect;
export type InsertSupplierPriceHistory = typeof supplierPriceHistory.$inferInsert;

export const supplierInventoryHistory = mysqlTable("supplier_inventory_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").notNull().references(() => supplierProducts.id, { onDelete: "cascade" }),
  stock: int("stock").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});
export type SupplierInventoryHistory = typeof supplierInventoryHistory.$inferSelect;
export type InsertSupplierInventoryHistory = typeof supplierInventoryHistory.$inferInsert;

export const supplyAlerts = mysqlTable("supply_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  supplierProductId: int("supplier_product_id").references(() => supplierProducts.id, { onDelete: "set null" }),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("warning").notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
export type SupplyAlert = typeof supplyAlerts.$inferSelect;
export type InsertSupplyAlert = typeof supplyAlerts.$inferInsert;

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  subtotalCents: int("subtotal_cents").default(0).notNull(),
  shippingCents: int("shipping_cents").default(0).notNull(),
  totalCents: int("total_cents").default(0).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  trackingCode: varchar("tracking_code", { length: 255 }),
  carrier: varchar("carrier", { length: 150 }),
  invoiceReference: varchar("invoice_reference", { length: 255 }),
  fiscalMode: varchar("fiscal_mode", { length: 30 }).default("not_defined").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  purchaseOrderUserIdx: `KEY purchase_orders_user_status_idx (user_id, status)`,
  purchaseOrderExternalUnique: uniqueIndex("purchase_orders_supplier_external").on(table.userId, table.supplierId, table.externalId),
}));
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").references(() => supplierProducts.id, { onDelete: "set null" }),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  sku: varchar("sku", { length: 100 }),
  quantity: int("quantity").default(1).notNull(),
  unitCostCents: int("unit_cost_cents").default(0).notNull(),
  totalCostCents: int("total_cost_cents").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

export const fulfillmentGroups = mysqlTable("fulfillment_groups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: int("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  mode: varchar("mode", { length: 30 }).default("own_stock").notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  trackingCode: varchar("tracking_code", { length: 255 }),
  carrier: varchar("carrier", { length: 150 }),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type FulfillmentGroup = typeof fulfillmentGroups.$inferSelect;
export type InsertFulfillmentGroup = typeof fulfillmentGroups.$inferInsert;

export const fulfillmentGroupItems = mysqlTable("fulfillment_group_items", {
  id: int("id").autoincrement().primaryKey(),
  fulfillmentGroupId: int("fulfillment_group_id").notNull().references(() => fulfillmentGroups.id, { onDelete: "cascade" }),
  orderItemId: int("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type FulfillmentGroupItem = typeof fulfillmentGroupItems.$inferSelect;
export type InsertFulfillmentGroupItem = typeof fulfillmentGroupItems.$inferInsert;

export const returnRequests = mysqlTable("return_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: int("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 30 }).default("requested").notNull(),
  supplierResponsibility: int("supplier_responsibility").default(0).notNull(),
  marketplaceResponsibility: int("marketplace_responsibility").default(0).notNull(),
  refundAmountCents: int("refund_amount_cents").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ReturnRequest = typeof returnRequests.$inferSelect;
export type InsertReturnRequest = typeof returnRequests.$inferInsert;

export const supplierHealthSnapshots = mysqlTable("supplier_health_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  reliabilityBp: int("reliability_bp").default(0).notNull(),
  averageShippingDays: int("average_shipping_days").default(0).notNull(),
  delayCount: int("delay_count").default(0).notNull(),
  cancellationCount: int("cancellation_count").default(0).notNull(),
  returnCount: int("return_count").default(0).notNull(),
  trackingCoverageBp: int("tracking_coverage_bp").default(0).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});
export type SupplierHealthSnapshot = typeof supplierHealthSnapshots.$inferSelect;
export type InsertSupplierHealthSnapshot = typeof supplierHealthSnapshots.$inferInsert;
