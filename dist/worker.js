// server/worker.ts
import "dotenv/config";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var marketplaceConnections = mysqlTable(
  "marketplace_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
    // 'mercadolivre', 'shopee', 'amazon', 'tiktok', etc
    isConnected: int("is_connected").default(0).notNull(),
    // 0 = false, 1 = true
    accessToken: text("access_token"),
    // encrypted
    refreshToken: text("refresh_token"),
    // encrypted
    tokenExpiresAt: timestamp("token_expires_at"),
    sellerId: varchar("seller_id", { length: 255 }),
    // marketplace-specific seller ID
    sellerName: varchar("seller_name", { length: 255 }),
    clientId: varchar("client_id", { length: 255 }),
    // stored for reference
    clientSecret: text("client_secret"),
    // encrypted
    webhookUrl: varchar("webhook_url", { length: 500 }),
    webhookSecret: text("webhook_secret"),
    // encrypted
    lastSyncAt: timestamp("last_sync_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    syncStatus: varchar("sync_status", { length: 50 }).default("idle"),
    // 'idle', 'syncing', 'error'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({
    userMarketplaceIdx: `UNIQUE KEY user_mkt_idx (user_id, marketplace_type)`
  })
);
var salesChannels = mysqlTable("sales_channels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  // "Mercado Livre", "Loja Própria", "Instagram"...
  marketplaceType: varchar("marketplace_type", { length: 50 }),
  // liga com marketplace_connections, se aplicável
  commissionBp: int("commission_bp").default(0).notNull(),
  // comissão, em pontos-base (1250 = 12,50%)
  fixedFeeCents: int("fixed_fee_cents").default(0).notNull(),
  // taxa fixa por venda, em centavos
  shippingCostCents: int("shipping_cost_cents").default(0).notNull(),
  // frete médio pago pelo vendedor, em centavos
  taxBp: int("tax_bp").default(0).notNull(),
  // imposto, em pontos-base
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var products = mysqlTable("products", {
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
  costBase: int("cost_base").default(0),
  // in cents
  basePrice: int("base_price").default(0),
  // sale price in cents; never derived directly from costBase
  weightBase: int("weight_base").default(0),
  // in grams
  height: int("height").default(0),
  // millimeters
  width: int("width").default(0),
  // millimeters
  length: int("length").default(0),
  // millimeters
  ncm: varchar("ncm", { length: 20 }),
  cest: varchar("cest", { length: 20 }),
  origin: varchar("origin", { length: 30 }),
  mpn: varchar("mpn", { length: 100 }),
  marginTarget: int("margin_target").default(0),
  // percentage or fixed value in cents
  marginType: varchar("margin_type", { length: 20 }).default("perc"),
  // 'perc' or 'fixed'
  stock: int("stock").default(0),
  minStock: int("min_stock").default(0),
  photoUrl: varchar("photo_url", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"),
  // 'active', 'inactive', 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var marketplaceListings = mysqlTable(
  "marketplace_listings",
  {
    id: int("id").autoincrement().primaryKey(),
    marketplaceConnectionId: int("marketplace_connection_id").notNull(),
    productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    marketplaceListingId: varchar("marketplace_listing_id", { length: 255 }).notNull(),
    // external ID from marketplace
    title: varchar("title", { length: 500 }),
    description: text("description"),
    price: int("price").default(0),
    // in cents
    stock: int("stock").default(0),
    status: varchar("status", { length: 50 }).default("active"),
    // 'active', 'inactive', 'paused', 'sold_out'
    listingUrl: varchar("listing_url", { length: 500 }),
    lastPublishedAt: timestamp("last_published_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({
    marketplaceListingIdx: `UNIQUE KEY mkt_listing_idx (marketplace_connection_id, marketplace_listing_id)`,
    productIdx: `KEY product_idx (product_id)`,
    variantIdx: `KEY marketplace_listing_variant_idx (variant_id)`
    // Nota: a FK de marketplace_connection_id (nome curto "mkt_listings_conn_fk") é
    // adicionada manualmente no arquivo de migration, pois o nome automático do
    // drizzle passava de 64 caracteres (limite do MySQL/MariaDB).
  })
);
var listingImportStaging = mysqlTable("listing_import_staging", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id").notNull().references(() => marketplaceConnections.id, { onDelete: "cascade" }),
  externalListingId: varchar("external_listing_id", { length: 255 }).notNull(),
  payload: text("payload").notNull(),
  normalizedTitle: varchar("normalized_title", { length: 500 }),
  suggestedProductId: int("suggested_product_id").references(() => products.id, { onDelete: "set null" }),
  matchConfidence: int("match_confidence").default(0).notNull(),
  matchClass: varchar("match_class", { length: 20 }).default("unmatched").notNull(),
  // exact | probable | conflict | unmatched
  matchReason: varchar("match_reason", { length: 50 }),
  matchEvidence: text("match_evidence"),
  // JSON: matched/conflicting fields
  matchCandidates: text("match_candidates"),
  // JSON: ranked candidates and score gap
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  stagingUnique: `UNIQUE KEY listing_staging_unique (marketplace_connection_id, external_listing_id)`,
  userIdx: `KEY listing_staging_user_idx (user_id, status)`
}));
var orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceConnectionId: int("marketplace_connection_id").notNull().references(() => marketplaceConnections.id, { onDelete: "cascade" }),
    marketplaceOrderId: varchar("marketplace_order_id", { length: 255 }).notNull(),
    buyerName: varchar("buyer_name", { length: 255 }),
    buyerEmail: varchar("buyer_email", { length: 320 }),
    totalAmount: int("total_amount").default(0),
    // in cents
    status: varchar("status", { length: 50 }).default("pending"),
    // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
    orderDate: timestamp("order_date"),
    shippingAddress: text("shipping_address"),
    // JSON
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({
    marketplaceOrderIdx: `UNIQUE KEY mkt_order_idx (marketplace_connection_id, marketplace_order_id)`,
    userIdx: `KEY user_idx (user_id)`
  })
);
var orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    marketplaceItemId: varchar("marketplace_item_id", { length: 255 }),
    title: varchar("title", { length: 255 }),
    quantity: int("quantity").default(1),
    unitPrice: int("unit_price").default(0),
    // in cents
    totalPrice: int("total_price").default(0),
    // in cents
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    orderIdx: `KEY order_idx (order_id)`
  })
);
var syncLogs = mysqlTable(
  "sync_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceConnectionId: int("marketplace_connection_id"),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
    syncType: varchar("sync_type", { length: 50 }).notNull(),
    // 'product_publish', 'product_update', 'stock_sync', 'price_update', 'order_import'
    status: varchar("status", { length: 50 }).notNull(),
    // 'success', 'failed', 'pending', 'retrying'
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    retryCount: int("retry_count").default(0),
    maxRetries: int("max_retries").default(3),
    metadata: text("metadata"),
    // JSON with additional context
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({
    userIdx: `KEY user_idx (user_id)`,
    marketplaceIdx: `KEY marketplace_idx (marketplace_connection_id)`,
    productIdx: `KEY product_idx (product_id)`,
    syncTypeIdx: `KEY sync_type_idx (sync_type, status)`
    // Nota: a FK de marketplace_connection_id (nome curto "sync_logs_conn_fk") é
    // adicionada manualmente no arquivo de migration, pelo mesmo motivo acima.
  })
);
var syncConflicts = mysqlTable("sync_conflicts", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  conflictUserIdx: `KEY sync_conflict_user_idx (user_id, status, severity)`
}));
var auditLogs = mysqlTable("audit_logs", {
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
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  auditUserIdx: `KEY audit_user_idx (user_id, created_at)`,
  auditEntityIdx: `KEY audit_entity_idx (entity, entity_id, created_at)`
}));
var insumos = mysqlTable("insumos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  internalCode: varchar("internal_code", { length: 100 }),
  cost: int("cost").default(0),
  // in cents
  weight: int("weight").default(0),
  // in grams
  stock: int("stock").default(0),
  minStock: int("min_stock").default(0),
  idealStock: int("ideal_stock").default(0),
  addToPlating: int("add_to_plating").default(0),
  // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var banhos = mysqlTable("banhos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  metal: varchar("metal", { length: 100 }),
  color: varchar("color", { length: 100 }),
  milesimos: int("milesimos").default(0),
  // thousandths
  quotation: int("quotation").default(0),
  // in cents
  operationalTax: int("operational_tax").default(0),
  // percentage
  labor: int("labor").default(0),
  // in cents
  technicalLoss: int("technical_loss").default(0),
  // percentage
  technicalMargin: int("technical_margin").default(0),
  // percentage
  pricePerGram: int("price_per_gram").default(0),
  // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var kits = mysqlTable("kits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  costBase: int("cost_base").default(0),
  // in cents
  weightBase: int("weight_base").default(0),
  // in grams
  marginTarget: int("margin_target").default(0),
  marginType: varchar("margin_type", { length: 20 }).default("perc"),
  stock: int("stock").default(0),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var kitItems = mysqlTable("kit_items", {
  id: int("id").autoincrement().primaryKey(),
  kitId: int("kit_id").notNull().references(() => kits.id, { onDelete: "cascade" }),
  productId: int("product_id").references(() => products.id, { onDelete: "cascade" }),
  insumoId: int("insumo_id").references(() => insumos.id, { onDelete: "cascade" }),
  quantity: int("quantity").default(1).notNull(),
  unitCost: int("unit_cost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var financeiro = mysqlTable("financeiro", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  // 'income', 'expense'
  amount: int("amount").default(0),
  // in cents
  date: timestamp("date").defaultNow(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var seoSettings = mysqlTable("seo_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageKey: varchar("page_key", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  keywords: varchar("keywords", { length: 500 }),
  canonicalUrl: varchar("canonical_url", { length: 500 }),
  ogImageUrl: varchar("og_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var liveStreams = mysqlTable("live_streams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: varchar("status", { length: 50 }).default("planned").notNull(),
  link: varchar("link", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var productMedia = mysqlTable("product_media", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  kind: varchar("kind", { length: 20 }).notNull(),
  // image | video
  url: varchar("url", { length: 1e3 }).notNull(),
  storageKey: varchar("storage_key", { length: 500 }),
  altText: varchar("alt_text", { length: 500 }),
  sortOrder: int("sort_order").default(0).notNull(),
  isCover: int("is_cover").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("ready").notNull(),
  metadata: text("metadata"),
  // JSON: dimensions, checksum, channel upload IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  productIdx: `KEY product_media_product_idx (product_id)`,
  variantIdx: `KEY product_media_variant_idx (variant_id)`
}));
var productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  gtin: varchar("gtin", { length: 50 }),
  mpn: varchar("mpn", { length: 100 }),
  costBase: int("cost_base").default(0),
  weightBase: int("weight_base").default(0),
  name: varchar("name", { length: 255 }),
  attributes: text("attributes"),
  // JSON: color, size, material, etc.
  price: int("price").default(0).notNull(),
  stock: int("stock").default(0).notNull(),
  reservedStock: int("reserved_stock").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var productIdentifiers = mysqlTable("product_identifiers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  identifierUnique: `UNIQUE KEY product_identifier_unique (user_id, type, value)`,
  productIdx: `KEY product_identifier_product_idx (product_id)`,
  variantIdx: `KEY product_identifier_variant_idx (variant_id)`
}));
var productAttributes = mysqlTable("product_attributes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  namespace: varchar("namespace", { length: 50 }).default("catalog").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var listingChannelOverrides = mysqlTable("listing_channel_overrides", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: int("listing_id").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  price: int("price"),
  categoryId: varchar("category_id", { length: 150 }),
  attributes: text("attributes"),
  mediaIds: text("media_ids"),
  // JSON array
  seoKeywords: text("seo_keywords"),
  approvalStatus: varchar("approval_status", { length: 30 }).default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var syncJobs = mysqlTable("sync_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id").references(() => marketplaceConnections.id, { onDelete: "cascade" }),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(),
  // import_listing | publish | price | stock | order
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  payload: text("payload"),
  errorMessage: text("error_message"),
  attempts: int("attempts").default(0).notNull(),
  nextRunAt: timestamp("next_run_at").defaultNow().notNull(),
  lockedAt: timestamp("locked_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  userIdempotencyIdx: uniqueIndex("sync_jobs_user_idempotency").on(table.userId, table.idempotencyKey)
}));
var webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceConnectionId: int("marketplace_connection_id").notNull().references(() => marketplaceConnections.id, { onDelete: "cascade" }),
  externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 150 }).notNull(),
  payload: text("payload").notNull(),
  status: varchar("status", { length: 30 }).default("received").notNull(),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  connectionEventIdx: uniqueIndex("webhook_events_connection_event").on(table.marketplaceConnectionId, table.externalEventId)
}));
var productSeoProfiles = mysqlTable("product_seo_profiles", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  productChannelIdx: uniqueIndex("product_seo_profiles_product_channel").on(table.productId, table.channel)
}));
var inventoryReservations = mysqlTable("inventory_reservations", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
  type: varchar("type", { length: 30 }).notNull(),
  quantity: int("quantity").notNull(),
  reason: varchar("reason", { length: 255 }),
  reference: varchar("reference", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  movementProductIdx: `KEY inventory_movement_product_idx (product_id, variant_id, created_at)`,
  movementUserIdx: `KEY inventory_movement_user_idx (user_id, type, created_at)`
}));
var marketplaceCategoryMappings = mysqlTable("marketplace_category_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
  internalCategory: varchar("internal_category", { length: 150 }).notNull(),
  externalCategoryId: varchar("external_category_id", { length: 150 }).notNull(),
  externalCategoryName: varchar("external_category_name", { length: 255 }),
  attributesSchema: text("attributes_schema"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  categoryUnique: uniqueIndex("marketplace_category_mapping_unique").on(table.userId, table.marketplaceType, table.internalCategory)
}));
var marketplaceAttributeMappings = mysqlTable("marketplace_attribute_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
  sourceName: varchar("source_name", { length: 150 }).notNull(),
  externalName: varchar("external_name", { length: 150 }).notNull(),
  valueMap: text("value_map"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  attributeUnique: uniqueIndex("marketplace_attribute_mapping_unique").on(table.userId, table.marketplaceType, table.sourceName)
}));
var publicationPreflightResults = mysqlTable("publication_preflight_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  score: int("score").default(0).notNull(),
  issues: text("issues").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var suppliers = mysqlTable("suppliers", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  supplierUserIdx: `KEY suppliers_user_idx (user_id, status)`
}));
var supplierIntegrations = mysqlTable("supplier_integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).default("inactive").notNull(),
  encryptedCredentials: text("encrypted_credentials"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  supplierIntegrationUnique: uniqueIndex("supplier_integrations_user_supplier_type").on(table.userId, table.supplierId, table.type)
}));
var supplierProducts = mysqlTable("supplier_products", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  supplierExternalUnique: uniqueIndex("supplier_products_supplier_external").on(table.userId, table.supplierId, table.externalId),
  supplierProductUserIdx: `KEY supplier_products_user_status_idx (user_id, status)`
}));
var supplierProductMappings = mysqlTable("supplier_product_mappings", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  supplierProductMappingUnique: uniqueIndex("supplier_product_mapping_unique").on(table.userId, table.supplierProductId),
  supplierMappingProductIdx: `KEY supplier_product_mapping_product_idx (product_id, status)`
}));
var supplyRoutingPolicies = mysqlTable("supply_routing_policies", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  supplyRoutingUnique: uniqueIndex("supply_routing_product_supplier").on(table.userId, table.productId, table.supplierId),
  supplyRoutingPriorityIdx: `KEY supply_routing_priority_idx (user_id, product_id, priority)`
}));
var supplierPriceHistory = mysqlTable("supplier_price_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").notNull().references(() => supplierProducts.id, { onDelete: "cascade" }),
  costCents: int("cost_cents").notNull(),
  shippingCostCents: int("shipping_cost_cents").default(0).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull()
});
var supplierInventoryHistory = mysqlTable("supplier_inventory_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").notNull().references(() => supplierProducts.id, { onDelete: "cascade" }),
  stock: int("stock").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull()
});
var supplyAlerts = mysqlTable("supply_alerts", {
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
  resolvedAt: timestamp("resolved_at")
});
var purchaseOrders = mysqlTable("purchase_orders", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  purchaseOrderUserIdx: `KEY purchase_orders_user_status_idx (user_id, status)`,
  purchaseOrderExternalUnique: uniqueIndex("purchase_orders_supplier_external").on(table.userId, table.supplierId, table.externalId)
}));
var purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  supplierProductId: int("supplier_product_id").references(() => supplierProducts.id, { onDelete: "set null" }),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: int("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  sku: varchar("sku", { length: 100 }),
  quantity: int("quantity").default(1).notNull(),
  unitCostCents: int("unit_cost_cents").default(0).notNull(),
  totalCostCents: int("total_cost_cents").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var fulfillmentGroups = mysqlTable("fulfillment_groups", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var fulfillmentGroupItems = mysqlTable("fulfillment_group_items", {
  id: int("id").autoincrement().primaryKey(),
  fulfillmentGroupId: int("fulfillment_group_id").notNull().references(() => fulfillmentGroups.id, { onDelete: "cascade" }),
  orderItemId: int("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var returnRequests = mysqlTable("return_requests", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
});
var supplierHealthSnapshots = mysqlTable("supplier_health_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  reliabilityBp: int("reliability_bp").default(0).notNull(),
  averageShippingDays: int("average_shipping_days").default(0).notNull(),
  delayCount: int("delay_count").default(0).notNull(),
  cancellationCount: int("cancellation_count").default(0).notNull(),
  returnCount: int("return_count").default(0).notNull(),
  trackingCoverageBp: int("tracking_coverage_bp").default(0).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID || "luary-shop-local",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "owner-local",
  ownerName: process.env.OWNER_NAME ?? "Admin",
  publicStoreUserId: Number(process.env.PUBLIC_STORE_USER_ID || 0),
  publicStoreUrl: process.env.PUBLIC_STORE_URL || "http://localhost:3000",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// server/services/syncJobService.ts
import { and as and8, eq as eq9, lte } from "drizzle-orm";

// server/services/productSyncService.ts
import { and as and5, eq as eq6 } from "drizzle-orm";

// server/services/mediaResolver.ts
import { and, eq as eq2 } from "drizzle-orm";
async function resolveProductMedia(userId, productId, variantId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(productMedia).where(and(
    eq2(productMedia.userId, userId),
    eq2(productMedia.productId, productId),
    eq2(productMedia.status, "ready"),
    ...variantId ? [eq2(productMedia.variantId, variantId)] : []
  )).orderBy(productMedia.sortOrder);
  return rows.filter((row) => row.url.trim().length > 0 && (row.kind === "image" || row.kind === "video")).map((row) => ({ kind: row.kind, url: row.url, altText: row.altText ?? void 0, variantId: row.variantId }));
}
function validatePublicationMedia(media) {
  const images = media.filter((item) => item.kind === "image").map((item) => item.url);
  const videos = media.filter((item) => item.kind === "video").map((item) => item.url);
  const issues = [];
  if (images.length === 0) issues.push("Cadastre pelo menos uma imagem pronta no cat\xE1logo");
  if (images.length > 20) issues.push("O cat\xE1logo excede o limite interno de 20 imagens por oferta");
  return { ok: issues.length === 0, issues, images, videos };
}

// server/services/publicationPreflightService.ts
import { and as and3, eq as eq4 } from "drizzle-orm";

// server/services/marketplaceService.ts
import { eq as eq3, and as and2 } from "drizzle-orm";

// server/services/encryption.ts
import crypto from "crypto";
var ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-32-chars-minimum-";
var IV_LENGTH = 16;
function encryptData(plaintext) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}
function decryptData(encryptedData) {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const parts = encryptedData.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}

// server/adapters/MercadoLivreAdapter.ts
import crypto2 from "crypto";

// server/adapters/BaseAdapter.ts
import axios from "axios";
var BaseMarketplaceAdapter = class {
  credentials;
  httpClient;
  baseUrl;
  constructor(credentials, baseUrl) {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 3e4
    });
  }
  /**
   * Set authorization header for API requests
   */
  setAuthHeader(accessToken) {
    this.httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  }
  /**
   * Clear authorization header
   */
  clearAuthHeader() {
    delete this.httpClient.defaults.headers.common["Authorization"];
  }
  /**
   * Handle API errors consistently
   */
  handleApiError(error, context) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const status = error.response?.status;
      throw new Error(`[${context}] ${status}: ${message}`);
    }
    throw new Error(`[${context}] ${error instanceof Error ? error.message : String(error)}`);
  }
  async listListings(_accessToken, _filters) {
    throw new Error("This marketplace adapter does not implement listing import yet");
  }
  async pauseListing(_accessToken, _payload) {
    throw new Error("This marketplace adapter does not implement listing pause yet");
  }
  async getListingStatus(_accessToken, _listingId) {
    throw new Error("This marketplace adapter does not implement listing status lookup yet");
  }
};

// server/services/marketplaceSafetyService.ts
function getMarketplaceMode() {
  return String(process.env.MARKETPLACE_MODE || "READ_ONLY").toLowerCase() === "live" ? "live" : "read_only";
}
function assertMarketplaceWriteEnabled(operation, marketplaceType) {
  if (getMarketplaceMode() !== "live") {
    const channel = marketplaceType ? ` no canal ${marketplaceType}` : "";
    throw new Error(`MARKETPLACE_MODE=READ_ONLY bloqueou ${operation}${channel}. Ative o modo live explicitamente ap\xF3s a homologa\xE7\xE3o.`);
  }
}

// server/adapters/MercadoLivreAdapter.ts
import axios2 from "axios";
var MercadoLivreAdapter = class extends BaseMarketplaceAdapter {
  authUrl = "https://auth.mercadolibre.com.br";
  apiUrl = "https://api.mercadolibre.com";
  constructor(credentials) {
    super(credentials, "https://api.mercadolibre.com");
  }
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      state
    });
    return `${this.authUrl}/authorization?${params.toString()}`;
  }
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const response = await axios2.post(`${this.authUrl}/oauth/token`, {
        grant_type: "authorization_code",
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        redirect_uri: this.credentials.redirectUri
      });
      const expiresIn = response.data.expires_in || 21600;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.exchangeCodeForTokens");
    }
  }
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios2.post(`${this.authUrl}/oauth/token`, {
        grant_type: "refresh_token",
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: refreshToken
      });
      const expiresIn = response.data.expires_in || 21600;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.refreshAccessToken");
    }
  }
  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/users/me");
      return {
        sellerId: response.data.id.toString(),
        sellerName: response.data.nickname || response.data.first_name
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.validateAndGetSellerInfo");
    }
  }
  /**
   * List existing seller listings for safe import/linking.
   */
  async listListings(accessToken, filters) {
    try {
      this.setAuthHeader(accessToken);
      const seller = await this.validateAndGetSellerInfo(accessToken);
      const limit = Math.min(filters?.limit ?? 50, 100);
      const status = filters?.status && filters.status !== "all" ? filters.status : void 0;
      const search = await this.httpClient.get(`/users/${seller.sellerId}/items/search`, {
        params: { limit, status }
      });
      const ids = (search.data.results ?? []).slice(0, limit);
      const details = await Promise.all(ids.map((id) => this.httpClient.get(`/items/${id}`)));
      return details.map(({ data }) => ({
        listingId: String(data.id),
        title: data.title ?? "",
        description: data.descriptions?.[0]?.plain_text,
        sku: data.seller_custom_field ?? data.seller_sku,
        gtin: data.attributes?.find((attribute) => ["GTIN", "EAN"].includes(attribute.id))?.value_name,
        price: typeof data.price === "number" ? Math.round(data.price * 100) : void 0,
        stock: data.available_quantity,
        status: data.status === "active" ? "active" : data.status === "paused" ? "paused" : "inactive",
        categoryId: data.category_id,
        brand: data.attributes?.find((attribute) => attribute.id === "BRAND")?.value_name,
        images: (data.pictures ?? []).map((picture) => picture.secure_url ?? picture.url).filter(Boolean),
        attributes: Object.fromEntries((data.attributes ?? []).map((attribute) => [attribute.id, attribute.value_name ?? ""])),
        raw: data
      }));
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.listListings");
    }
  }
  /**
   * Publish a product to Mercado Livre
   */
  async publishProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      const sellerInfo = await this.validateAndGetSellerInfo(accessToken);
      if (!payload.category?.trim()) throw new Error("Mercado Livre exige categoryId mapeado antes da publica\xE7\xE3o");
      const itemPayload = {
        title: payload.title,
        category_id: payload.category,
        price: payload.price / 100,
        // Convert cents to currency
        currency_id: "BRL",
        available_quantity: payload.stock,
        buying_mode: "buy_it_now",
        condition: "new",
        description: {
          plain_text: payload.description
        },
        pictures: payload.images.map((url) => ({ source: url })),
        attributes: this.mapAttributesToML(payload.attributes || {})
      };
      const response = await this.httpClient.post(`/items`, itemPayload);
      return {
        listingId: response.data.id,
        listingUrl: response.data.permalink,
        publishedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.publishProduct");
    }
  }
  /**
   * Update an existing product
   */
  async updateProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      const updateData = {};
      if (payload.title) updateData.title = payload.title;
      if (payload.description) updateData.description = { plain_text: payload.description };
      if (payload.price) updateData.price = payload.price / 100;
      if (payload.stock !== void 0) updateData.available_quantity = payload.stock;
      if (payload.images) updateData.pictures = payload.images.map((url) => ({ source: url }));
      await this.httpClient.put(`/items/${payload.listingId}`, updateData);
      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.updateProduct");
    }
  }
  /**
   * Update product price
   */
  async updatePrice(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.put(`/items/${payload.listingId}`, {
        price: payload.price / 100
      });
      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.updatePrice");
    }
  }
  /**
   * Update product stock
   */
  async updateStock(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.put(`/items/${payload.listingId}`, {
        available_quantity: payload.stock
      });
      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.updateStock");
    }
  }
  /**
   * Get orders from Mercado Livre
   */
  async getOrders(accessToken, filters) {
    try {
      this.setAuthHeader(accessToken);
      const params = new URLSearchParams({
        sort: "date_desc",
        limit: "50"
      });
      if (filters?.since) {
        params.append("created_after", filters.since.toISOString());
      }
      const response = await this.httpClient.get(`/orders/search?${params.toString()}`);
      return response.data.orders.map((order) => this.parseMLOrder(order));
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.getOrders");
    }
  }
  /**
   * Get a specific order
   */
  async getOrder(accessToken, orderId) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/orders/${orderId}`);
      return this.parseMLOrder(response.data);
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.getOrder");
    }
  }
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const hash = crypto2.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  }
  /**
   * Pause or activate a listing
   */
  async pauseListing(accessToken, payload) {
    try {
      assertMarketplaceWriteEnabled(payload.paused ? "pausa de an\xFAncio" : "ativa\xE7\xE3o de an\xFAncio", "mercadolivre");
      this.setAuthHeader(accessToken);
      const status = payload.paused ? "closed" : "active";
      await this.httpClient.put(`/items/${payload.listingId}`, {
        status
      });
      return {
        listingId: payload.listingId,
        status: payload.paused ? "paused" : "active",
        updatedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.pauseListing");
    }
  }
  /**
   * Get listing status
   */
  async getListingStatus(accessToken, listingId) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/items/${listingId}`);
      const status = response.data.status === "active" ? "active" : "paused";
      return {
        listingId,
        status,
        updatedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.getListingStatus");
    }
  }
  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const data = payload;
    const resource = data.resource;
    if (resource?.includes("order")) {
      return { type: "order_update", data: payload };
    }
    if (resource?.includes("item")) {
      return { type: "item_update", data: payload };
    }
    return null;
  }
  /**
   * Helper: Map generic attributes to Mercado Livre attributes
   */
  mapAttributesToML(attributes) {
    return Object.entries(attributes).filter(([id, value]) => id.trim() && value.trim()).map(([id, value]) => ({ id: id.toUpperCase(), value_name: value }));
  }
  /**
   * Helper: Parse Mercado Livre order response
   */
  parseMLOrder(mlOrder) {
    return {
      orderId: mlOrder.id.toString(),
      buyerName: mlOrder.buyer?.nickname || "Unknown",
      buyerEmail: mlOrder.buyer?.email,
      totalAmount: Math.round(mlOrder.total_amount * 100),
      // Convert to cents
      status: mlOrder.status,
      orderDate: new Date(mlOrder.date_created),
      items: mlOrder.order_items.map((item) => ({
        itemId: item.item.id,
        title: item.item.title,
        sku: item.item.seller_sku,
        quantity: item.quantity,
        unitPrice: Math.round(item.unit_price * 100),
        totalPrice: Math.round(item.unit_price * item.quantity * 100)
      })),
      shippingAddress: mlOrder.shipping ? this.parseMLShippingAddress(mlOrder.shipping) : void 0
    };
  }
  /**
   * Helper: Parse Mercado Livre shipping address
   */
  parseMLShippingAddress(shipping) {
    const receiver = shipping.receiver_address;
    return {
      name: receiver.receiver_name,
      street: receiver.street_name,
      number: receiver.street_number,
      complement: receiver.apartment_number,
      city: receiver.city?.name,
      state: receiver.state?.name,
      zipCode: receiver.zip_code,
      country: "BR"
    };
  }
};

// server/adapters/ShopeeAdapter.ts
import crypto3 from "crypto";
import axios3 from "axios";
var ShopeeAdapter = class extends BaseMarketplaceAdapter {
  authUrl = "https://partner.shopeemobile.com/api/v2/oauth/authorize";
  tokenUrl = "https://partner.shopeemobile.com/api/v2/oauth/token";
  apiUrl = "https://partner.shopeemobile.com/api/v2";
  constructor(credentials) {
    super(credentials, "https://partner.shopeemobile.com/api/v2");
  }
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: "code",
      state
    });
    return `${this.authUrl}?${params.toString()}`;
  }
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const timestamp2 = Math.floor(Date.now() / 1e3);
      const signature = this.generateSignature(code, timestamp2);
      const response = await axios3.post(this.tokenUrl, {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.credentials.redirectUri
      });
      const expiresIn = response.data.expires_in || 28800;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.exchangeCodeForTokens");
    }
  }
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios3.post(this.tokenUrl, {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      });
      const expiresIn = response.data.expires_in || 28800;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.refreshAccessToken");
    }
  }
  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/shop/get_shop_info");
      return {
        sellerId: response.data.data.shop_id.toString(),
        sellerName: response.data.data.shop_name
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.validateAndGetSellerInfo");
    }
  }
  /**
   * List existing shop listings for safe import/linking.
   */
  async listListings(accessToken, filters) {
    try {
      this.setAuthHeader(accessToken);
      const seller = await this.validateAndGetSellerInfo(accessToken);
      const limit = Math.min(filters?.limit ?? 50, 100);
      const list = await this.httpClient.get(`/product/get_item_list`, {
        params: {
          shop_id: Number(seller.sellerId),
          offset: 0,
          page_size: limit,
          item_status: filters?.status && filters.status !== "all" ? [filters.status] : ["NORMAL", "BANNED", "UNLIST"]
        }
      });
      const ids = (list.data?.response?.item ?? list.data?.data?.item_list ?? []).slice(0, limit).map((item) => Number(item.item_id));
      if (!ids.length) return [];
      const details = await this.httpClient.get(`/product/get_item_base_info`, {
        params: { shop_id: Number(seller.sellerId), item_id_list: ids }
      });
      const rows = details.data?.response?.item_list ?? details.data?.data?.item_list ?? [];
      return rows.map((data) => ({
        listingId: String(data.item_id),
        title: data.item_name ?? data.name ?? "",
        description: data.description,
        sku: data.item_sku,
        price: data.price_info?.[0]?.current_price ? Math.round(Number(data.price_info[0].current_price) * 100) : void 0,
        stock: data.stock_info_v2?.summary_info?.total_reserved_stock ?? data.stock,
        status: data.item_status === "NORMAL" ? "active" : data.item_status === "UNLIST" ? "paused" : "inactive",
        categoryId: data.category_id ? String(data.category_id) : void 0,
        images: data.image?.image_url_list ?? data.images ?? [],
        attributes: Object.fromEntries((data.attribute_list ?? []).map((attribute) => [String(attribute.attribute_id), String(attribute.value ?? attribute.original_value_name ?? "")])),
        raw: data
      }));
    } catch (error) {
      this.handleApiError(error, "Shopee.listListings");
    }
  }
  /**
   * Publish a product to Shopee
   */
  async publishProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      if (!payload.category?.trim()) throw new Error("Shopee exige categoryId mapeado antes da publica\xE7\xE3o");
      const categoryId = Number(payload.category);
      if (!Number.isInteger(categoryId) || categoryId <= 0) throw new Error("Shopee exige categoryId num\xE9rico v\xE1lido");
      const itemPayload = {
        item: {
          name: payload.title,
          description: payload.description,
          price: payload.price / 100,
          stock: payload.stock,
          category_id: categoryId,
          images: payload.images.map((url) => ({ url })),
          attributes: this.mapAttributesToShopee(payload.attributes || {})
        }
      };
      const response = await this.httpClient.post(`/product/add_item`, itemPayload);
      return {
        listingId: response.data.data.item_id.toString(),
        listingUrl: `https://shopee.com.br/-i.${response.data.data.item_id}`,
        publishedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.publishProduct");
    }
  }
  /**
   * Update an existing product
   */
  async updateProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      const updateData = {
        item_id: parseInt(payload.listingId)
      };
      if (payload.title) updateData.name = payload.title;
      if (payload.description) updateData.description = payload.description;
      if (payload.price !== void 0) updateData.price = payload.price / 100;
      if (payload.stock !== void 0) updateData.stock = payload.stock;
      if (payload.images) updateData.images = payload.images.map((url) => ({ url }));
      await this.httpClient.post(`/product/update_item`, { item: updateData });
      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.updateProduct");
    }
  }
  /**
   * Update product price
   */
  async updatePrice(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.post(`/product/update_price`, {
        item_id: parseInt(payload.listingId),
        price: payload.price / 100
      });
      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.updatePrice");
    }
  }
  /**
   * Update product stock
   */
  async updateStock(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.post(`/product/update_stock`, {
        item_id: parseInt(payload.listingId),
        stock: payload.stock
      });
      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.updateStock");
    }
  }
  /**
   * Get orders from Shopee
   */
  async getOrders(accessToken, filters) {
    try {
      this.setAuthHeader(accessToken);
      const params = {
        order_status: filters?.status || "ALL",
        page_size: 50
      };
      if (filters?.since) {
        params.time_range_field = "create_time";
        params.time_from = Math.floor(filters.since.getTime() / 1e3);
        params.time_to = Math.floor(Date.now() / 1e3);
      }
      const response = await this.httpClient.get(`/order/orders_list`, { params });
      return response.data.data.orders.map((order) => this.parseShopeeOrder(order));
    } catch (error) {
      this.handleApiError(error, "Shopee.getOrders");
    }
  }
  /**
   * Get a specific order
   */
  async getOrder(accessToken, orderId) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/order/get_order_detail`, {
        params: { order_sn: orderId }
      });
      return this.parseShopeeOrder(response.data.data.order);
    } catch (error) {
      this.handleApiError(error, "Shopee.getOrder");
    }
  }
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const hash = crypto3.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  }
  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const data = payload;
    if (data.type === "order_status_updated") {
      return { type: "order_update", data: payload };
    }
    if (data.type === "item_updated") {
      return { type: "item_update", data: payload };
    }
    return null;
  }
  /**
   * Helper: Generate signature for Shopee API
   */
  generateSignature(code, timestamp2) {
    const message = `${this.credentials.clientId}${code}${timestamp2}`;
    return crypto3.createHmac("sha256", this.credentials.clientSecret).update(message).digest("hex");
  }
  /**
   * Helper: Map generic attributes to Shopee attributes
   */
  mapAttributesToShopee(attributes) {
    return Object.entries(attributes).filter(([id, value]) => id.trim() && value.trim()).map(([id, value]) => ({ attribute_id: Number(id) || id, original_value_name: value }));
  }
  /**
   * Helper: Parse Shopee order response
   */
  parseShopeeOrder(shopeeOrder) {
    return {
      orderId: shopeeOrder.order_sn,
      buyerName: shopeeOrder.buyer_user_id?.toString() || "Unknown",
      buyerEmail: shopeeOrder.buyer_email,
      totalAmount: Math.round(Number(shopeeOrder.total_amount || 0) * 100),
      status: shopeeOrder.order_status,
      orderDate: new Date(shopeeOrder.create_time * 1e3),
      items: shopeeOrder.order_items.map((item) => ({
        itemId: item.item_sku,
        title: item.item_name,
        sku: item.item_sku,
        quantity: item.model_quantity_purchased,
        unitPrice: Math.round(Number(item.model_original_price || 0) * 100),
        totalPrice: Math.round(Number(item.model_original_price || 0) * Number(item.model_quantity_purchased || 0) * 100)
      })),
      shippingAddress: shopeeOrder.recipient_address ? {
        name: shopeeOrder.recipient_address.name,
        street: shopeeOrder.recipient_address.full_address,
        number: "",
        city: shopeeOrder.recipient_address.city,
        state: shopeeOrder.recipient_address.state,
        zipCode: shopeeOrder.recipient_address.zipcode,
        country: "BR"
      } : void 0
    };
  }
};

// server/adapters/AmazonAdapter.ts
import crypto4 from "crypto";
import axios4 from "axios";
var AmazonAdapter = class extends BaseMarketplaceAdapter {
  authUrl = "https://sellercentral.amazon.com/apps/authorize/consent";
  tokenUrl = "https://api.amazon.com/auth/o2/token";
  apiUrl = "https://sellingpartnerapi-na.amazon.com";
  constructor(credentials) {
    super(credentials, "https://sellingpartnerapi-na.amazon.com");
  }
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: "code",
      state
    });
    return `${this.authUrl}?${params.toString()}`;
  }
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const response = await axios4.post(this.tokenUrl, {
        grant_type: "authorization_code",
        code,
        redirect_uri: this.credentials.redirectUri,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      });
      const expiresIn = response.data.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.exchangeCodeForTokens");
    }
  }
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios4.post(this.tokenUrl, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      });
      const expiresIn = response.data.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.refreshAccessToken");
    }
  }
  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/sellers/v1/account/marketplaceParticipations");
      const participation = response.data.payload[0];
      return {
        sellerId: participation.merchant.merchant_id,
        sellerName: participation.merchant.merchant_name
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.validateAndGetSellerInfo");
    }
  }
  /**
   * Publish a product to Amazon
   */
  async publishProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      const itemPayload = {
        sku: payload.sku,
        product_type: "PRODUCT",
        attributes: {
          title: [{ value: payload.title }],
          brand: [{ value: payload.brand || "" }],
          description: [{ value: payload.description }],
          bullet_point: [{ value: payload.description }],
          standard_price: [{ currency: "BRL", value: (payload.price / 100).toString() }],
          quantity: [{ value: payload.stock.toString() }],
          main_image_url: [{ value: payload.images[0] || "" }],
          other_image_url: payload.images.slice(1).map((url) => ({ value: url }))
        }
      };
      const response = await this.httpClient.post(`/feeds/2021-06-30/feeds`, {
        feedType: "POST_PRODUCT_DATA",
        marketplaceIds: ["A1ZZFT5FULY4LN"],
        inputFeedDocumentId: payload.sku,
        feedDocument: itemPayload
      });
      return {
        listingId: payload.sku,
        listingUrl: `https://www.amazon.com.br/s?k=${payload.sku}`,
        publishedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.publishProduct");
    }
  }
  /**
   * Update an existing product
   */
  async updateProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      const updateData = {};
      if (payload.title) updateData.title = [{ value: payload.title }];
      if (payload.description) updateData.description = [{ value: payload.description }];
      if (payload.price) updateData.standard_price = [{ currency: "BRL", value: (payload.price / 100).toString() }];
      if (payload.stock !== void 0) updateData.quantity = [{ value: payload.stock.toString() }];
      await this.httpClient.put(`/catalog/2022-04-01/items/${payload.listingId}`, updateData);
      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.updateProduct");
    }
  }
  /**
   * Update product price
   */
  async updatePrice(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.put(`/catalog/2022-04-01/items/${payload.listingId}`, {
        standard_price: [{ currency: "BRL", value: (payload.price / 100).toString() }]
      });
      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.updatePrice");
    }
  }
  /**
   * Update product stock
   */
  async updateStock(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.put(`/catalog/2022-04-01/items/${payload.listingId}`, {
        quantity: [{ value: payload.stock.toString() }]
      });
      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.updateStock");
    }
  }
  /**
   * Get orders from Amazon
   */
  async getOrders(accessToken, filters) {
    try {
      this.setAuthHeader(accessToken);
      const params = {
        MarketplaceIds: ["A1ZZFT5FULY4LN"],
        MaxResultsPerPage: 50
      };
      if (filters?.since) {
        params.CreatedAfter = filters.since.toISOString();
      }
      const response = await this.httpClient.get(`/orders/v0/orders`, { params });
      return response.data.Orders.map((order) => this.parseAmazonOrder(order));
    } catch (error) {
      this.handleApiError(error, "Amazon.getOrders");
    }
  }
  /**
   * Get a specific order
   */
  async getOrder(accessToken, orderId) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/orders/v0/orders/${orderId}`);
      return this.parseAmazonOrder(response.data.Orders[0]);
    } catch (error) {
      this.handleApiError(error, "Amazon.getOrder");
    }
  }
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const hash = crypto4.createHmac("sha256", secret).update(payload).digest("base64");
    return hash === signature;
  }
  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const data = payload;
    if (data.EventType === "ORDER_STATUS_CHANGE") {
      return { type: "order_update", data: payload };
    }
    if (data.EventType === "INVENTORY_QUANTITY_CHANGE") {
      return { type: "stock_update", data: payload };
    }
    return null;
  }
  /**
   * Helper: Parse Amazon order response
   */
  parseAmazonOrder(amazonOrder) {
    return {
      orderId: amazonOrder.AmazonOrderId,
      buyerName: amazonOrder.BuyerName,
      buyerEmail: amazonOrder.BuyerEmail,
      totalAmount: Math.round(amazonOrder.OrderTotal.Amount * 100),
      status: amazonOrder.OrderStatus,
      orderDate: new Date(amazonOrder.PurchaseDate),
      items: amazonOrder.OrderItems.map((item) => ({
        itemId: item.OrderItemId,
        title: item.Title,
        sku: item.SellerSKU,
        quantity: item.QuantityOrdered,
        unitPrice: Math.round(item.ItemPrice.Amount * 100),
        totalPrice: Math.round(item.ItemPrice.Amount * item.QuantityOrdered * 100)
      })),
      shippingAddress: amazonOrder.ShippingAddress ? {
        name: amazonOrder.ShippingAddress.Name,
        street: amazonOrder.ShippingAddress.AddressLine1,
        number: amazonOrder.ShippingAddress.AddressLine2 || "",
        city: amazonOrder.ShippingAddress.City,
        state: amazonOrder.ShippingAddress.StateOrRegion,
        zipCode: amazonOrder.ShippingAddress.PostalCode,
        country: amazonOrder.ShippingAddress.CountryCode
      } : void 0
    };
  }
};

// server/adapters/TikTokAdapter.ts
import crypto5 from "crypto";
import axios5 from "axios";
var TikTokAdapter = class extends BaseMarketplaceAdapter {
  authUrl = "https://auth.tiktok.com/oauth/authorize";
  tokenUrl = "https://auth.tiktok.com/oauth/token";
  apiUrl = "https://open-api.tiktokshop.com";
  constructor(credentials) {
    super(credentials, "https://open-api.tiktokshop.com");
  }
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_key: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: "code",
      scope: "shop.basic,product.read,product.write,order.read",
      state
    });
    return `${this.authUrl}?${params.toString()}`;
  }
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const response = await axios5.post(this.tokenUrl, {
        client_key: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.credentials.redirectUri
      });
      const expiresIn = response.data.expires_in || 28800;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.exchangeCodeForTokens");
    }
  }
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios5.post(this.tokenUrl, {
        client_key: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      });
      const expiresIn = response.data.expires_in || 28800;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.refreshAccessToken");
    }
  }
  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/v1/shop/get_shop_info");
      return {
        sellerId: response.data.data.shop_id.toString(),
        sellerName: response.data.data.shop_name
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.validateAndGetSellerInfo");
    }
  }
  /**
   * Publish a product to TikTok Shop
   */
  async publishProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      if (!payload.category?.trim()) throw new Error("TikTok Shop exige categoryId mapeado antes da publica\xE7\xE3o");
      const itemPayload = {
        product_name: payload.title,
        product_description: payload.description,
        category_id: payload.category,
        brand_id: payload.brand || void 0,
        skus: [
          {
            sku_code: payload.sku,
            price: payload.price / 100,
            stock: payload.stock,
            images: payload.images
          }
        ]
      };
      const response = await this.httpClient.post(`/v1/product/create`, itemPayload);
      return {
        listingId: response.data.data.product_id.toString(),
        listingUrl: `https://tiktokshop.com/product/${response.data.data.product_id}`,
        publishedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.publishProduct");
    }
  }
  /**
   * Update an existing product
   */
  async updateProduct(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      const updateData = {
        product_id: payload.listingId
      };
      if (payload.title) updateData.product_name = payload.title;
      if (payload.description) updateData.product_description = payload.description;
      if (payload.price || payload.stock !== void 0) {
        updateData.skus = [
          {
            sku_code: payload.listingId,
            ...payload.price && { price: payload.price },
            ...payload.stock !== void 0 && { stock: payload.stock }
          }
        ];
      }
      await this.httpClient.post(`/v1/product/update`, updateData);
      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.updateProduct");
    }
  }
  /**
   * Update product price
   */
  async updatePrice(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.post(`/v1/product/update`, {
        product_id: payload.listingId,
        skus: [
          {
            sku_code: payload.listingId,
            price: payload.price
          }
        ]
      });
      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.updatePrice");
    }
  }
  /**
   * Update product stock
   */
  async updateStock(accessToken, payload) {
    try {
      this.setAuthHeader(accessToken);
      await this.httpClient.post(`/v1/product/update`, {
        product_id: payload.listingId,
        skus: [
          {
            sku_code: payload.listingId,
            stock: payload.stock
          }
        ]
      });
      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.updateStock");
    }
  }
  /**
   * Get orders from TikTok Shop
   */
  async getOrders(accessToken, filters) {
    try {
      this.setAuthHeader(accessToken);
      const params = {
        page_size: 50,
        page_number: 1
      };
      if (filters?.status) {
        params.order_status = filters.status;
      }
      const response = await this.httpClient.get(`/v1/order/orders`, { params });
      return response.data.data.orders.map((order) => this.parseTikTokOrder(order));
    } catch (error) {
      this.handleApiError(error, "TikTok.getOrders");
    }
  }
  /**
   * Get a specific order
   */
  async getOrder(accessToken, orderId) {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/v1/order/detail`, {
        params: { order_id: orderId }
      });
      return this.parseTikTokOrder(response.data.data);
    } catch (error) {
      this.handleApiError(error, "TikTok.getOrder");
    }
  }
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const hash = crypto5.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  }
  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const data = payload;
    if (data.type === "order_status_updated") {
      return { type: "order_update", data: payload };
    }
    if (data.type === "product_updated") {
      return { type: "product_update", data: payload };
    }
    return null;
  }
  /**
   * Helper: Parse TikTok order response
   */
  parseTikTokOrder(tiktokOrder) {
    return {
      orderId: tiktokOrder.order_id,
      buyerName: tiktokOrder.buyer_user_id?.toString() || "Unknown",
      buyerEmail: tiktokOrder.buyer_email,
      totalAmount: tiktokOrder.order_amount,
      status: tiktokOrder.order_status,
      orderDate: new Date(tiktokOrder.create_time * 1e3),
      items: tiktokOrder.order_line_items.map((item) => ({
        itemId: item.line_item_id,
        title: item.product_name,
        sku: item.sku_code,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.unit_price * item.quantity
      })),
      shippingAddress: tiktokOrder.recipient_address ? {
        name: tiktokOrder.recipient_address.name,
        street: tiktokOrder.recipient_address.street,
        number: tiktokOrder.recipient_address.number || "",
        city: tiktokOrder.recipient_address.city,
        state: tiktokOrder.recipient_address.state,
        zipCode: tiktokOrder.recipient_address.postal_code,
        country: "BR"
      } : void 0
    };
  }
};

// server/adapters/AdapterFactory.ts
var AdapterFactory = class {
  static adapters = /* @__PURE__ */ new Map([
    ["mercadolivre", MercadoLivreAdapter],
    ["shopee", ShopeeAdapter],
    ["amazon", AmazonAdapter],
    ["tiktok", TikTokAdapter]
  ]);
  /**
   * Create an adapter instance for a specific marketplace
   */
  static createAdapter(marketplaceType, credentials) {
    const AdapterClass = this.adapters.get(marketplaceType);
    if (!AdapterClass) {
      throw new Error(`Unsupported marketplace: ${marketplaceType}`);
    }
    return new AdapterClass(credentials);
  }
  /**
   * Register a new marketplace adapter
   * Allows extending the system with new marketplaces at runtime
   */
  static registerAdapter(marketplaceType, AdapterClass) {
    this.adapters.set(marketplaceType, AdapterClass);
  }
  /**
   * Get list of supported marketplaces
   */
  static getSupportedMarketplaces() {
    return Array.from(this.adapters.keys());
  }
  /**
   * Check if a marketplace is supported
   */
  static isSupported(marketplaceType) {
    return this.adapters.has(marketplaceType);
  }
};

// server/services/marketplaceService.ts
var MarketplaceService = class {
  /**
   * Create or update a marketplace connection
   */
  static async upsertConnection(userId, marketplaceType, data) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const encryptedData = { ...data };
    if (data.accessToken) encryptedData.accessToken = encryptData(data.accessToken);
    if (data.refreshToken) encryptedData.refreshToken = encryptData(data.refreshToken);
    if (data.clientSecret) encryptedData.clientSecret = encryptData(data.clientSecret);
    if (data.webhookSecret) encryptedData.webhookSecret = encryptData(data.webhookSecret);
    const existing = await db.select().from(marketplaceConnections).where(and2(eq3(marketplaceConnections.userId, userId), eq3(marketplaceConnections.marketplaceType, marketplaceType))).limit(1);
    if (existing.length > 0) {
      const result = await db.update(marketplaceConnections).set({
        ...encryptedData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(marketplaceConnections.id, existing[0].id));
      return (await db.select().from(marketplaceConnections).where(eq3(marketplaceConnections.id, existing[0].id)).limit(1))[0];
    } else {
      const result = await db.insert(marketplaceConnections).values({
        userId,
        marketplaceType,
        ...encryptedData
      });
      return (await db.select().from(marketplaceConnections).where(and2(eq3(marketplaceConnections.userId, userId), eq3(marketplaceConnections.marketplaceType, marketplaceType))).limit(1))[0];
    }
  }
  /**
   * Get a marketplace connection
   */
  static async getConnection(userId, marketplaceType) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select().from(marketplaceConnections).where(and2(eq3(marketplaceConnections.userId, userId), eq3(marketplaceConnections.marketplaceType, marketplaceType))).limit(1);
    return result.length > 0 ? result[0] : null;
  }
  /**
   * Get all marketplace connections for a user
   */
  static async getUserConnections(userId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(marketplaceConnections).where(eq3(marketplaceConnections.userId, userId));
  }
  /**
   * Decrypt sensitive fields from a connection
   */
  static decryptConnection(connection) {
    return {
      ...connection,
      accessToken: connection.accessToken ? decryptData(connection.accessToken) : null,
      refreshToken: connection.refreshToken ? decryptData(connection.refreshToken) : null,
      clientSecret: connection.clientSecret ? decryptData(connection.clientSecret) : null,
      webhookSecret: connection.webhookSecret ? decryptData(connection.webhookSecret) : null
    };
  }
  /**
   * Get adapter for a marketplace connection
   */
  static async getAdapter(connection) {
    if (!AdapterFactory.isSupported(connection.marketplaceType)) {
      throw new Error(`Unsupported marketplace: ${connection.marketplaceType}`);
    }
    const decrypted = this.decryptConnection(connection);
    const credentials = {
      clientId: decrypted.clientId || "",
      clientSecret: decrypted.clientSecret || "",
      redirectUri: process.env.MARKETPLACE_REDIRECT_URI || "http://localhost:3000/api/marketplace/callback"
    };
    return AdapterFactory.createAdapter(connection.marketplaceType, credentials);
  }
  /**
   * Refresh access token if expired
   */
  static async refreshTokenIfNeeded(connection) {
    const now = /* @__PURE__ */ new Date();
    if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1e3) {
      if (!connection.refreshToken) {
        throw new Error("No refresh token available");
      }
      const adapter = await this.getAdapter(connection);
      const decrypted = this.decryptConnection(connection);
      const newTokens = await adapter.refreshAccessToken(decrypted.refreshToken || "");
      await this.upsertConnection(connection.userId, connection.marketplaceType, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        tokenExpiresAt: newTokens.expiresAt
      });
      return newTokens.accessToken;
    }
    return decryptData(connection.accessToken || "");
  }
  /**
   * Update sync status and error information
   */
  static async updateSyncStatus(connectionId, status, errorMessage) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const updateData = {
      syncStatus: status,
      lastSyncAt: /* @__PURE__ */ new Date()
    };
    if (status === "error" && errorMessage) {
      updateData.lastErrorAt = /* @__PURE__ */ new Date();
      updateData.lastErrorMessage = errorMessage;
    }
    await db.update(marketplaceConnections).set(updateData).where(eq3(marketplaceConnections.id, connectionId));
  }
  /**
   * Disconnect a marketplace
   */
  static async disconnect(userId, marketplaceType) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(marketplaceConnections).set({
      isConnected: 0,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and2(eq3(marketplaceConnections.userId, userId), eq3(marketplaceConnections.marketplaceType, marketplaceType)));
  }
};

// server/services/publicationPreflightService.ts
async function runPublicationPreflight(userId, productId, marketplaceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const issues = [];
  const productRows = await db.select().from(products).where(and3(eq4(products.id, productId), eq4(products.userId, userId))).limit(1);
  const product = productRows[0];
  if (!product) issues.push({ code: "PRODUCT_NOT_FOUND", message: "Produto n\xE3o encontrado para esta conta", severity: "error" });
  if (product && !product.sku.trim()) issues.push({ code: "SKU_REQUIRED", message: "SKU \xE9 obrigat\xF3rio", severity: "error" });
  if (product && Number(product.basePrice ?? 0) <= 0) issues.push({ code: "SALE_PRICE_REQUIRED", message: "Pre\xE7o de venda deve ser maior que zero", severity: "error" });
  if (product && Number(product.stock ?? 0) < 0) issues.push({ code: "STOCK_INVALID", message: "Estoque n\xE3o pode ser negativo", severity: "error" });
  const mapping = product?.category ? await db.select().from(marketplaceCategoryMappings).where(and3(
    eq4(marketplaceCategoryMappings.userId, userId),
    eq4(marketplaceCategoryMappings.marketplaceType, marketplaceType),
    eq4(marketplaceCategoryMappings.internalCategory, product.category)
  )).limit(1) : [];
  if (!mapping.length) issues.push({ code: "CATEGORY_MAPPING_REQUIRED", message: `Categoria '${product?.category || ""}' ainda n\xE3o est\xE1 mapeada para ${marketplaceType}`, severity: "error" });
  if (product) {
    const mediaCheck = validatePublicationMedia(await resolveProductMedia(userId, productId));
    for (const message of mediaCheck.issues) issues.push({ code: "MEDIA_INVALID", message, severity: "error" });
  }
  const connection = await MarketplaceService.getConnection(userId, marketplaceType);
  if (!connection?.isConnected) issues.push({ code: "CONNECTION_REQUIRED", message: "Marketplace n\xE3o est\xE1 conectado", severity: "error" });
  const openConflicts = await db.select({ id: syncConflicts.id }).from(syncConflicts).where(and3(
    eq4(syncConflicts.userId, userId),
    eq4(syncConflicts.productId, productId),
    eq4(syncConflicts.status, "open")
  )).limit(1);
  if (openConflicts.length) issues.push({ code: "OPEN_CONFLICT", message: "Resolva os conflitos abertos antes da publica\xE7\xE3o", severity: "error" });
  const seo = await db.select({ score: productSeoProfiles.score }).from(productSeoProfiles).where(and3(eq4(productSeoProfiles.userId, userId), eq4(productSeoProfiles.productId, productId), eq4(productSeoProfiles.channel, marketplaceType))).limit(1);
  if (!seo.length || Number(seo[0].score || 0) < 50) issues.push({ code: "SEO_LOW", message: "Perfil de SEO inexistente ou abaixo de 50 pontos", severity: "warning" });
  const errors = issues.filter((issue) => issue.severity === "error");
  const status = errors.length ? "blocked" : "ready";
  const score = Math.max(0, 100 - errors.length * 20 - (issues.length - errors.length) * 5);
  await db.insert(publicationPreflightResults).values({ userId, productId, marketplaceType, status, score, issues: JSON.stringify(issues) });
  return { status, score, issues, categoryId: mapping[0]?.externalCategoryId };
}

// server/services/attributeMappingService.ts
import { and as and4, eq as eq5 } from "drizzle-orm";
async function resolveMarketplaceAttributes(userId, productId, marketplaceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [sourceRows, mappingRows] = await Promise.all([
    db.select().from(productAttributes).where(and4(eq5(productAttributes.userId, userId), eq5(productAttributes.productId, productId))),
    db.select().from(marketplaceAttributeMappings).where(and4(eq5(marketplaceAttributeMappings.userId, userId), eq5(marketplaceAttributeMappings.marketplaceType, marketplaceType)))
  ]);
  const mappings = new Map(mappingRows.map((row) => [row.sourceName.toLowerCase(), row]));
  const output = {};
  for (const source of sourceRows) {
    const mapping = mappings.get(source.name.toLowerCase());
    const externalName = mapping?.externalName || source.name;
    let value = source.value;
    if (mapping?.valueMap) {
      try {
        const valueMap = JSON.parse(mapping.valueMap);
        value = valueMap[value] || value;
      } catch {
      }
    }
    output[externalName] = value;
  }
  return output;
}

// server/services/productSyncService.ts
var ProductSyncService = class {
  /**
   * Publish a product to a specific marketplace
   */
  static async publishProductToMarketplace(userId, productId, marketplaceType) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const startTime = /* @__PURE__ */ new Date();
    try {
      assertMarketplaceWriteEnabled("publica\xE7\xE3o", marketplaceType);
      const product = await db.select().from(products).where(and5(eq6(products.id, productId), eq6(products.userId, userId))).limit(1);
      if (product.length === 0) {
        throw new Error("Product not found");
      }
      const prod = product[0];
      const connection = await MarketplaceService.getConnection(userId, marketplaceType);
      if (!connection || !connection.isConnected) {
        throw new Error(`Marketplace ${marketplaceType} not connected`);
      }
      const preflight = await runPublicationPreflight(userId, productId, marketplaceType);
      if (preflight.status === "blocked") {
        throw new Error(`Publication Gate bloqueou a publica\xE7\xE3o: ${preflight.issues.filter((issue) => issue.severity === "error").map((issue) => issue.message).join("; ")}`);
      }
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);
      const adapter = await MarketplaceService.getAdapter(connection);
      const media = validatePublicationMedia(await resolveProductMedia(userId, productId));
      const payload = {
        title: prod.name,
        description: prod.description || "",
        price: prod.basePrice || 0,
        stock: prod.stock || 0,
        sku: prod.sku,
        images: media.images,
        brand: prod.brand || void 0,
        category: preflight.categoryId || prod.category || void 0,
        attributes: await resolveMarketplaceAttributes(userId, productId, marketplaceType)
      };
      const result = await adapter.publishProduct(accessToken, payload);
      await db.insert(marketplaceListings).values({
        marketplaceConnectionId: connection.id,
        productId,
        marketplaceListingId: result.listingId,
        title: prod.name,
        description: prod.description || void 0,
        price: prod.basePrice || 0,
        stock: prod.stock || 0,
        status: "active",
        listingUrl: result.listingUrl,
        lastPublishedAt: result.publishedAt
      });
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId: connection.id,
        productId,
        syncType: "product_publish",
        status: "success",
        metadata: JSON.stringify({ listingId: result.listingId })
      });
      return { success: true, listingId: result.listingId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.insert(syncLogs).values({
        userId,
        productId,
        syncType: "product_publish",
        status: "failed",
        errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }
  /**
   * Update product price on a marketplace
   */
  static async updatePriceOnMarketplace(userId, listingId, marketplaceConnectionId, newPrice) {
    assertMarketplaceWriteEnabled("atualiza\xE7\xE3o de pre\xE7o");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const connections = await db.select().from(marketplaceConnections).where(
        and5(
          eq6(marketplaceConnections.id, marketplaceConnectionId),
          eq6(marketplaceConnections.userId, userId)
        )
      ).limit(1);
      if (connections.length === 0) {
        throw new Error("Marketplace connection not found");
      }
      const connection = connections[0];
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);
      const adapter = await MarketplaceService.getAdapter(connection);
      const payload = {
        listingId,
        price: newPrice
      };
      await adapter.updatePrice(accessToken, payload);
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "price_update",
        status: "success",
        metadata: JSON.stringify({ listingId, newPrice })
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "price_update",
        status: "failed",
        errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }
  /**
   * Update product stock on a marketplace
   */
  static async updateStockOnMarketplace(userId, listingId, marketplaceConnectionId, newStock) {
    assertMarketplaceWriteEnabled("atualiza\xE7\xE3o de estoque");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const connections = await db.select().from(marketplaceConnections).where(
        and5(
          eq6(marketplaceConnections.id, marketplaceConnectionId),
          eq6(marketplaceConnections.userId, userId)
        )
      ).limit(1);
      if (connections.length === 0) {
        throw new Error("Marketplace connection not found");
      }
      const connection = connections[0];
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);
      const adapter = await MarketplaceService.getAdapter(connection);
      const payload = {
        listingId,
        stock: newStock
      };
      await adapter.updateStock(accessToken, payload);
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "stock_sync",
        status: "success",
        metadata: JSON.stringify({ listingId, newStock })
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "stock_sync",
        status: "failed",
        errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }
  /**
   * Publish product to all connected marketplaces
   */
  static async publishProductToAllMarketplaces(userId, productId) {
    const connections = await MarketplaceService.getUserConnections(userId);
    const successful = [];
    const failed = [];
    for (const connection of connections) {
      if (connection.isConnected === 1) {
        const result = await this.publishProductToMarketplace(
          userId,
          productId,
          connection.marketplaceType
        );
        if (result.success) {
          successful.push(connection.marketplaceType);
        } else {
          failed.push({
            marketplace: connection.marketplaceType,
            error: result.error || "Unknown error"
          });
        }
      }
    }
    return { successful, failed };
  }
  /**
   * Get sync history for a product
   */
  static async getSyncHistory(userId, productId, limit = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let query = db.select().from(syncLogs).where(eq6(syncLogs.userId, userId));
    if (productId) {
      query = query.where(eq6(syncLogs.productId, productId));
    }
    return query.limit(limit);
  }
};

// server/services/orderSyncService.ts
import { and as and7, eq as eq8 } from "drizzle-orm";

// server/services/inventoryService.ts
import { and as and6, eq as eq7, inArray as inArray2, lt, sql } from "drizzle-orm";
var InventoryService = class {
  static async available(userId, productId, variantId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const reserved = await db.select({ total: sql`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(and6(
      eq7(inventoryReservations.userId, userId),
      eq7(inventoryReservations.productId, productId),
      variantId ? eq7(inventoryReservations.variantId, variantId) : sql`${inventoryReservations.variantId} is null`,
      inArray2(inventoryReservations.status, ["reserved", "confirmed"])
    ));
    if (variantId) {
      const variant = await db.select({ stock: productVariants.stock }).from(productVariants).where(and6(eq7(productVariants.id, variantId), eq7(productVariants.userId, userId), eq7(productVariants.productId, productId))).limit(1);
      if (!variant.length) throw new Error("Variante n\xE3o encontrada");
      return { stock: variant[0].stock, reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, variant[0].stock - Number(reserved[0]?.total ?? 0)) };
    }
    const product = await db.select({ stock: products.stock }).from(products).where(and6(eq7(products.id, productId), eq7(products.userId, userId))).limit(1);
    if (!product.length) throw new Error("Produto n\xE3o encontrado");
    return { stock: Number(product[0].stock ?? 0), reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, Number(product[0].stock ?? 0) - Number(reserved[0]?.total ?? 0)) };
  }
  static async reserve(input) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantidade de reserva inv\xE1lida");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const available = await this.available(input.userId, input.productId, input.variantId);
    if (available.available < input.quantity) throw new Error(`Estoque insuficiente: dispon\xEDvel ${available.available}`);
    const result = await db.insert(inventoryReservations).values({ ...input, status: "reserved" });
    if (input.variantId) await db.update(productVariants).set({ reservedStock: sql`${productVariants.reservedStock} + ${input.quantity}` }).where(and6(eq7(productVariants.id, input.variantId), eq7(productVariants.userId, input.userId)));
    return { id: Number(result[0]?.insertId ?? 0), availableAfter: available.available - input.quantity };
  }
  static async releaseExpired(userId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const expired = await db.select({ id: inventoryReservations.id }).from(inventoryReservations).where(and6(eq7(inventoryReservations.userId, userId), eq7(inventoryReservations.status, "reserved"), lt(inventoryReservations.expiresAt, /* @__PURE__ */ new Date())));
    for (const reservation of expired) await this.changeStatus(userId, reservation.id, "expired");
    return { released: expired.length };
  }
  static async changeStatus(userId, reservationId, status) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(inventoryReservations).where(and6(eq7(inventoryReservations.id, reservationId), eq7(inventoryReservations.userId, userId), eq7(inventoryReservations.status, "reserved"))).limit(1);
    if (!rows.length) throw new Error("Reserva n\xE3o encontrada ou j\xE1 processada");
    const reservation = rows[0];
    await db.update(inventoryReservations).set({ status, releasedAt: status === "released" || status === "expired" ? /* @__PURE__ */ new Date() : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(inventoryReservations.id, reservationId));
    if (reservation.variantId && (status === "released" || status === "expired")) await db.update(productVariants).set({ reservedStock: sql`greatest(0, ${productVariants.reservedStock} - ${reservation.quantity})` }).where(and6(eq7(productVariants.id, reservation.variantId), eq7(productVariants.userId, userId)));
    return { success: true, status };
  }
};

// server/services/orderSyncService.ts
var OrderSyncService = class {
  /**
   * Import orders from a specific marketplace
   */
  static async importOrdersFromMarketplace(userId, marketplaceType, since) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const startTime = /* @__PURE__ */ new Date();
    let imported = 0;
    let failed = 0;
    try {
      const connection = await MarketplaceService.getConnection(userId, marketplaceType);
      if (!connection || !connection.isConnected) {
        throw new Error(`Marketplace ${marketplaceType} not connected`);
      }
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);
      const adapter = await MarketplaceService.getAdapter(connection);
      const marketplaceOrders = await adapter.getOrders(accessToken, { since });
      for (const order of marketplaceOrders) {
        try {
          const existing = await db.select().from(orders).where(
            and7(
              eq8(orders.marketplaceOrderId, order.orderId),
              eq8(orders.userId, userId),
              eq8(orders.marketplaceConnectionId, connection.id)
            )
          ).limit(1);
          if (existing.length > 0) {
            await db.update(orders).set({
              status: order.status,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq8(orders.id, existing[0].id));
          } else {
            const result = await db.insert(orders).values({
              userId,
              marketplaceConnectionId: connection.id,
              marketplaceOrderId: order.orderId,
              buyerName: order.buyerName,
              buyerEmail: order.buyerEmail,
              totalAmount: order.totalAmount,
              status: order.status,
              orderDate: order.orderDate,
              shippingAddress: order.shippingAddress ? JSON.stringify(order.shippingAddress) : null
            });
            const newOrderId = Number(result[0]?.insertId ?? 0);
            if (newOrderId && order.items?.length) {
              const internalItems = await Promise.all(order.items.map(async (item) => {
                const variant = item.sku ? await db.select({ id: productVariants.id, productId: productVariants.productId }).from(productVariants).where(and7(eq8(productVariants.userId, userId), eq8(productVariants.sku, item.sku))).limit(1) : [];
                if (variant.length) return { orderId: newOrderId, productId: variant[0].productId, marketplaceItemId: item.itemId, title: item.title, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice, variantId: variant[0].id };
                const product = item.sku ? await db.select({ id: products.id }).from(products).where(and7(eq8(products.userId, userId), eq8(products.sku, item.sku))).limit(1) : [];
                return { orderId: newOrderId, productId: product[0]?.id, marketplaceItemId: item.itemId, title: item.title, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice };
              }));
              await db.insert(orderItems).values(internalItems.map(({ variantId: _variantId, ...item }) => item));
              for (const item of internalItems) {
                if (item.productId) {
                  try {
                    await InventoryService.reserve({ userId, productId: item.productId, variantId: item.variantId, orderId: newOrderId, quantity: item.quantity });
                  } catch (reservationError) {
                    console.warn("Stock reservation skipped:", reservationError);
                  }
                }
              }
            }
          }
          imported++;
        } catch (error) {
          failed++;
          console.error("Error importing order:", error);
        }
      }
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId: connection.id,
        syncType: "order_import",
        status: "success",
        metadata: JSON.stringify({ imported, failed })
      });
      return { imported, failed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.insert(syncLogs).values({
        userId,
        syncType: "order_import",
        status: "failed",
        errorMessage
      });
      return { imported, failed, error: errorMessage };
    }
  }
  /**
   * Import orders from all connected marketplaces
   */
  static async importOrdersFromAllMarketplaces(userId, since) {
    const connections = await MarketplaceService.getUserConnections(userId);
    let totalImported = 0;
    let totalFailed = 0;
    const byMarketplace = {};
    for (const connection of connections) {
      if (connection.isConnected === 1) {
        const result = await this.importOrdersFromMarketplace(
          userId,
          connection.marketplaceType,
          since
        );
        byMarketplace[connection.marketplaceType] = {
          imported: result.imported,
          failed: result.failed
        };
        totalImported += result.imported;
        totalFailed += result.failed;
      }
    }
    return { totalImported, totalFailed, byMarketplace };
  }
  /**
   * Get orders for the current user
   */
  static async getUserOrders(userId, limit = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(orders).where(eq8(orders.userId, userId)).limit(limit).orderBy((t) => t.orderDate);
  }
  /**
   * Get order items for an order
   */
  static async getOrderItems(orderId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(orderItems).where(eq8(orderItems.orderId, orderId));
  }
  /**
   * Update order status
   */
  static async updateOrderStatus(userId, orderId, newStatus) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      await db.update(orders).set({
        status: newStatus,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and7(eq8(orders.id, orderId), eq8(orders.userId, userId)));
      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      return false;
    }
  }
};

// server/services/rateLimiter.ts
var MarketplaceRateLimiter = class {
  static buckets = /* @__PURE__ */ new Map();
  static async acquire(key, limit = 10, windowMs = 1e3) {
    const now = Date.now();
    const bucket = this.buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((timestamp2) => now - timestamp2 < windowMs);
    if (bucket.timestamps.length >= limit) {
      const waitMs = windowMs - (now - bucket.timestamps[0]);
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, waitMs)));
      return this.acquire(key, limit, windowMs);
    }
    bucket.timestamps.push(Date.now());
    this.buckets.set(key, bucket);
  }
};

// server/services/syncJobService.ts
var MAX_ATTEMPTS = 5;
var backoffMinutes = (attempt) => Math.min(60, 2 ** Math.max(0, attempt - 1));
var SyncJobService = class {
  static async processPending(userId, limit = 10) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const jobs = await db.select().from(syncJobs).where(
      and8(eq9(syncJobs.userId, userId), eq9(syncJobs.status, "pending"), lte(syncJobs.nextRunAt, /* @__PURE__ */ new Date()))
    ).limit(Math.min(limit, 50));
    const results = [];
    for (const job of jobs) {
      await db.update(syncJobs).set({ status: "processing", lockedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(
        and8(eq9(syncJobs.id, job.id), eq9(syncJobs.status, "pending"))
      );
      try {
        const payload = job.payload ? JSON.parse(job.payload) : {};
        await MarketplaceRateLimiter.acquire(`connection:${job.marketplaceConnectionId || "internal"}`);
        if (job.type === "stock") {
          if (!job.marketplaceConnectionId || !job.productId || typeof payload.listingId !== "string" || typeof payload.stock !== "number") {
            throw new Error("Payload de atualiza\xE7\xE3o de estoque incompleto");
          }
          await ProductSyncService.updateStockOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.stock);
        } else if (job.type === "price") {
          if (!job.marketplaceConnectionId || typeof payload.listingId !== "string" || typeof payload.price !== "number") {
            throw new Error("Payload de atualiza\xE7\xE3o de pre\xE7o incompleto");
          }
          await ProductSyncService.updatePriceOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.price);
        } else if (job.type === "order") {
          if (!job.marketplaceConnectionId) throw new Error("Conex\xE3o ausente para importa\xE7\xE3o de pedido");
          const connection = await db.select().from(marketplaceConnections).where(eq9(marketplaceConnections.id, job.marketplaceConnectionId)).limit(1);
          if (!connection.length) throw new Error("Conex\xE3o do marketplace n\xE3o encontrada");
          await OrderSyncService.importOrdersFromMarketplace(userId, connection[0].marketplaceType);
        } else {
          throw new Error(`Tipo de job ainda n\xE3o suportado pelo worker: ${job.type}`);
        }
        await db.update(syncJobs).set({ status: "completed", completedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq9(syncJobs.id, job.id));
        results.push({ id: job.id, status: "completed" });
      } catch (error) {
        const attempts = (job.attempts ?? 0) + 1;
        const terminal = attempts >= MAX_ATTEMPTS;
        await db.update(syncJobs).set({
          status: terminal ? "failed" : "pending",
          attempts,
          nextRunAt: new Date(Date.now() + backoffMinutes(attempts) * 6e4),
          errorMessage: error instanceof Error ? error.message : String(error),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq9(syncJobs.id, job.id));
        results.push({ id: job.id, status: terminal ? "failed" : "retrying", error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { processed: results.length, results };
  }
};

// server/worker.ts
var intervalMs = Math.max(5e3, Number(process.env.WORKER_INTERVAL_MS || 15e3));
var batchSize = Math.max(1, Math.min(50, Number(process.env.WORKER_BATCH_SIZE || 10)));
var stopping = false;
async function tick() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const activeUsers = await db.select({ id: users.id }).from(users);
  for (const user of activeUsers) {
    if (stopping) break;
    await SyncJobService.processPending(user.id, batchSize);
  }
}
async function run() {
  console.log(`[luary-worker] iniciado; intervalo=${intervalMs}ms lote=${batchSize}`);
  while (!stopping) {
    try {
      await tick();
    } catch (error) {
      console.error("[luary-worker] falha no ciclo", error);
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.log("[luary-worker] encerrado");
}
var stop = () => {
  stopping = true;
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
void run();
