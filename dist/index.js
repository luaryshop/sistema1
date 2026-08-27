// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

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

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/routers.ts
import { TRPCError as TRPCError17 } from "@trpc/server";
import { z as z18 } from "zod";

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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/marketplace.ts
import { and as and4, eq as eq5 } from "drizzle-orm";
import { z as z2 } from "zod";

// server/services/marketplaceService.ts
import { eq as eq2, and } from "drizzle-orm";

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
import axios2 from "axios";
var BaseMarketplaceAdapter = class {
  credentials;
  httpClient;
  baseUrl;
  constructor(credentials, baseUrl) {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
    this.httpClient = axios2.create({
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
    if (axios2.isAxiosError(error)) {
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
import axios3 from "axios";
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
      const response = await axios3.post(`${this.authUrl}/oauth/token`, {
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
      const response = await axios3.post(`${this.authUrl}/oauth/token`, {
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
import axios4 from "axios";
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
      const response = await axios4.post(this.tokenUrl, {
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
      const response = await axios4.post(this.tokenUrl, {
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
import axios5 from "axios";
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
      const response = await axios5.post(this.tokenUrl, {
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
      const response = await axios5.post(this.tokenUrl, {
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
import axios6 from "axios";
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
      const response = await axios6.post(this.tokenUrl, {
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
      const response = await axios6.post(this.tokenUrl, {
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
    const existing = await db.select().from(marketplaceConnections).where(and(eq2(marketplaceConnections.userId, userId), eq2(marketplaceConnections.marketplaceType, marketplaceType))).limit(1);
    if (existing.length > 0) {
      const result = await db.update(marketplaceConnections).set({
        ...encryptedData,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(marketplaceConnections.id, existing[0].id));
      return (await db.select().from(marketplaceConnections).where(eq2(marketplaceConnections.id, existing[0].id)).limit(1))[0];
    } else {
      const result = await db.insert(marketplaceConnections).values({
        userId,
        marketplaceType,
        ...encryptedData
      });
      return (await db.select().from(marketplaceConnections).where(and(eq2(marketplaceConnections.userId, userId), eq2(marketplaceConnections.marketplaceType, marketplaceType))).limit(1))[0];
    }
  }
  /**
   * Get a marketplace connection
   */
  static async getConnection(userId, marketplaceType) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select().from(marketplaceConnections).where(and(eq2(marketplaceConnections.userId, userId), eq2(marketplaceConnections.marketplaceType, marketplaceType))).limit(1);
    return result.length > 0 ? result[0] : null;
  }
  /**
   * Get all marketplace connections for a user
   */
  static async getUserConnections(userId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(marketplaceConnections).where(eq2(marketplaceConnections.userId, userId));
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
    await db.update(marketplaceConnections).set(updateData).where(eq2(marketplaceConnections.id, connectionId));
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
    }).where(and(eq2(marketplaceConnections.userId, userId), eq2(marketplaceConnections.marketplaceType, marketplaceType)));
  }
};

// server/routers/marketplace.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/services/listingImportService.ts
import { and as and3, eq as eq4 } from "drizzle-orm";

// server/services/matchingService.ts
import { and as and2, eq as eq3 } from "drizzle-orm";
var normalize = (value) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
var tokens = (value) => new Set(normalize(value).split(" ").filter((token) => token.length >= 2));
function classify(confidence) {
  if (confidence >= 99) return "exact";
  if (confidence >= 90) return "probable";
  if (confidence >= 70) return "conflict";
  return "unmatched";
}
function compareAttributes(listing, candidate) {
  const listingAttributes = listing.attributes ?? {};
  const values = { ...listingAttributes, brand: listing.brand, color: candidate.color, material: candidate.material };
  let matched = 0;
  let present = 0;
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    present++;
    const candidateValue = key === "brand" ? candidate.brand : candidate.attributes?.[key] ?? (key === "color" ? candidate.color : candidate.material);
    if (candidateValue && normalize(candidateValue) === normalize(value)) matched++;
  }
  return present ? matched / present : 0;
}
var MatchingService = class {
  static async match(userId, listing) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [productRows, variantRows, identifierRows] = await Promise.all([
      db.select({ id: products.id, sku: products.sku, name: products.name, brand: products.brand, color: products.color, material: products.material, mpn: products.mpn }).from(products).where(eq3(products.userId, userId)),
      db.select({ id: productVariants.id, productId: productVariants.productId, sku: productVariants.sku, gtin: productVariants.gtin, mpn: productVariants.mpn, name: productVariants.name, attributes: productVariants.attributes }).from(productVariants).where(eq3(productVariants.userId, userId)),
      db.select({ productId: productIdentifiers.productId, variantId: productIdentifiers.variantId, type: productIdentifiers.type, value: productIdentifiers.value }).from(productIdentifiers).where(eq3(productIdentifiers.userId, userId))
    ]);
    const productById = new Map(productRows.map((row) => [row.id, row]));
    const identifierIndex = /* @__PURE__ */ new Map();
    for (const identifier of identifierRows) identifierIndex.set(`${normalize(identifier.type)}:${normalize(identifier.value)}`, { productId: identifier.productId, variantId: identifier.variantId });
    const variantCandidates = variantRows.map((variant) => ({
      productId: variant.productId,
      variantId: variant.id,
      sku: variant.sku,
      gtin: variant.gtin,
      mpn: variant.mpn,
      name: variant.name || productById.get(variant.productId)?.name || "",
      brand: productById.get(variant.productId)?.brand,
      color: productById.get(variant.productId)?.color,
      material: productById.get(variant.productId)?.material,
      attributes: variant.attributes ? JSON.parse(variant.attributes) : {}
    }));
    const productCandidates = productRows.map((product) => ({ productId: product.id, sku: product.sku, name: product.name, brand: product.brand, color: product.color, material: product.material, mpn: product.mpn, attributes: {} }));
    const candidates = [...variantCandidates, ...productCandidates];
    const sku = normalize(listing.sku || listing.internalCode);
    if (sku) {
      const exact = candidates.find((candidate) => normalize(candidate.sku) === sku) ?? (() => {
        const identifier = ["sku", "internal", "supplier"].map((type) => identifierIndex.get(`${type}:${sku}`)).find(Boolean);
        return identifier ? candidates.find((candidate) => candidate.productId === identifier.productId && (identifier.variantId ? candidate.variantId === identifier.variantId : !candidate.variantId)) : void 0;
      })();
      if (exact) return { productId: exact.productId, variantId: exact.variantId, confidence: 100, matchClass: "exact", reason: "sku", evidence: [{ field: "sku", status: "matched", detail: "SKU exato" }], candidateGap: 100 };
    }
    for (const value of [listing.gtin, listing.mpn].filter(Boolean)) {
      const normalizedValue = normalize(value);
      const direct = candidates.find((candidate) => normalize(candidate.gtin) === normalizedValue || normalize(candidate.mpn) === normalizedValue);
      const indexed = identifierRows.find((identifier) => normalize(identifier.value) === normalizedValue);
      const found = direct ?? (indexed ? candidates.find((candidate) => candidate.productId === indexed.productId && (indexed.variantId ? candidate.variantId === indexed.variantId : !candidate.variantId)) : void 0);
      if (found) return { productId: found.productId, variantId: found.variantId, confidence: value === listing.gtin ? 98 : 96, matchClass: "probable", reason: value === listing.gtin ? "identifier" : "mpn", evidence: [{ field: value === listing.gtin ? "gtin" : "mpn", status: "matched", detail: "Identificador exato" }], candidateGap: 98 };
    }
    const listingTokens = tokens(listing.title);
    const scored = candidates.map((candidate) => {
      const candidateTokens = tokens(candidate.name);
      const intersection = Array.from(listingTokens).filter((token) => candidateTokens.has(token)).length;
      const union = new Set(Array.from(listingTokens).concat(Array.from(candidateTokens))).size;
      const titleSimilarity = union ? intersection / union : 0;
      const titleScore = titleSimilarity * 72;
      const brandMatch = Boolean(listing.brand && candidate.brand && normalize(listing.brand) === normalize(candidate.brand));
      const brandScore = brandMatch ? 12 : 0;
      const attributeRatio = compareAttributes(listing, candidate);
      const attributeScore = attributeRatio * 16;
      return { ...candidate, confidence: Math.round(Math.min(98, titleScore + brandScore + attributeScore)), titleSimilarity, brandMatch, attributeRatio };
    }).filter((candidate) => candidate.confidence >= 35).sort((a, b) => b.confidence - a.confidence);
    const best = scored[0];
    const second = scored[1];
    const candidateGap = second ? best.confidence - second.confidence : best?.confidence ?? 0;
    const evidence = best ? [
      { field: "title", status: best.titleSimilarity >= 0.7 ? "matched" : best.titleSimilarity >= 0.45 ? "conflict" : "missing", detail: `${Math.round(best.titleSimilarity * 100)}% de similaridade` },
      { field: "brand", status: listing.brand ? best.brandMatch ? "matched" : "conflict" : "missing" },
      { field: "attributes", status: Object.keys(listing.attributes ?? {}).length ? best.attributeRatio >= 0.5 ? "matched" : "conflict" : "missing" }
    ] : void 0;
    if (!best || best.confidence < 70) return { productId: null, confidence: best?.confidence ?? 0, matchClass: "unmatched", reason: "none", evidence, candidateGap, candidates: scored.slice(0, 5).map((item) => ({ productId: item.productId, variantId: item.variantId, confidence: item.confidence })) };
    const ambiguous = second && candidateGap < 8;
    const confidence = ambiguous ? Math.min(best.confidence, 89) : best.confidence;
    return { productId: best.productId, variantId: best.variantId, confidence, matchClass: classify(confidence), reason: listing.brand || Object.keys(listing.attributes ?? {}).length ? "title_brand_attributes" : "title", evidence, candidateGap, candidates: scored.slice(0, 5).map((item) => ({ productId: item.productId, variantId: item.variantId, confidence: item.confidence })) };
  }
  static async analyzeStaging(userId, stagingId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(listingImportStaging).where(and2(eq3(listingImportStaging.id, stagingId), eq3(listingImportStaging.userId, userId))).limit(1);
    if (!rows.length) throw new Error("Staging n\xE3o encontrado");
    const listing = JSON.parse(rows[0].payload);
    const match = await this.match(userId, listing);
    await db.update(listingImportStaging).set({ suggestedProductId: match.productId, matchConfidence: match.confidence, matchClass: match.matchClass, matchReason: match.reason, matchEvidence: JSON.stringify({ evidence: match.evidence ?? [], candidateGap: match.candidateGap }), matchCandidates: JSON.stringify(match.candidates ?? []), updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(listingImportStaging.id, stagingId), eq3(listingImportStaging.userId, userId)));
    return match;
  }
};

// server/services/listingImportService.ts
var ListingImportService = class {
  static async previewListings(userId, marketplaceType, status = "all", limit = 50) {
    const connection = await MarketplaceService.getConnection(userId, marketplaceType);
    if (!connection || !connection.isConnected) {
      throw new Error(`Marketplace ${marketplaceType} n\xE3o est\xE1 conectado`);
    }
    const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);
    const adapter = await MarketplaceService.getAdapter(connection);
    return adapter.listListings(accessToken, { status, limit });
  }
  static async stageListings(userId, marketplaceType, status = "all", limit = 100) {
    const connection = await MarketplaceService.getConnection(userId, marketplaceType);
    if (!connection || !connection.isConnected) throw new Error(`Marketplace ${marketplaceType} n\xE3o est\xE1 conectado`);
    const listings = await this.previewListings(userId, marketplaceType, status, Math.min(limit, 200));
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let staged = 0;
    for (const listing of listings) {
      const match = await MatchingService.match(userId, listing);
      await db.insert(listingImportStaging).values({ userId, marketplaceConnectionId: connection.id, externalListingId: listing.listingId, payload: JSON.stringify(listing), normalizedTitle: listing.title.trim().toLowerCase(), suggestedProductId: match.productId ?? void 0, matchConfidence: match.confidence, matchClass: match.matchClass, matchReason: match.reason, matchEvidence: JSON.stringify({ evidence: match.evidence ?? [], candidateGap: match.candidateGap }), matchCandidates: JSON.stringify(match.candidates ?? []), status: "pending" }).onDuplicateKeyUpdate({ set: { payload: JSON.stringify(listing), suggestedProductId: match.productId ?? null, matchConfidence: match.confidence, matchClass: match.matchClass, matchReason: match.reason, matchEvidence: JSON.stringify({ evidence: match.evidence ?? [], candidateGap: match.candidateGap }), matchCandidates: JSON.stringify(match.candidates ?? []), updatedAt: /* @__PURE__ */ new Date() } });
      staged++;
    }
    return { staged };
  }
  static async listStaged(userId, status = "pending") {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const condition = status === "all" ? eq4(listingImportStaging.userId, userId) : and3(eq4(listingImportStaging.userId, userId), eq4(listingImportStaging.status, status));
    return db.select().from(listingImportStaging).where(condition).limit(200);
  }
};

// server/services/matchingPolicy.ts
function canLinkMatch({ matchClass, stagingStatus }) {
  if (matchClass === "unmatched") return { allowed: false, reason: "An\xFAncio sem correspond\xEAncia n\xE3o pode ser vinculado automaticamente" };
  if (matchClass === "conflict") return { allowed: false, reason: "Conflito de matching exige resolu\xE7\xE3o antes do v\xEDnculo" };
  if (matchClass === "probable" && stagingStatus !== "reviewed") return { allowed: false, reason: "Correspond\xEAncia prov\xE1vel exige revis\xE3o humana antes do v\xEDnculo" };
  if (matchClass !== "exact" && matchClass !== "probable") return { allowed: false, reason: "Classe de matching inv\xE1lida" };
  return { allowed: true };
}

// server/routers/marketplace.ts
var pendingOAuthStates = /* @__PURE__ */ new Map();
var OAUTH_STATE_TTL_MS = 10 * 60 * 1e3;
function cleanupExpiredStates() {
  const now = Date.now();
  pendingOAuthStates.forEach((entry, state) => {
    if (now - entry.createdAt > OAUTH_STATE_TTL_MS) {
      pendingOAuthStates.delete(state);
    }
  });
}
var marketplaceRouter = router({
  /**
   * Get all marketplace connections for the current user
   */
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connections = await MarketplaceService.getUserConnections(ctx.user.id);
      return connections.map((conn) => ({
        id: conn.id,
        marketplaceType: conn.marketplaceType,
        isConnected: conn.isConnected === 1,
        sellerName: conn.sellerName,
        lastSyncAt: conn.lastSyncAt,
        lastErrorAt: conn.lastErrorAt,
        lastErrorMessage: conn.lastErrorMessage,
        syncStatus: conn.syncStatus
      }));
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch connections"
      });
    }
  }),
  /**
   * Get OAuth authorization URL for a marketplace
   */
  getAuthorizationUrl: protectedProcedure.input(
    z2.object({
      marketplaceType: z2.enum(["mercadolivre", "shopee", "amazon", "tiktok"])
    })
  ).query(({ input, ctx }) => {
    try {
      if (!AdapterFactory.isSupported(input.marketplaceType)) {
        throw new Error(`Unsupported marketplace: ${input.marketplaceType}`);
      }
      const state = `${input.marketplaceType}::${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
      cleanupExpiredStates();
      pendingOAuthStates.set(state, { userId: ctx.user.id, createdAt: Date.now() });
      const credentials = {
        clientId: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_ID`] || "",
        clientSecret: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_SECRET`] || "",
        redirectUri: process.env.MARKETPLACE_REDIRECT_URI || "http://localhost:3000/api/marketplace/callback"
      };
      const adapter = AdapterFactory.createAdapter(input.marketplaceType, credentials);
      const authUrl = adapter.getAuthorizationUrl(state);
      return { authUrl, state };
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to generate authorization URL"
      });
    }
  }),
  /**
   * Handle OAuth callback and save connection
   */
  handleOAuthCallback: protectedProcedure.input(
    z2.object({
      marketplaceType: z2.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
      code: z2.string(),
      state: z2.string()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      if (!AdapterFactory.isSupported(input.marketplaceType)) {
        throw new Error(`Unsupported marketplace: ${input.marketplaceType}`);
      }
      const pending = pendingOAuthStates.get(input.state);
      if (!pending || pending.userId !== ctx.user.id) {
        throw new TRPCError3({
          code: "UNAUTHORIZED",
          message: "State inv\xE1lido ou expirado. Tente conectar novamente."
        });
      }
      pendingOAuthStates.delete(input.state);
      const credentials = {
        clientId: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_ID`] || "",
        clientSecret: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_SECRET`] || "",
        redirectUri: process.env.MARKETPLACE_REDIRECT_URI || "http://localhost:3000/api/marketplace/callback"
      };
      const adapter = AdapterFactory.createAdapter(input.marketplaceType, credentials);
      const tokens2 = await adapter.exchangeCodeForTokens(input.code);
      const sellerInfo = await adapter.validateAndGetSellerInfo(tokens2.accessToken);
      await MarketplaceService.upsertConnection(ctx.user.id, input.marketplaceType, {
        accessToken: tokens2.accessToken,
        refreshToken: tokens2.refreshToken,
        tokenExpiresAt: tokens2.expiresAt,
        sellerId: sellerInfo.sellerId,
        sellerName: sellerInfo.sellerName,
        isConnected: 1,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      });
      return {
        success: true,
        message: `Connected to ${input.marketplaceType}`,
        sellerName: sellerInfo.sellerName
      };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to connect marketplace"
      });
    }
  }),
  /**
   * Preview existing listings before linking them to the master catalog.
   */
  stageListings: protectedProcedure.input(z2.object({ marketplaceType: z2.enum(["mercadolivre", "shopee", "amazon", "tiktok"]), status: z2.string().max(30).default("all"), limit: z2.number().int().min(1).max(200).default(100) })).mutation(async ({ ctx, input }) => {
    try {
      return await ListingImportService.stageListings(ctx.user.id, input.marketplaceType, input.status, input.limit);
    } catch (error) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Falha ao gravar staging" });
    }
  }),
  analyzeStagedMatch: protectedProcedure.input(z2.object({ stagingId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      return await MatchingService.analyzeStaging(ctx.user.id, input.stagingId);
    } catch (error) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Falha no matching" });
    }
  }),
  listStagedListings: protectedProcedure.input(z2.object({ status: z2.enum(["all", "pending", "reviewed", "linked", "ignored"]).default("pending") })).query(({ ctx, input }) => ListingImportService.listStaged(ctx.user.id, input.status)),
  reviewStagedListing: protectedProcedure.input(z2.object({ stagingId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    const result = await db.update(listingImportStaging).set({ status: "reviewed", reviewedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and4(eq5(listingImportStaging.id, input.stagingId), eq5(listingImportStaging.userId, ctx.user.id)));
    return { success: true, result };
  }),
  ignoreStagedListing: protectedProcedure.input(z2.object({ stagingId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    const result = await db.update(listingImportStaging).set({ status: "ignored", reviewedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and4(eq5(listingImportStaging.id, input.stagingId), eq5(listingImportStaging.userId, ctx.user.id)));
    return { success: true, result };
  }),
  linkStagedListing: protectedProcedure.input(z2.object({ stagingId: z2.number().int().positive(), productId: z2.number().int().positive(), variantId: z2.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    const staged = await db.select().from(listingImportStaging).where(and4(eq5(listingImportStaging.id, input.stagingId), eq5(listingImportStaging.userId, ctx.user.id))).limit(1);
    if (!staged.length) throw new TRPCError3({ code: "NOT_FOUND", message: "An\xFAncio em staging n\xE3o encontrado" });
    const matchingPolicy = canLinkMatch({ matchClass: staged[0].matchClass, stagingStatus: staged[0].status });
    if (!matchingPolicy.allowed) throw new TRPCError3({ code: "PRECONDITION_FAILED", message: matchingPolicy.reason });
    const product = await db.select({ id: products.id }).from(products).where(and4(eq5(products.id, input.productId), eq5(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError3({ code: "NOT_FOUND", message: "Produto mestre n\xE3o encontrado" });
    if (input.variantId) {
      const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and4(eq5(productVariants.id, input.variantId), eq5(productVariants.productId, input.productId), eq5(productVariants.userId, ctx.user.id))).limit(1);
      if (!variant.length) throw new TRPCError3({ code: "BAD_REQUEST", message: "Variante inv\xE1lida para este Produto Mestre" });
    }
    const connection = await db.select({ id: listingImportStaging.marketplaceConnectionId }).from(listingImportStaging).where(eq5(listingImportStaging.id, input.stagingId)).limit(1);
    const listing = JSON.parse(staged[0].payload);
    const existing = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).where(and4(eq5(marketplaceListings.marketplaceConnectionId, connection[0].id), eq5(marketplaceListings.marketplaceListingId, listing.listingId))).limit(1);
    const values = { marketplaceConnectionId: connection[0].id, productId: input.productId, variantId: input.variantId, marketplaceListingId: listing.listingId, title: listing.title, description: listing.description, price: listing.price, stock: listing.stock, status: listing.status || "paused", listingUrl: listing.listingUrl, lastSyncedAt: /* @__PURE__ */ new Date() };
    if (existing.length) await db.update(marketplaceListings).set(values).where(eq5(marketplaceListings.id, existing[0].id));
    else await db.insert(marketplaceListings).values(values);
    await db.update(listingImportStaging).set({ suggestedProductId: input.productId, status: "linked", reviewedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and4(eq5(listingImportStaging.id, input.stagingId), eq5(listingImportStaging.userId, ctx.user.id)));
    return { success: true, action: existing.length ? "updated" : "linked" };
  }),
  previewListings: protectedProcedure.input(z2.object({
    marketplaceType: z2.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
    status: z2.string().max(30).default("all"),
    limit: z2.number().int().min(1).max(100).default(50)
  })).query(async ({ ctx, input }) => {
    try {
      return await ListingImportService.previewListings(ctx.user.id, input.marketplaceType, input.status, input.limit);
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Falha ao consultar an\xFAncios"
      });
    }
  }),
  /**
   * Confirm and link an imported external listing to a master product.
   * This never creates a new marketplace listing.
   */
  linkListing: protectedProcedure.input(z2.object({
    marketplaceType: z2.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
    listingId: z2.string().min(1).max(255),
    productId: z2.number().int().positive(),
    title: z2.string().max(500).optional(),
    description: z2.string().optional(),
    price: z2.number().int().min(0).optional(),
    stock: z2.number().int().min(0).optional(),
    status: z2.enum(["active", "paused", "inactive", "sold_out"]).default("paused"),
    listingUrl: z2.string().url().max(500).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    const connection = await MarketplaceService.getConnection(ctx.user.id, input.marketplaceType);
    if (!connection || connection.isConnected !== 1) throw new TRPCError3({ code: "NOT_FOUND", message: "Conex\xE3o do marketplace n\xE3o encontrada" });
    const product = await db.select({ id: products.id }).from(products).where(and4(eq5(products.id, input.productId), eq5(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError3({ code: "NOT_FOUND", message: "Produto mestre n\xE3o encontrado" });
    const existing = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).where(and4(
      eq5(marketplaceListings.marketplaceConnectionId, connection.id),
      eq5(marketplaceListings.marketplaceListingId, input.listingId)
    )).limit(1);
    const values = {
      marketplaceConnectionId: connection.id,
      productId: input.productId,
      marketplaceListingId: input.listingId,
      title: input.title,
      description: input.description,
      price: input.price,
      stock: input.stock,
      status: input.status,
      listingUrl: input.listingUrl,
      lastSyncedAt: /* @__PURE__ */ new Date()
    };
    if (existing.length) {
      await db.update(marketplaceListings).set(values).where(eq5(marketplaceListings.id, existing[0].id));
      return { id: existing[0].id, action: "updated" };
    }
    const result = await db.insert(marketplaceListings).values(values);
    return { id: Number(result[0]?.insertId ?? 0), action: "linked" };
  }),
  /**
   * Disconnect a marketplace
   */
  disconnect: protectedProcedure.input(
    z2.object({
      marketplaceType: z2.enum(["mercadolivre", "shopee", "amazon", "tiktok"])
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      await MarketplaceService.disconnect(ctx.user.id, input.marketplaceType);
      return {
        success: true,
        message: `Disconnected from ${input.marketplaceType}`
      };
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to disconnect marketplace"
      });
    }
  }),
  /**
   * Get supported marketplaces
   */
  getSupportedMarketplaces: protectedProcedure.query(() => {
    return AdapterFactory.getSupportedMarketplaces().map((type) => ({
      type,
      name: {
        mercadolivre: "Mercado Livre",
        shopee: "Shopee",
        amazon: "Amazon",
        tiktok: "TikTok Shop"
      }[type]
    }));
  })
});

// server/routers/products.ts
import { z as z3 } from "zod";

// server/services/productSyncService.ts
import { and as and8, eq as eq9 } from "drizzle-orm";

// server/services/mediaResolver.ts
import { and as and5, eq as eq6 } from "drizzle-orm";
async function resolveProductMedia(userId, productId, variantId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(productMedia).where(and5(
    eq6(productMedia.userId, userId),
    eq6(productMedia.productId, productId),
    eq6(productMedia.status, "ready"),
    ...variantId ? [eq6(productMedia.variantId, variantId)] : []
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
import { and as and6, eq as eq7 } from "drizzle-orm";
async function runPublicationPreflight(userId, productId, marketplaceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const issues = [];
  const productRows = await db.select().from(products).where(and6(eq7(products.id, productId), eq7(products.userId, userId))).limit(1);
  const product = productRows[0];
  if (!product) issues.push({ code: "PRODUCT_NOT_FOUND", message: "Produto n\xE3o encontrado para esta conta", severity: "error" });
  if (product && !product.sku.trim()) issues.push({ code: "SKU_REQUIRED", message: "SKU \xE9 obrigat\xF3rio", severity: "error" });
  if (product && Number(product.basePrice ?? 0) <= 0) issues.push({ code: "SALE_PRICE_REQUIRED", message: "Pre\xE7o de venda deve ser maior que zero", severity: "error" });
  if (product && Number(product.stock ?? 0) < 0) issues.push({ code: "STOCK_INVALID", message: "Estoque n\xE3o pode ser negativo", severity: "error" });
  const mapping = product?.category ? await db.select().from(marketplaceCategoryMappings).where(and6(
    eq7(marketplaceCategoryMappings.userId, userId),
    eq7(marketplaceCategoryMappings.marketplaceType, marketplaceType),
    eq7(marketplaceCategoryMappings.internalCategory, product.category)
  )).limit(1) : [];
  if (!mapping.length) issues.push({ code: "CATEGORY_MAPPING_REQUIRED", message: `Categoria '${product?.category || ""}' ainda n\xE3o est\xE1 mapeada para ${marketplaceType}`, severity: "error" });
  if (product) {
    const mediaCheck = validatePublicationMedia(await resolveProductMedia(userId, productId));
    for (const message of mediaCheck.issues) issues.push({ code: "MEDIA_INVALID", message, severity: "error" });
  }
  const connection = await MarketplaceService.getConnection(userId, marketplaceType);
  if (!connection?.isConnected) issues.push({ code: "CONNECTION_REQUIRED", message: "Marketplace n\xE3o est\xE1 conectado", severity: "error" });
  const openConflicts = await db.select({ id: syncConflicts.id }).from(syncConflicts).where(and6(
    eq7(syncConflicts.userId, userId),
    eq7(syncConflicts.productId, productId),
    eq7(syncConflicts.status, "open")
  )).limit(1);
  if (openConflicts.length) issues.push({ code: "OPEN_CONFLICT", message: "Resolva os conflitos abertos antes da publica\xE7\xE3o", severity: "error" });
  const seo = await db.select({ score: productSeoProfiles.score }).from(productSeoProfiles).where(and6(eq7(productSeoProfiles.userId, userId), eq7(productSeoProfiles.productId, productId), eq7(productSeoProfiles.channel, marketplaceType))).limit(1);
  if (!seo.length || Number(seo[0].score || 0) < 50) issues.push({ code: "SEO_LOW", message: "Perfil de SEO inexistente ou abaixo de 50 pontos", severity: "warning" });
  const errors = issues.filter((issue) => issue.severity === "error");
  const status = errors.length ? "blocked" : "ready";
  const score = Math.max(0, 100 - errors.length * 20 - (issues.length - errors.length) * 5);
  await db.insert(publicationPreflightResults).values({ userId, productId, marketplaceType, status, score, issues: JSON.stringify(issues) });
  return { status, score, issues, categoryId: mapping[0]?.externalCategoryId };
}

// server/services/attributeMappingService.ts
import { and as and7, eq as eq8 } from "drizzle-orm";
async function resolveMarketplaceAttributes(userId, productId, marketplaceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [sourceRows, mappingRows] = await Promise.all([
    db.select().from(productAttributes).where(and7(eq8(productAttributes.userId, userId), eq8(productAttributes.productId, productId))),
    db.select().from(marketplaceAttributeMappings).where(and7(eq8(marketplaceAttributeMappings.userId, userId), eq8(marketplaceAttributeMappings.marketplaceType, marketplaceType)))
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
      const product = await db.select().from(products).where(and8(eq9(products.id, productId), eq9(products.userId, userId))).limit(1);
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
        and8(
          eq9(marketplaceConnections.id, marketplaceConnectionId),
          eq9(marketplaceConnections.userId, userId)
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
        and8(
          eq9(marketplaceConnections.id, marketplaceConnectionId),
          eq9(marketplaceConnections.userId, userId)
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
    let query = db.select().from(syncLogs).where(eq9(syncLogs.userId, userId));
    if (productId) {
      query = query.where(eq9(syncLogs.productId, productId));
    }
    return query.limit(limit);
  }
};

// server/routers/products.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { and as and9, eq as eq10 } from "drizzle-orm";

// server/services/auditService.ts
async function writeAudit(input) {
  if (process.env.NODE_ENV === "test") return;
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, before: input.before === void 0 ? null : JSON.stringify(input.before), after: input.after === void 0 ? null : JSON.stringify(input.after), origin: input.origin || "system", ip: input.ip, result: input.result || "success" });
}

// server/routers/products.ts
var productFields = {
  sku: z3.string().trim().min(1, "SKU \xE9 obrigat\xF3rio").max(100),
  name: z3.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(255),
  category: z3.string().trim().max(100).optional(),
  brand: z3.string().trim().max(100).optional(),
  description: z3.string().trim().max(1e4).optional(),
  costBase: z3.number().int().min(0).default(0),
  basePrice: z3.number().int().min(0).default(0),
  weightBase: z3.number().int().min(0).default(0),
  height: z3.number().int().min(0).default(0),
  width: z3.number().int().min(0).default(0),
  length: z3.number().int().min(0).default(0),
  ncm: z3.string().max(20).optional(),
  cest: z3.string().max(20).optional(),
  origin: z3.string().max(30).optional(),
  mpn: z3.string().max(100).optional(),
  stock: z3.number().int().min(0).default(0),
  minStock: z3.number().int().min(0).default(0)
};
var productInput = z3.object(productFields);
var productsRouter = router({
  /**
   * Publish a product to a specific marketplace
   */
  publishToMarketplace: protectedProcedure.input(
    z3.object({
      productId: z3.number(),
      marketplaceType: z3.enum(["mercadolivre", "shopee", "amazon", "tiktok"])
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const result = await ProductSyncService.publishProductToMarketplace(
        ctx.user.id,
        input.productId,
        input.marketplaceType
      );
      if (!result.success) {
        throw new TRPCError4({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to publish product"
        });
      }
      return {
        success: true,
        listingId: result.listingId,
        message: `Product published to ${input.marketplaceType}`
      };
    } catch (error) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to publish product"
      });
    }
  }),
  /**
   * Publish a product to all connected marketplaces
   */
  publishToAllMarketplaces: protectedProcedure.input(z3.object({ productId: z3.number() })).mutation(async ({ ctx, input }) => {
    try {
      const result = await ProductSyncService.publishProductToAllMarketplaces(
        ctx.user.id,
        input.productId
      );
      return {
        successful: result.successful,
        failed: result.failed,
        message: `Published to ${result.successful.length} marketplace(s)`
      };
    } catch (error) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to publish product"
      });
    }
  }),
  /**
   * Update product price on a marketplace
   */
  updatePrice: protectedProcedure.input(
    z3.object({
      listingId: z3.string(),
      marketplaceConnectionId: z3.number(),
      newPrice: z3.number()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const result = await ProductSyncService.updatePriceOnMarketplace(
        ctx.user.id,
        input.listingId,
        input.marketplaceConnectionId,
        input.newPrice
      );
      if (!result.success) {
        throw new TRPCError4({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to update price"
        });
      }
      return { success: true, message: "Price updated successfully" };
    } catch (error) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to update price"
      });
    }
  }),
  /**
   * Update product stock on a marketplace
   */
  updateStock: protectedProcedure.input(
    z3.object({
      listingId: z3.string(),
      marketplaceConnectionId: z3.number(),
      newStock: z3.number()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const result = await ProductSyncService.updateStockOnMarketplace(
        ctx.user.id,
        input.listingId,
        input.marketplaceConnectionId,
        input.newStock
      );
      if (!result.success) {
        throw new TRPCError4({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to update stock"
        });
      }
      return { success: true, message: "Stock updated successfully" };
    } catch (error) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to update stock"
      });
    }
  }),
  /**
   * Get sync history for a product
   */
  getSyncHistory: protectedProcedure.input(z3.object({ productId: z3.number().optional(), limit: z3.number().default(50) })).query(async ({ ctx, input }) => {
    try {
      const history = await ProductSyncService.getSyncHistory(
        ctx.user.id,
        input.productId,
        input.limit
      );
      return history;
    } catch (error) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch sync history"
      });
    }
  }),
  /**
   * List products for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const userProducts = await db.select().from(products).where(eq10(products.userId, ctx.user.id));
      return userProducts;
    } catch (error) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch products"
      });
    }
  }),
  /**
   * Get a specific product
   */
  get: protectedProcedure.input(z3.object({ id: z3.number() })).query(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const product = await db.select().from(products).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id))).limit(1);
      if (product.length === 0) {
        throw new TRPCError4({
          code: "NOT_FOUND",
          message: "Product not found"
        });
      }
      return product[0];
    } catch (error) {
      if (error instanceof TRPCError4) throw error;
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch product"
      });
    }
  }),
  /**
   * Create a new product
   */
  create: protectedProcedure.input(productInput).mutation(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const duplicate = await db.select({ id: products.id }).from(products).where(and9(eq10(products.userId, ctx.user.id), eq10(products.sku, input.sku))).limit(1);
      if (duplicate[0]) throw new TRPCError4({ code: "CONFLICT", message: "J\xE1 existe um produto com este SKU" });
      const result = await db.insert(products).values({ userId: ctx.user.id, ...input });
      const id = Number(result[0]?.insertId ?? 0);
      await writeAudit({ userId: ctx.user.id, action: "create_product", entity: "product", entityId: id, after: input, origin: "admin" });
      return { id, success: true, message: "Product created successfully" };
    } catch (error) {
      if (error instanceof TRPCError4) throw error;
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to create product"
      });
    }
  }),
  /**
   * Update a product
   */
  update: protectedProcedure.input(z3.object({ id: z3.number().int().positive(), ...productFields }).partial({ sku: true, name: true, category: true, brand: true, description: true, costBase: true, stock: true, minStock: true }).extend({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = {};
      if (input.sku !== void 0) updateData.sku = input.sku;
      if (input.name !== void 0) updateData.name = input.name;
      if (input.category !== void 0) updateData.category = input.category;
      if (input.brand !== void 0) updateData.brand = input.brand;
      if (input.description !== void 0) updateData.description = input.description;
      if (input.costBase !== void 0) updateData.costBase = input.costBase;
      if (input.basePrice !== void 0) updateData.basePrice = input.basePrice;
      if (input.weightBase !== void 0) updateData.weightBase = input.weightBase;
      if (input.height !== void 0) updateData.height = input.height;
      if (input.width !== void 0) updateData.width = input.width;
      if (input.length !== void 0) updateData.length = input.length;
      if (input.ncm !== void 0) updateData.ncm = input.ncm;
      if (input.cest !== void 0) updateData.cest = input.cest;
      if (input.origin !== void 0) updateData.origin = input.origin;
      if (input.mpn !== void 0) updateData.mpn = input.mpn;
      if (input.stock !== void 0) updateData.stock = input.stock;
      if (input.minStock !== void 0) updateData.minStock = input.minStock;
      const current = await db.select({ id: products.id }).from(products).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id))).limit(1);
      if (!current[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
      if (input.sku !== void 0) {
        const duplicate = await db.select({ id: products.id }).from(products).where(and9(eq10(products.userId, ctx.user.id), eq10(products.sku, input.sku))).limit(1);
        if (duplicate[0] && duplicate[0].id !== input.id) throw new TRPCError4({ code: "CONFLICT", message: "J\xE1 existe um produto com este SKU" });
      }
      if (Object.keys(updateData).length === 0) {
        throw new TRPCError4({ code: "BAD_REQUEST", message: "Informe ao menos um campo para atualizar" });
      }
      const before = await db.select().from(products).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id))).limit(1);
      await db.update(products).set(updateData).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id)));
      await writeAudit({ userId: ctx.user.id, action: "update_product", entity: "product", entityId: input.id, before: before[0], after: updateData, origin: "admin" });
      return { success: true, message: "Product updated successfully" };
    } catch (error) {
      if (error instanceof TRPCError4) throw error;
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to update product"
      });
    }
  }),
  remove: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const current = await db.select({ id: products.id }).from(products).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id))).limit(1);
      if (!current[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
      const before = await db.select().from(products).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id))).limit(1);
      await db.delete(products).where(and9(eq10(products.id, input.id), eq10(products.userId, ctx.user.id)));
      await writeAudit({ userId: ctx.user.id, action: "delete_product", entity: "product", entityId: input.id, before: before[0], origin: "admin" });
      return { success: true, message: "Product removed successfully" };
    } catch (error) {
      if (error instanceof TRPCError4) throw error;
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to remove product"
      });
    }
  })
});

// server/routers/orders.ts
import { z as z4 } from "zod";

// server/services/orderSyncService.ts
import { and as and11, eq as eq12 } from "drizzle-orm";

// server/services/inventoryService.ts
import { and as and10, eq as eq11, inArray as inArray2, lt, sql } from "drizzle-orm";
var InventoryService = class {
  static async available(userId, productId, variantId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const reserved = await db.select({ total: sql`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(and10(
      eq11(inventoryReservations.userId, userId),
      eq11(inventoryReservations.productId, productId),
      variantId ? eq11(inventoryReservations.variantId, variantId) : sql`${inventoryReservations.variantId} is null`,
      inArray2(inventoryReservations.status, ["reserved", "confirmed"])
    ));
    if (variantId) {
      const variant = await db.select({ stock: productVariants.stock }).from(productVariants).where(and10(eq11(productVariants.id, variantId), eq11(productVariants.userId, userId), eq11(productVariants.productId, productId))).limit(1);
      if (!variant.length) throw new Error("Variante n\xE3o encontrada");
      return { stock: variant[0].stock, reserved: Number(reserved[0]?.total ?? 0), available: Math.max(0, variant[0].stock - Number(reserved[0]?.total ?? 0)) };
    }
    const product = await db.select({ stock: products.stock }).from(products).where(and10(eq11(products.id, productId), eq11(products.userId, userId))).limit(1);
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
    if (input.variantId) await db.update(productVariants).set({ reservedStock: sql`${productVariants.reservedStock} + ${input.quantity}` }).where(and10(eq11(productVariants.id, input.variantId), eq11(productVariants.userId, input.userId)));
    return { id: Number(result[0]?.insertId ?? 0), availableAfter: available.available - input.quantity };
  }
  static async releaseExpired(userId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const expired = await db.select({ id: inventoryReservations.id }).from(inventoryReservations).where(and10(eq11(inventoryReservations.userId, userId), eq11(inventoryReservations.status, "reserved"), lt(inventoryReservations.expiresAt, /* @__PURE__ */ new Date())));
    for (const reservation of expired) await this.changeStatus(userId, reservation.id, "expired");
    return { released: expired.length };
  }
  static async changeStatus(userId, reservationId, status) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(inventoryReservations).where(and10(eq11(inventoryReservations.id, reservationId), eq11(inventoryReservations.userId, userId), eq11(inventoryReservations.status, "reserved"))).limit(1);
    if (!rows.length) throw new Error("Reserva n\xE3o encontrada ou j\xE1 processada");
    const reservation = rows[0];
    await db.update(inventoryReservations).set({ status, releasedAt: status === "released" || status === "expired" ? /* @__PURE__ */ new Date() : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq11(inventoryReservations.id, reservationId));
    if (reservation.variantId && (status === "released" || status === "expired")) await db.update(productVariants).set({ reservedStock: sql`greatest(0, ${productVariants.reservedStock} - ${reservation.quantity})` }).where(and10(eq11(productVariants.id, reservation.variantId), eq11(productVariants.userId, userId)));
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
            and11(
              eq12(orders.marketplaceOrderId, order.orderId),
              eq12(orders.userId, userId),
              eq12(orders.marketplaceConnectionId, connection.id)
            )
          ).limit(1);
          if (existing.length > 0) {
            await db.update(orders).set({
              status: order.status,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq12(orders.id, existing[0].id));
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
                const variant = item.sku ? await db.select({ id: productVariants.id, productId: productVariants.productId }).from(productVariants).where(and11(eq12(productVariants.userId, userId), eq12(productVariants.sku, item.sku))).limit(1) : [];
                if (variant.length) return { orderId: newOrderId, productId: variant[0].productId, marketplaceItemId: item.itemId, title: item.title, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice, variantId: variant[0].id };
                const product = item.sku ? await db.select({ id: products.id }).from(products).where(and11(eq12(products.userId, userId), eq12(products.sku, item.sku))).limit(1) : [];
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
    return db.select().from(orders).where(eq12(orders.userId, userId)).limit(limit).orderBy((t2) => t2.orderDate);
  }
  /**
   * Get order items for an order
   */
  static async getOrderItems(orderId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(orderItems).where(eq12(orderItems.orderId, orderId));
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
      }).where(and11(eq12(orders.id, orderId), eq12(orders.userId, userId)));
      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      return false;
    }
  }
};

// server/routers/orders.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
var ordersRouter = router({
  /**
   * Import orders from a specific marketplace
   */
  importFromMarketplace: protectedProcedure.input(
    z4.object({
      marketplaceType: z4.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
      since: z4.date().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const result = await OrderSyncService.importOrdersFromMarketplace(
        ctx.user.id,
        input.marketplaceType,
        input.since
      );
      if (result.error) {
        throw new TRPCError5({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error
        });
      }
      return {
        imported: result.imported,
        failed: result.failed,
        message: `Imported ${result.imported} order(s)`
      };
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to import orders"
      });
    }
  }),
  /**
   * Import orders from all connected marketplaces
   */
  importFromAllMarketplaces: protectedProcedure.input(z4.object({ since: z4.date().optional() })).mutation(async ({ ctx, input }) => {
    try {
      const result = await OrderSyncService.importOrdersFromAllMarketplaces(ctx.user.id, input.since);
      return {
        totalImported: result.totalImported,
        totalFailed: result.totalFailed,
        byMarketplace: result.byMarketplace,
        message: `Imported ${result.totalImported} order(s) from all marketplaces`
      };
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to import orders"
      });
    }
  }),
  /**
   * Get orders for the current user
   */
  list: protectedProcedure.input(z4.object({ limit: z4.number().default(50) })).query(async ({ ctx, input }) => {
    try {
      const orders2 = await OrderSyncService.getUserOrders(ctx.user.id, input.limit);
      return orders2;
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch orders"
      });
    }
  }),
  /**
   * Get order items for a specific order
   */
  getItems: protectedProcedure.input(z4.object({ orderId: z4.number() })).query(async ({ ctx, input }) => {
    try {
      const items = await OrderSyncService.getOrderItems(input.orderId);
      return items;
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch order items"
      });
    }
  }),
  /**
   * Update order status
   */
  updateStatus: protectedProcedure.input(
    z4.object({
      orderId: z4.number(),
      newStatus: z4.string()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const success = await OrderSyncService.updateOrderStatus(ctx.user.id, input.orderId, input.newStatus);
      if (!success) {
        throw new TRPCError5({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update order status"
        });
      }
      return { success: true, message: "Order status updated" };
    } catch (error) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to update order status"
      });
    }
  })
});

// server/routers/catalog.ts
import { and as and12, desc, eq as eq13, inArray as inArray3, sql as sql2 } from "drizzle-orm";
import { z as z5 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
var positiveInt = z5.number().int().min(0);
var moneyInCents = z5.number().int().min(0);
function requireDatabase(db) {
  if (!db) {
    throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
  }
  return db;
}
var insumosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(insumos).where(eq13(insumos.userId, ctx.user.id)).orderBy(desc(insumos.updatedAt));
  }),
  create: protectedProcedure.input(z5.object({
    name: z5.string().trim().min(2).max(255),
    internalCode: z5.string().trim().max(100).optional(),
    cost: moneyInCents.default(0),
    weight: positiveInt.default(0),
    stock: positiveInt.default(0),
    minStock: positiveInt.default(0),
    idealStock: positiveInt.default(0),
    addToPlating: z5.boolean().default(false)
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const result = await db.insert(insumos).values({
      userId: ctx.user.id,
      name: input.name,
      internalCode: input.internalCode || null,
      cost: input.cost,
      weight: input.weight,
      stock: input.stock,
      minStock: input.minStock,
      idealStock: input.idealStock,
      addToPlating: input.addToPlating ? 1 : 0
    });
    return { id: Number(result[0]?.insertId ?? 0), success: true };
  }),
  update: protectedProcedure.input(z5.object({
    id: z5.number().int().positive(),
    name: z5.string().trim().min(2).max(255).optional(),
    internalCode: z5.string().trim().max(100).nullable().optional(),
    cost: moneyInCents.optional(),
    weight: positiveInt.optional(),
    stock: positiveInt.optional(),
    minStock: positiveInt.optional(),
    idealStock: positiveInt.optional(),
    addToPlating: z5.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { id, ...fields } = input;
    const updateData = { ...fields };
    if (fields.addToPlating !== void 0) updateData.addToPlating = fields.addToPlating ? 1 : 0;
    await db.update(insumos).set(updateData).where(and12(eq13(insumos.id, id), eq13(insumos.userId, ctx.user.id)));
    return { success: true };
  }),
  remove: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(insumos).where(and12(eq13(insumos.id, input.id), eq13(insumos.userId, ctx.user.id)));
    return { success: true };
  })
});
var banhosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(banhos).where(eq13(banhos.userId, ctx.user.id)).orderBy(desc(banhos.updatedAt));
  }),
  create: protectedProcedure.input(z5.object({
    name: z5.string().trim().min(2).max(255),
    metal: z5.string().trim().max(100).optional(),
    color: z5.string().trim().max(100).optional(),
    milesimos: positiveInt.default(0),
    quotation: moneyInCents.default(0),
    operationalTax: positiveInt.default(0),
    labor: moneyInCents.default(0),
    technicalLoss: positiveInt.default(0),
    technicalMargin: positiveInt.default(0),
    pricePerGram: moneyInCents.default(0)
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const result = await db.insert(banhos).values({ userId: ctx.user.id, ...input });
    return { id: Number(result[0]?.insertId ?? 0), success: true };
  }),
  update: protectedProcedure.input(z5.object({
    id: z5.number().int().positive(),
    name: z5.string().trim().min(2).max(255).optional(),
    metal: z5.string().trim().max(100).nullable().optional(),
    color: z5.string().trim().max(100).nullable().optional(),
    milesimos: positiveInt.optional(),
    quotation: moneyInCents.optional(),
    operationalTax: positiveInt.optional(),
    labor: moneyInCents.optional(),
    technicalLoss: positiveInt.optional(),
    technicalMargin: positiveInt.optional(),
    pricePerGram: moneyInCents.optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { id, ...fields } = input;
    await db.update(banhos).set(fields).where(and12(eq13(banhos.id, id), eq13(banhos.userId, ctx.user.id)));
    return { success: true };
  }),
  remove: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(banhos).where(and12(eq13(banhos.id, input.id), eq13(banhos.userId, ctx.user.id)));
    return { success: true };
  })
});
var kitItemInput = z5.object({
  productId: z5.number().int().positive().nullable().optional(),
  insumoId: z5.number().int().positive().nullable().optional(),
  quantity: positiveInt.min(1),
  unitCost: moneyInCents.default(0)
}).superRefine((item, issue) => {
  if (!item.productId && !item.insumoId) {
    issue.addIssue({ code: z5.ZodIssueCode.custom, path: ["productId"], message: "Informe um produto ou insumo" });
  }
  if (item.productId && item.insumoId) {
    issue.addIssue({ code: z5.ZodIssueCode.custom, path: ["productId"], message: "Escolha produto ou insumo, n\xE3o os dois" });
  }
});
var kitInput = z5.object({
  sku: z5.string().trim().min(1).max(100),
  name: z5.string().trim().min(2).max(255),
  description: z5.string().trim().max(1e4).optional(),
  costBase: moneyInCents.default(0),
  weightBase: positiveInt.default(0),
  marginTarget: positiveInt.default(0),
  marginType: z5.enum(["perc", "fixed"]).default("perc"),
  stock: positiveInt.default(0),
  status: z5.enum(["active", "inactive", "archived"]).default("active"),
  items: z5.array(kitItemInput).default([])
});
async function verifyKitOwner(db, kitId, userId) {
  const rows = await db.select({ id: kits.id }).from(kits).where(and12(eq13(kits.id, kitId), eq13(kits.userId, userId))).limit(1);
  if (!rows[0]) throw new TRPCError6({ code: "NOT_FOUND", message: "Kit n\xE3o encontrado" });
}
function calculateKitTotals(items) {
  if (!items.length) return { costBase: 0, stock: 0 };
  const costBase = items.reduce((total, item) => total + item.unitCost * item.quantity, 0);
  const stock = Math.min(...items.map((item) => Math.floor(item.availableStock / item.quantity)));
  return { costBase, stock: Number.isFinite(stock) ? stock : 0 };
}
async function calculateKitComposition(db, userId, items) {
  if (!items.length) return { items: [], costBase: 0, stock: 0 };
  const productIds = items.flatMap((item) => item.productId ? [item.productId] : []);
  const insumoIds = items.flatMap((item) => item.insumoId ? [item.insumoId] : []);
  const [productRows, insumoRows] = await Promise.all([
    productIds.length ? db.select().from(products).where(and12(eq13(products.userId, userId), inArray3(products.id, productIds))) : [],
    insumoIds.length ? db.select().from(insumos).where(and12(eq13(insumos.userId, userId), inArray3(insumos.id, insumoIds))) : []
  ]);
  const productMap = new Map(productRows.map((row) => [row.id, row]));
  const insumoMap = new Map(insumoRows.map((row) => [row.id, row]));
  const normalizedItems = items.map((item) => {
    const component = item.productId ? productMap.get(item.productId) : insumoMap.get(item.insumoId);
    if (!component) throw new TRPCError6({ code: "BAD_REQUEST", message: "Um dos componentes n\xE3o pertence ao usu\xE1rio ou n\xE3o existe" });
    const unitCost = item.productId ? Number(component.costBase ?? 0) : Number(component.cost ?? 0);
    return { ...item, unitCost, availableStock: Number(component.stock ?? 0) };
  });
  const totals = calculateKitTotals(normalizedItems);
  return { items: normalizedItems.map(({ availableStock: _availableStock, ...item }) => item), ...totals };
}
var kitsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(kits).where(eq13(kits.userId, ctx.user.id)).orderBy(desc(kits.updatedAt));
  }),
  getItems: protectedProcedure.input(z5.object({ kitId: z5.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await verifyKitOwner(db, input.kitId, ctx.user.id);
    return db.select().from(kitItems).where(eq13(kitItems.kitId, input.kitId)).orderBy(kitItems.id);
  }),
  create: protectedProcedure.input(kitInput).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { items, ...kitData } = input;
    const composition = await calculateKitComposition(db, ctx.user.id, items);
    const result = await db.insert(kits).values({
      userId: ctx.user.id,
      ...kitData,
      costBase: items.length ? composition.costBase : kitData.costBase,
      stock: items.length ? composition.stock : kitData.stock
    });
    const kitId = Number(result[0]?.insertId ?? 0);
    if (kitId && composition.items.length) {
      await db.insert(kitItems).values(composition.items.map((item) => ({ kitId, ...item })));
    }
    return { id: kitId, success: true, calculatedCostBase: items.length ? composition.costBase : kitData.costBase, calculatedStock: items.length ? composition.stock : kitData.stock };
  }),
  update: protectedProcedure.input(kitInput.partial().extend({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await verifyKitOwner(db, input.id, ctx.user.id);
    const { id, items, ...fields } = input;
    const updateData = { ...fields };
    let calculated = {};
    if (items) {
      const composition = await calculateKitComposition(db, ctx.user.id, items);
      calculated = { costBase: composition.costBase, stock: composition.stock };
      updateData.costBase = composition.costBase;
      updateData.stock = composition.stock;
      await db.delete(kitItems).where(eq13(kitItems.kitId, id));
      if (composition.items.length) await db.insert(kitItems).values(composition.items.map((item) => ({ kitId: id, ...item })));
    }
    if (Object.keys(updateData).length) await db.update(kits).set(updateData).where(eq13(kits.id, id));
    return { success: true, ...calculated };
  }),
  remove: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await verifyKitOwner(db, input.id, ctx.user.id);
    await db.delete(kits).where(eq13(kits.id, input.id));
    return { success: true };
  })
});
var financeiroRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(financeiro).where(eq13(financeiro.userId, ctx.user.id)).orderBy(desc(financeiro.date));
  }),
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    const rows = await db.select({ type: financeiro.type, total: sql2`COALESCE(SUM(${financeiro.amount}), 0)` }).from(financeiro).where(eq13(financeiro.userId, ctx.user.id)).groupBy(financeiro.type);
    const income = Number(rows.find((row) => row.type === "income")?.total ?? 0);
    const expense = Number(rows.find((row) => row.type === "expense")?.total ?? 0);
    return { income, expense, balance: income - expense };
  }),
  create: protectedProcedure.input(z5.object({
    description: z5.string().trim().min(2).max(255),
    type: z5.enum(["income", "expense"]),
    amount: moneyInCents.min(1),
    date: z5.coerce.date().optional(),
    category: z5.string().trim().max(100).optional(),
    notes: z5.string().trim().max(5e3).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const result = await db.insert(financeiro).values({ userId: ctx.user.id, ...input });
    return { id: Number(result[0]?.insertId ?? 0), success: true };
  }),
  update: protectedProcedure.input(z5.object({
    id: z5.number().int().positive(),
    description: z5.string().trim().min(2).max(255).optional(),
    type: z5.enum(["income", "expense"]).optional(),
    amount: moneyInCents.min(1).optional(),
    date: z5.coerce.date().optional(),
    category: z5.string().trim().max(100).nullable().optional(),
    notes: z5.string().trim().max(5e3).nullable().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { id, ...fields } = input;
    await db.update(financeiro).set(fields).where(and12(eq13(financeiro.id, id), eq13(financeiro.userId, ctx.user.id)));
    return { success: true };
  }),
  remove: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(financeiro).where(and12(eq13(financeiro.id, input.id), eq13(financeiro.userId, ctx.user.id)));
    return { success: true };
  })
});
var seoRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(seoSettings).where(eq13(seoSettings.userId, ctx.user.id)).orderBy(seoSettings.pageKey);
  }),
  upsert: protectedProcedure.input(z5.object({
    pageKey: z5.string().trim().min(1).max(100),
    title: z5.string().trim().min(1).max(255),
    description: z5.string().trim().max(5e3).optional(),
    keywords: z5.string().trim().max(500).optional(),
    canonicalUrl: z5.string().trim().url().or(z5.literal("")).optional(),
    ogImageUrl: z5.string().trim().url().or(z5.literal("")).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const existing = await db.select({ id: seoSettings.id }).from(seoSettings).where(and12(eq13(seoSettings.userId, ctx.user.id), eq13(seoSettings.pageKey, input.pageKey))).limit(1);
    if (existing[0]) {
      await db.update(seoSettings).set(input).where(eq13(seoSettings.id, existing[0].id));
      return { id: existing[0].id, success: true };
    }
    const result = await db.insert(seoSettings).values({ userId: ctx.user.id, ...input });
    return { id: Number(result[0]?.insertId ?? 0), success: true };
  }),
  remove: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(seoSettings).where(and12(eq13(seoSettings.id, input.id), eq13(seoSettings.userId, ctx.user.id)));
    return { success: true };
  })
});
var liveRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(liveStreams).where(eq13(liveStreams.userId, ctx.user.id)).orderBy(desc(liveStreams.scheduledAt));
  }),
  create: protectedProcedure.input(z5.object({
    title: z5.string().trim().min(2).max(255),
    platform: z5.string().trim().min(2).max(100),
    scheduledAt: z5.coerce.date().optional(),
    status: z5.enum(["planned", "scheduled", "live", "finished", "cancelled"]).default("planned"),
    link: z5.string().trim().url().or(z5.literal("")).optional(),
    notes: z5.string().trim().max(5e3).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const result = await db.insert(liveStreams).values({ userId: ctx.user.id, ...input });
    return { id: Number(result[0]?.insertId ?? 0), success: true };
  }),
  update: protectedProcedure.input(z5.object({
    id: z5.number().int().positive(),
    title: z5.string().trim().min(2).max(255).optional(),
    platform: z5.string().trim().min(2).max(100).optional(),
    scheduledAt: z5.coerce.date().nullable().optional(),
    status: z5.enum(["planned", "scheduled", "live", "finished", "cancelled"]).optional(),
    link: z5.string().trim().url().or(z5.literal("")).nullable().optional(),
    notes: z5.string().trim().max(5e3).nullable().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { id, ...fields } = input;
    await db.update(liveStreams).set(fields).where(and12(eq13(liveStreams.id, id), eq13(liveStreams.userId, ctx.user.id)));
    return { success: true };
  }),
  remove: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(liveStreams).where(and12(eq13(liveStreams.id, input.id), eq13(liveStreams.userId, ctx.user.id)));
    return { success: true };
  })
});
var inventoryRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    const [productRows, insumoRows, kitRows] = await Promise.all([
      db.select().from(products).where(eq13(products.userId, ctx.user.id)),
      db.select().from(insumos).where(eq13(insumos.userId, ctx.user.id)),
      db.select().from(kits).where(eq13(kits.userId, ctx.user.id))
    ]);
    return {
      products: productRows,
      insumos: insumoRows,
      kits: kitRows,
      lowStockProducts: productRows.filter((item) => (item.stock ?? 0) <= (item.minStock ?? 0)),
      lowStockInsumos: insumoRows.filter((item) => (item.stock ?? 0) <= (item.minStock ?? 0))
    };
  })
});
var catalogRouter = router({
  insumos: insumosRouter,
  banhos: banhosRouter,
  kits: kitsRouter,
  financeiro: financeiroRouter,
  seo: seoRouter,
  live: liveRouter,
  inventory: inventoryRouter
});

// server/routers/pricing.ts
import { z as z6 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";
import { and as and13, eq as eq14 } from "drizzle-orm";
var channelFields = {
  name: z6.string().trim().min(1, "Nome \xE9 obrigat\xF3rio").max(100),
  marketplaceType: z6.string().trim().max(50).optional(),
  commissionBp: z6.number().int().min(0).max(1e4).default(0),
  // 0 a 100,00%
  fixedFeeCents: z6.number().int().min(0).default(0),
  shippingCostCents: z6.number().int().min(0).default(0),
  taxBp: z6.number().int().min(0).max(1e4).default(0),
  isActive: z6.boolean().default(true)
};
function calcularPrecoSugerido(params) {
  const comm = params.commissionBp / 1e4;
  const tax = params.taxBp / 1e4;
  const baseCosts = params.costCents + params.fixedFeeCents + params.shippingCostCents;
  let suggestedPrice = null;
  if (params.marginMode === "percent") {
    const margin = params.marginValue / 1e4;
    const denom = 1 - comm - tax - margin;
    if (denom > 0) {
      suggestedPrice = Math.ceil(baseCosts / denom);
    }
  } else {
    const denom = 1 - comm - tax;
    if (denom > 0) {
      suggestedPrice = Math.ceil((baseCosts + params.marginValue) / denom);
    }
  }
  return suggestedPrice;
}
function calcularMargemReal(params) {
  const comm = params.commissionBp / 1e4;
  const tax = params.taxBp / 1e4;
  const commissionValue = Math.round(params.price * comm);
  const taxValue = Math.round(params.price * tax);
  const netRevenue = params.price - commissionValue - taxValue - params.fixedFeeCents - params.shippingCostCents;
  const profitCents = netRevenue - params.costCents;
  const marginPercentOfPrice = params.price > 0 ? Math.round(profitCents / params.price * 1e4) : 0;
  const markupPercentOfCost = params.costCents > 0 ? Math.round(profitCents / params.costCents * 1e4) : 0;
  return {
    profitCents,
    marginPercentOfPrice,
    // pontos-base sobre o preço de venda
    markupPercentOfCost,
    // pontos-base sobre o custo (markup)
    commissionValue,
    taxValue
  };
}
var pricingRouter = router({
  channels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
      return db.select().from(salesChannels).where(eq14(salesChannels.userId, ctx.user.id));
    }),
    create: protectedProcedure.input(z6.object(channelFields)).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
      const result = await db.insert(salesChannels).values({
        userId: ctx.user.id,
        name: input.name,
        marketplaceType: input.marketplaceType,
        commissionBp: input.commissionBp,
        fixedFeeCents: input.fixedFeeCents,
        shippingCostCents: input.shippingCostCents,
        taxBp: input.taxBp,
        isActive: input.isActive ? 1 : 0
      });
      const insertId = Number(result[0]?.insertId ?? 0);
      return { id: insertId };
    }),
    update: protectedProcedure.input(z6.object({ id: z6.number().int(), ...channelFields })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
      const { id, ...rest } = input;
      await db.update(salesChannels).set({
        name: rest.name,
        marketplaceType: rest.marketplaceType,
        commissionBp: rest.commissionBp,
        fixedFeeCents: rest.fixedFeeCents,
        shippingCostCents: rest.shippingCostCents,
        taxBp: rest.taxBp,
        isActive: rest.isActive ? 1 : 0
      }).where(and13(eq14(salesChannels.id, id), eq14(salesChannels.userId, ctx.user.id)));
      return { success: true };
    }),
    remove: protectedProcedure.input(z6.object({ id: z6.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
      await db.delete(salesChannels).where(and13(eq14(salesChannels.id, input.id), eq14(salesChannels.userId, ctx.user.id)));
      return { success: true };
    })
  }),
  /**
   * Calcula, para cada canal ativo do usuário (ou os IDs informados), o preço
   * sugerido para bater a margem desejada e a margem real resultante.
   */
  calculate: protectedProcedure.input(
    z6.object({
      productId: z6.number().int().optional(),
      costCents: z6.number().int().min(0).optional(),
      marginMode: z6.enum(["percent", "fixed"]).default("percent"),
      marginValue: z6.number().int().min(0),
      // percent: pontos-base; fixed: centavos
      channelIds: z6.array(z6.number().int()).optional(),
      roundPsychological: z6.boolean().default(false)
      // arredonda pra terminar em ,90
    })
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let costCents = input.costCents ?? 0;
    if (input.productId) {
      const rows = await db.select().from(products).where(and13(eq14(products.id, input.productId), eq14(products.userId, ctx.user.id))).limit(1);
      if (rows.length === 0) {
        throw new TRPCError7({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
      }
      costCents = rows[0].costBase ?? 0;
    }
    const allChannels = await db.select().from(salesChannels).where(eq14(salesChannels.userId, ctx.user.id));
    const channels = allChannels.filter((c) => {
      if (input.channelIds && input.channelIds.length > 0) return input.channelIds.includes(c.id);
      return c.isActive === 1;
    });
    const results = channels.map((channel) => {
      let suggestedPrice = calcularPrecoSugerido({
        costCents,
        commissionBp: channel.commissionBp,
        fixedFeeCents: channel.fixedFeeCents,
        shippingCostCents: channel.shippingCostCents,
        taxBp: channel.taxBp,
        marginMode: input.marginMode,
        marginValue: input.marginValue
      });
      if (suggestedPrice !== null && input.roundPsychological) {
        const reais = Math.ceil(suggestedPrice / 100);
        suggestedPrice = reais * 100 - 10;
        if (suggestedPrice < costCents) suggestedPrice = Math.ceil(costCents / 100) * 100 - 10;
      }
      const real = suggestedPrice !== null ? calcularMargemReal({
        price: suggestedPrice,
        costCents,
        commissionBp: channel.commissionBp,
        fixedFeeCents: channel.fixedFeeCents,
        shippingCostCents: channel.shippingCostCents,
        taxBp: channel.taxBp
      }) : null;
      return {
        channelId: channel.id,
        channelName: channel.name,
        costCents,
        suggestedPriceCents: suggestedPrice,
        impossivel: suggestedPrice === null,
        ...real
      };
    });
    return results;
  }),
  /**
   * Dado um preço já definido, calcula a margem líquida real por canal
   * (útil pra conferir preços já praticados, não só sugerir novos).
   */
  evaluate: protectedProcedure.input(
    z6.object({
      priceCents: z6.number().int().min(0),
      costCents: z6.number().int().min(0),
      channelIds: z6.array(z6.number().int()).optional()
    })
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const allChannels = await db.select().from(salesChannels).where(eq14(salesChannels.userId, ctx.user.id));
    const channels = allChannels.filter(
      (c) => input.channelIds && input.channelIds.length > 0 ? input.channelIds.includes(c.id) : c.isActive === 1
    );
    return channels.map((channel) => {
      const real = calcularMargemReal({
        price: input.priceCents,
        costCents: input.costCents,
        commissionBp: channel.commissionBp,
        fixedFeeCents: channel.fixedFeeCents,
        shippingCostCents: channel.shippingCostCents,
        taxBp: channel.taxBp
      });
      return {
        channelId: channel.id,
        channelName: channel.name,
        priceCents: input.priceCents,
        costCents: input.costCents,
        ...real
      };
    });
  })
});

// server/routers/omnichannel.ts
import { and as and15, desc as desc2, eq as eq16 } from "drizzle-orm";
import { z as z7 } from "zod";

// server/services/syncJobService.ts
import { and as and14, eq as eq15, lte } from "drizzle-orm";

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
      and14(eq15(syncJobs.userId, userId), eq15(syncJobs.status, "pending"), lte(syncJobs.nextRunAt, /* @__PURE__ */ new Date()))
    ).limit(Math.min(limit, 50));
    const results = [];
    for (const job of jobs) {
      await db.update(syncJobs).set({ status: "processing", lockedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(
        and14(eq15(syncJobs.id, job.id), eq15(syncJobs.status, "pending"))
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
          const connection = await db.select().from(marketplaceConnections).where(eq15(marketplaceConnections.id, job.marketplaceConnectionId)).limit(1);
          if (!connection.length) throw new Error("Conex\xE3o do marketplace n\xE3o encontrada");
          await OrderSyncService.importOrdersFromMarketplace(userId, connection[0].marketplaceType);
        } else {
          throw new Error(`Tipo de job ainda n\xE3o suportado pelo worker: ${job.type}`);
        }
        await db.update(syncJobs).set({ status: "completed", completedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq15(syncJobs.id, job.id));
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
        }).where(eq15(syncJobs.id, job.id));
        results.push({ id: job.id, status: terminal ? "failed" : "retrying", error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { processed: results.length, results };
  }
};

// server/routers/omnichannel.ts
import { TRPCError as TRPCError8 } from "@trpc/server";
var requireDb = async () => {
  const db = await getDb();
  if (!db) {
    throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
  }
  return db;
};
var omnichannelRouter = router({
  listMedia: protectedProcedure.input(z7.object({ productId: z7.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    return db.select({ media: productMedia }).from(productMedia).innerJoin(products, eq16(products.id, productMedia.productId)).where(and15(
      eq16(productMedia.userId, ctx.user.id),
      eq16(productMedia.productId, input.productId),
      eq16(products.userId, ctx.user.id)
    )).orderBy(productMedia.sortOrder, productMedia.id);
  }),
  addMedia: protectedProcedure.input(z7.object({
    productId: z7.number().int().positive(),
    kind: z7.enum(["image", "video"]),
    url: z7.string().url().max(1e3),
    storageKey: z7.string().max(500).optional(),
    altText: z7.string().max(500).optional(),
    sortOrder: z7.number().int().min(0).default(0),
    isCover: z7.boolean().default(false),
    metadata: z7.record(z7.string(), z7.unknown()).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const product = await db.select({ id: products.id }).from(products).where(
      and15(eq16(products.id, input.productId), eq16(products.userId, ctx.user.id))
    ).limit(1);
    if (!product.length) throw new TRPCError8({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
    if (input.isCover) {
      await db.update(productMedia).set({ isCover: 0 }).where(
        and15(eq16(productMedia.productId, input.productId), eq16(productMedia.userId, ctx.user.id))
      );
    }
    const result = await db.insert(productMedia).values({
      userId: ctx.user.id,
      productId: input.productId,
      kind: input.kind,
      url: input.url,
      storageKey: input.storageKey,
      altText: input.altText,
      sortOrder: input.sortOrder,
      isCover: input.isCover ? 1 : 0,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });
    return { id: Number(result[0]?.insertId ?? 0) };
  }),
  removeMedia: protectedProcedure.input(z7.object({ id: z7.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.delete(productMedia).where(
      and15(eq16(productMedia.id, input.id), eq16(productMedia.userId, ctx.user.id))
    );
    return { success: Number(result[0]?.affectedRows ?? 0) > 0 };
  }),
  enqueueSync: protectedProcedure.input(z7.object({
    type: z7.enum(["import_listing", "publish", "price", "stock", "order"]),
    marketplaceConnectionId: z7.number().int().positive().optional(),
    productId: z7.number().int().positive().optional(),
    orderId: z7.number().int().positive().optional(),
    payload: z7.record(z7.string(), z7.unknown()).optional(),
    idempotencyKey: z7.string().min(8).max(255)
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await db.select({ id: syncJobs.id }).from(syncJobs).where(
      and15(eq16(syncJobs.userId, ctx.user.id), eq16(syncJobs.idempotencyKey, input.idempotencyKey))
    ).limit(1);
    if (existing.length) return { id: existing[0].id, duplicate: true };
    const result = await db.insert(syncJobs).values({
      userId: ctx.user.id,
      marketplaceConnectionId: input.marketplaceConnectionId,
      productId: input.productId,
      orderId: input.orderId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload ? JSON.stringify(input.payload) : null
    });
    return { id: Number(result[0]?.insertId ?? 0), duplicate: false };
  }),
  processPendingJobs: protectedProcedure.input(z7.object({ limit: z7.number().int().min(1).max(50).default(10) })).mutation(async ({ ctx, input }) => SyncJobService.processPending(ctx.user.id, input.limit)),
  listJobs: protectedProcedure.input(z7.object({ limit: z7.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    return db.select().from(syncJobs).where(eq16(syncJobs.userId, ctx.user.id)).orderBy(desc2(syncJobs.createdAt)).limit(input.limit);
  })
});

// server/routers/seoAdvanced.ts
import { and as and16, eq as eq17 } from "drizzle-orm";
import { z as z8 } from "zod";
import { TRPCError as TRPCError9 } from "@trpc/server";
var channelSchema = z8.enum(["store", "mercadolivre", "shopee"]);
var profileInput = z8.object({
  productId: z8.number().int().positive(),
  channel: channelSchema.default("store"),
  slug: z8.string().max(255).optional(),
  seoTitle: z8.string().max(255).optional(),
  metaDescription: z8.string().max(320).optional(),
  focusKeyword: z8.string().max(150).optional(),
  secondaryKeywords: z8.array(z8.string().max(80)).max(20).default([]),
  altText: z8.string().max(500).optional(),
  canonicalUrl: z8.string().url().max(500).optional(),
  status: z8.enum(["draft", "approved", "published"]).default("draft")
});
function analyze(input, product) {
  const issues = [];
  let score = 0;
  const title = input.seoTitle?.trim() ?? "";
  const description = input.metaDescription?.trim() ?? "";
  const keyword = input.focusKeyword?.trim().toLowerCase() ?? "";
  const productName = product.name.toLowerCase();
  if (title.length >= 30 && title.length <= 60) score += 20;
  else issues.push("T\xEDtulo SEO deve ter entre 30 e 60 caracteres.");
  if (description.length >= 120 && description.length <= 160) score += 20;
  else issues.push("Meta description deve ter entre 120 e 160 caracteres.");
  if (keyword && title.toLowerCase().includes(keyword)) score += 15;
  else issues.push("Palavra-chave principal deve aparecer no t\xEDtulo SEO.");
  if (keyword && (productName.includes(keyword) || (product.description ?? "").toLowerCase().includes(keyword))) score += 15;
  else issues.push("Palavra-chave deve aparecer no conte\xFAdo do produto.");
  if (input.secondaryKeywords.length >= 2) score += 10;
  else issues.push("Adicione pelo menos duas palavras-chave secund\xE1rias.");
  if (input.altText?.trim() && (product.photoUrl || input.channel !== "store")) score += 10;
  else issues.push("Defina texto alternativo para a imagem principal.");
  if (input.channel !== "store" || input.canonicalUrl) score += 10;
  else issues.push("Defina URL can\xF4nica para a p\xE1gina da loja.");
  return { score, issues };
}
var seoAdvancedRouter = router({
  get: protectedProcedure.input(z8.object({ productId: z8.number().int().positive(), channel: channelSchema.default("store") })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const rows = await db.select().from(productSeoProfiles).where(and16(eq17(productSeoProfiles.userId, ctx.user.id), eq17(productSeoProfiles.productId, input.productId), eq17(productSeoProfiles.channel, input.channel))).limit(1);
    return rows[0] ?? null;
  }),
  analyze: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const productRows = await db.select({ name: products.name, description: products.description, photoUrl: products.photoUrl }).from(products).where(and16(eq17(products.id, input.productId), eq17(products.userId, ctx.user.id))).limit(1);
    if (!productRows.length) throw new TRPCError9({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
    const result = analyze(input, productRows[0]);
    return { ...result, schemaJson: buildProductSchema(input, productRows[0]) };
  }),
  save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const productRows = await db.select({ name: products.name, description: products.description, photoUrl: products.photoUrl }).from(products).where(and16(eq17(products.id, input.productId), eq17(products.userId, ctx.user.id))).limit(1);
    if (!productRows.length) throw new TRPCError9({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
    const result = analyze(input, productRows[0]);
    const schemaJson = buildProductSchema(input, productRows[0]);
    const existing = await db.select({ id: productSeoProfiles.id }).from(productSeoProfiles).where(and16(eq17(productSeoProfiles.userId, ctx.user.id), eq17(productSeoProfiles.productId, input.productId), eq17(productSeoProfiles.channel, input.channel))).limit(1);
    const values = { userId: ctx.user.id, productId: input.productId, channel: input.channel, slug: input.slug, seoTitle: input.seoTitle, metaDescription: input.metaDescription, focusKeyword: input.focusKeyword, secondaryKeywords: JSON.stringify(input.secondaryKeywords), altText: input.altText, canonicalUrl: input.canonicalUrl, schemaJson, score: result.score, issues: JSON.stringify(result.issues), status: input.status };
    if (existing.length) {
      await db.update(productSeoProfiles).set({ ...values, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(productSeoProfiles.id, existing[0].id));
      return { id: existing[0].id, ...result, schemaJson };
    }
    const inserted = await db.insert(productSeoProfiles).values(values);
    return { id: Number(inserted[0]?.insertId ?? 0), ...result, schemaJson };
  })
});
function buildProductSchema(input, product) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? void 0,
    image: product.photoUrl ? [product.photoUrl] : void 0,
    url: input.canonicalUrl ?? void 0,
    offers: { "@type": "Offer", availability: "https://schema.org/InStock" }
  });
}

// server/routers/inventory.ts
import { z as z9 } from "zod";
var inventoryRouter2 = router({
  available: protectedProcedure.input(z9.object({ productId: z9.number().int().positive(), variantId: z9.number().int().positive().optional() })).query(({ ctx, input }) => InventoryService.available(ctx.user.id, input.productId, input.variantId)),
  reserve: protectedProcedure.input(z9.object({ productId: z9.number().int().positive(), variantId: z9.number().int().positive().optional(), orderId: z9.number().int().positive().optional(), quantity: z9.number().int().positive(), expiresAt: z9.coerce.date().optional() })).mutation(({ ctx, input }) => InventoryService.reserve({ userId: ctx.user.id, ...input })),
  release: protectedProcedure.input(z9.object({ reservationId: z9.number().int().positive(), status: z9.enum(["released", "expired"]) })).mutation(({ ctx, input }) => InventoryService.changeStatus(ctx.user.id, input.reservationId, input.status)),
  confirm: protectedProcedure.input(z9.object({ reservationId: z9.number().int().positive() })).mutation(({ ctx, input }) => InventoryService.changeStatus(ctx.user.id, input.reservationId, "confirmed")),
  releaseExpired: protectedProcedure.mutation(({ ctx }) => InventoryService.releaseExpired(ctx.user.id))
});

// server/routers/catalogEnhancements.ts
import { and as and17, eq as eq18 } from "drizzle-orm";
import { z as z10 } from "zod";
import { TRPCError as TRPCError10 } from "@trpc/server";
var variantInput = z10.object({ productId: z10.number().int().positive(), sku: z10.string().trim().min(1).max(100), gtin: z10.string().max(50).optional(), name: z10.string().max(255).optional(), attributes: z10.record(z10.string(), z10.string()).default({}), price: z10.number().int().min(0).default(0), stock: z10.number().int().min(0).default(0), status: z10.enum(["active", "inactive"]).default("active") });
var variantUpdateInput = z10.object({ id: z10.number().int().positive(), sku: z10.string().trim().min(1).max(100).optional(), gtin: z10.string().max(50).optional(), name: z10.string().max(255).optional(), attributes: z10.record(z10.string(), z10.string()).optional(), price: z10.number().int().min(0).optional(), stock: z10.number().int().min(0).optional(), status: z10.enum(["active", "inactive"]).optional() });
var catalogEnhancementsRouter = router({
  listVariants: protectedProcedure.input(z10.object({ productId: z10.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(productVariants).where(and17(eq18(productVariants.userId, ctx.user.id), eq18(productVariants.productId, input.productId)));
  }),
  createVariant: protectedProcedure.input(variantInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const product = await db.select({ id: products.id }).from(products).where(and17(eq18(products.id, input.productId), eq18(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError10({ code: "NOT_FOUND", message: "Produto mestre n\xE3o encontrado" });
    const duplicate = await db.select({ id: productVariants.id }).from(productVariants).where(and17(eq18(productVariants.userId, ctx.user.id), eq18(productVariants.sku, input.sku))).limit(1);
    if (duplicate.length) throw new TRPCError10({ code: "CONFLICT", message: "SKU de variante j\xE1 cadastrado" });
    const result = await db.insert(productVariants).values({ userId: ctx.user.id, productId: input.productId, sku: input.sku, gtin: input.gtin, name: input.name, attributes: JSON.stringify(input.attributes), price: input.price, stock: input.stock, status: input.status });
    return { id: Number(result[0]?.insertId ?? 0) };
  }),
  updateVariant: protectedProcedure.input(variantUpdateInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const current = await db.select().from(productVariants).where(and17(eq18(productVariants.id, input.id), eq18(productVariants.userId, ctx.user.id))).limit(1);
    if (!current.length) throw new TRPCError10({ code: "NOT_FOUND", message: "Variante n\xE3o encontrada" });
    const values = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.sku !== void 0) values.sku = input.sku;
    if (input.gtin !== void 0) values.gtin = input.gtin;
    if (input.name !== void 0) values.name = input.name;
    if (input.attributes !== void 0) values.attributes = JSON.stringify(input.attributes);
    if (input.price !== void 0) values.price = input.price;
    if (input.stock !== void 0) values.stock = input.stock;
    if (input.status !== void 0) values.status = input.status;
    await db.update(productVariants).set(values).where(and17(eq18(productVariants.id, input.id), eq18(productVariants.userId, ctx.user.id)));
    return { success: true };
  }),
  removeVariant: protectedProcedure.input(z10.object({ id: z10.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(productVariants).where(and17(eq18(productVariants.id, input.id), eq18(productVariants.userId, ctx.user.id)));
    return { success: true };
  }),
  listAttributes: protectedProcedure.input(z10.object({ productId: z10.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(productAttributes).where(and17(eq18(productAttributes.userId, ctx.user.id), eq18(productAttributes.productId, input.productId)));
  }),
  upsertAttribute: protectedProcedure.input(z10.object({ productId: z10.number().int().positive(), namespace: z10.string().max(50).default("catalog"), name: z10.string().min(1).max(150), value: z10.string().max(1e4) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const product = await db.select({ id: products.id }).from(products).where(and17(eq18(products.id, input.productId), eq18(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError10({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
    const result = await db.insert(productAttributes).values({ userId: ctx.user.id, ...input });
    return { id: Number(result[0]?.insertId ?? 0) };
  })
});

// server/routers/dataTools.ts
import { and as and18, eq as eq19 } from "drizzle-orm";
import { z as z11 } from "zod";
import { TRPCError as TRPCError11 } from "@trpc/server";
var importRow = z11.object({ sku: z11.string().trim().min(1).max(100), name: z11.string().trim().min(2).max(255), description: z11.string().max(1e4).optional(), category: z11.string().max(100).optional(), brand: z11.string().max(100).optional(), stock: z11.number().int().min(0).default(0), costBase: z11.number().int().min(0).default(0), minStock: z11.number().int().min(0).default(0) });
var dataToolsRouter = router({
  exportCatalog: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const rows = await db.select().from(products).where(eq19(products.userId, ctx.user.id));
    const variants = await db.select().from(productVariants).where(eq19(productVariants.userId, ctx.user.id));
    const seo = await db.select().from(productSeoProfiles).where(eq19(productSeoProfiles.userId, ctx.user.id));
    return { version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), products: rows, variants, seo };
  }),
  importCatalog: protectedProcedure.input(z11.object({ rows: z11.array(importRow).min(1).max(2e3), mode: z11.enum(["create_only", "upsert"]).default("upsert") })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let created = 0;
    let updated = 0;
    const errors = [];
    for (const row of input.rows) {
      try {
        const existing = await db.select({ id: products.id }).from(products).where(and18(eq19(products.userId, ctx.user.id), eq19(products.sku, row.sku))).limit(1);
        if (existing.length) {
          if (input.mode === "create_only") throw new Error("SKU j\xE1 existe");
          await db.update(products).set({ ...row, updatedAt: /* @__PURE__ */ new Date() }).where(and18(eq19(products.id, existing[0].id), eq19(products.userId, ctx.user.id)));
          updated++;
        } else {
          await db.insert(products).values({ userId: ctx.user.id, ...row });
          created++;
        }
      } catch (error) {
        errors.push({ sku: row.sku, message: error instanceof Error ? error.message : String(error) });
      }
    }
    return { created, updated, failed: errors.length, errors };
  })
});

// server/routers/operations.ts
import { and as and19, desc as desc3, eq as eq20, sql as sql3 } from "drizzle-orm";
import { z as z12 } from "zod";
import { TRPCError as TRPCError12 } from "@trpc/server";
var operationsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [jobs, recentJobs, logs, webhooks, reservations] = await Promise.all([
      db.select({ status: syncJobs.status, count: sql3`count(*)` }).from(syncJobs).where(eq20(syncJobs.userId, ctx.user.id)).groupBy(syncJobs.status),
      db.select().from(syncJobs).where(eq20(syncJobs.userId, ctx.user.id)).orderBy(desc3(syncJobs.createdAt)).limit(50),
      db.select().from(syncLogs).where(eq20(syncLogs.userId, ctx.user.id)).orderBy(desc3(syncLogs.createdAt)).limit(30),
      db.select().from(webhookEvents).where(eq20(webhookEvents.userId, ctx.user.id)).orderBy(desc3(webhookEvents.createdAt)).limit(30),
      db.select({ status: inventoryReservations.status, quantity: sql3`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(eq20(inventoryReservations.userId, ctx.user.id)).groupBy(inventoryReservations.status)
    ]);
    return { jobs, recentJobs, logs, webhooks, reservations };
  }),
  retryJob: protectedProcedure.input(z12.object({ jobId: z12.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const result = await db.update(syncJobs).set({ status: "pending", nextRunAt: /* @__PURE__ */ new Date(), errorMessage: null, updatedAt: /* @__PURE__ */ new Date() }).where(and19(eq20(syncJobs.id, input.jobId), eq20(syncJobs.userId, ctx.user.id)));
    return { success: Number(result[0]?.affectedRows ?? 0) > 0 };
  })
});

// server/routers/conflicts.ts
import { and as and20, desc as desc4, eq as eq21 } from "drizzle-orm";
import { z as z13 } from "zod";
import { TRPCError as TRPCError13 } from "@trpc/server";
var conflictsRouter = router({
  list: protectedProcedure.input(z13.object({ status: z13.enum(["open", "resolved", "ignored"]).default("open") })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(syncConflicts).where(and20(eq21(syncConflicts.userId, ctx.user.id), eq21(syncConflicts.status, input.status))).orderBy(desc4(syncConflicts.createdAt)).limit(200);
  }),
  resolve: protectedProcedure.input(z13.object({ id: z13.number().int().positive(), resolution: z13.enum(["use_luary", "use_marketplace", "keep_both", "manual", "ignore"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const current = await db.select().from(syncConflicts).where(and20(eq21(syncConflicts.id, input.id), eq21(syncConflicts.userId, ctx.user.id), eq21(syncConflicts.status, "open"))).limit(1);
    if (!current.length) throw new TRPCError13({ code: "NOT_FOUND", message: "Conflito n\xE3o encontrado" });
    await db.update(syncConflicts).set({ status: input.resolution === "ignore" ? "ignored" : "resolved", resolution: input.resolution, resolvedBy: ctx.user.id, resolvedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and20(eq21(syncConflicts.id, input.id), eq21(syncConflicts.userId, ctx.user.id)));
    await writeAudit({ userId: ctx.user.id, action: "resolve_conflict", entity: "sync_conflict", entityId: input.id, before: current[0], after: { status: input.resolution === "ignore" ? "ignored" : "resolved", resolution: input.resolution }, origin: "admin" });
    return { success: true };
  })
});

// server/routers/identifiers.ts
import { and as and21, eq as eq22 } from "drizzle-orm";
import { z as z14 } from "zod";
import { TRPCError as TRPCError14 } from "@trpc/server";
var identifierType = z14.enum(["SKU", "EAN", "GTIN", "MPN", "UPC", "INTERNAL", "SUPPLIER"]);
var identifiersRouter = router({
  list: protectedProcedure.input(z14.object({ productId: z14.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(productIdentifiers).where(and21(eq22(productIdentifiers.userId, ctx.user.id), eq22(productIdentifiers.productId, input.productId)));
  }),
  add: protectedProcedure.input(z14.object({ productId: z14.number().int().positive(), variantId: z14.number().int().positive().optional(), type: identifierType, value: z14.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const product = await db.select({ id: products.id }).from(products).where(and21(eq22(products.id, input.productId), eq22(products.userId, ctx.user.id))).limit(1);
    if (!product.length) throw new TRPCError14({ code: "NOT_FOUND", message: "Produto n\xE3o encontrado" });
    if (input.variantId) {
      const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and21(eq22(productVariants.id, input.variantId), eq22(productVariants.productId, input.productId), eq22(productVariants.userId, ctx.user.id))).limit(1);
      if (!variant.length) throw new TRPCError14({ code: "NOT_FOUND", message: "Variante n\xE3o encontrada" });
    }
    const duplicate = await db.select({ id: productIdentifiers.id }).from(productIdentifiers).where(and21(eq22(productIdentifiers.userId, ctx.user.id), eq22(productIdentifiers.type, input.type), eq22(productIdentifiers.value, input.value))).limit(1);
    if (duplicate.length) throw new TRPCError14({ code: "CONFLICT", message: "Identificador j\xE1 utilizado nesta conta" });
    const result = await db.insert(productIdentifiers).values({ userId: ctx.user.id, ...input });
    const id = Number(result[0]?.insertId ?? 0);
    await writeAudit({ userId: ctx.user.id, action: "add_identifier", entity: "product_identifier", entityId: id, after: input, origin: "admin" });
    return { id };
  }),
  remove: protectedProcedure.input(z14.object({ id: z14.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const current = await db.select().from(productIdentifiers).where(and21(eq22(productIdentifiers.id, input.id), eq22(productIdentifiers.userId, ctx.user.id))).limit(1);
    if (!current.length) throw new TRPCError14({ code: "NOT_FOUND", message: "Identificador n\xE3o encontrado" });
    await db.delete(productIdentifiers).where(and21(eq22(productIdentifiers.id, input.id), eq22(productIdentifiers.userId, ctx.user.id)));
    await writeAudit({ userId: ctx.user.id, action: "remove_identifier", entity: "product_identifier", entityId: input.id, before: current[0], origin: "admin" });
    return { success: true };
  })
});

// server/routers/inventoryMovements.ts
import { z as z15 } from "zod";

// server/services/inventoryMovementService.ts
import { and as and22, eq as eq23, sql as sql4 } from "drizzle-orm";
var InventoryMovementService = class {
  static async apply(input) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantidade de movimenta\xE7\xE3o inv\xE1lida");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const delta = ["in", "cancel", "return"].includes(input.type) ? input.quantity : -input.quantity;
    let currentStock = 0;
    if (input.variantId) {
      const rows = await db.select({ id: productVariants.id, stock: productVariants.stock, productId: productVariants.productId }).from(productVariants).where(and22(eq23(productVariants.id, input.variantId), eq23(productVariants.productId, input.productId), eq23(productVariants.userId, input.userId))).limit(1);
      if (!rows.length) throw new Error("Variante n\xE3o encontrada");
      currentStock = rows[0].stock;
      if (!input.allowNegative && currentStock + delta < 0) throw new Error("Movimenta\xE7\xE3o resultaria em estoque negativo");
      await db.update(productVariants).set({ stock: sql4`${productVariants.stock} + ${delta}`, updatedAt: /* @__PURE__ */ new Date() }).where(and22(eq23(productVariants.id, input.variantId), eq23(productVariants.userId, input.userId)));
    } else {
      const rows = await db.select({ id: products.id, stock: products.stock }).from(products).where(and22(eq23(products.id, input.productId), eq23(products.userId, input.userId))).limit(1);
      if (!rows.length) throw new Error("Produto n\xE3o encontrado");
      currentStock = Number(rows[0].stock ?? 0);
      if (!input.allowNegative && currentStock + delta < 0) throw new Error("Movimenta\xE7\xE3o resultaria em estoque negativo");
      await db.update(products).set({ stock: sql4`${products.stock} + ${delta}`, updatedAt: /* @__PURE__ */ new Date() }).where(and22(eq23(products.id, input.productId), eq23(products.userId, input.userId)));
    }
    const result = await db.insert(inventoryMovements).values({ userId: input.userId, productId: input.productId, variantId: input.variantId, orderId: input.orderId, type: input.type, quantity: input.quantity, reason: input.reason, reference: input.reference });
    await writeAudit({ userId: input.userId, action: "inventory_movement", entity: input.variantId ? "product_variant" : "product", entityId: input.variantId || input.productId, before: { stock: currentStock }, after: { stock: currentStock + delta, type: input.type, quantity: input.quantity }, origin: "inventory" });
    return { id: Number(result[0]?.insertId ?? 0), previousStock: currentStock, newStock: currentStock + delta };
  }
};

// server/routers/inventoryMovements.ts
var inventoryMovementsRouter = router({
  applyMovement: protectedProcedure.input(z15.object({ productId: z15.number().int().positive(), variantId: z15.number().int().positive().optional(), orderId: z15.number().int().positive().optional(), type: z15.enum(["in", "out", "sale", "cancel", "return", "adjustment", "transfer"]), quantity: z15.number().int().positive(), reason: z15.string().max(255).optional(), reference: z15.string().max(255).optional(), allowNegative: z15.boolean().default(false) })).mutation(({ ctx, input }) => InventoryMovementService.apply({ userId: ctx.user.id, ...input }))
});

// server/routers/mappings.ts
import { z as z16 } from "zod";
import { and as and23, eq as eq24 } from "drizzle-orm";
var mappingsRouter = router({
  listCategoryMappings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(marketplaceCategoryMappings).where(eq24(marketplaceCategoryMappings.userId, ctx.user.id));
  }),
  upsertCategoryMapping: protectedProcedure.input(z16.object({
    marketplaceType: z16.string(),
    internalCategory: z16.string(),
    externalCategoryId: z16.string(),
    externalCategoryName: z16.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(marketplaceCategoryMappings).where(and23(
      eq24(marketplaceCategoryMappings.userId, ctx.user.id),
      eq24(marketplaceCategoryMappings.marketplaceType, input.marketplaceType),
      eq24(marketplaceCategoryMappings.internalCategory, input.internalCategory)
    )).limit(1);
    if (existing.length) {
      return db.update(marketplaceCategoryMappings).set({
        externalCategoryId: input.externalCategoryId,
        externalCategoryName: input.externalCategoryName
      }).where(eq24(marketplaceCategoryMappings.id, existing[0].id));
    }
    return db.insert(marketplaceCategoryMappings).values({
      userId: ctx.user.id,
      ...input
    });
  }),
  listAttributeMappings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(marketplaceAttributeMappings).where(eq24(marketplaceAttributeMappings.userId, ctx.user.id));
  }),
  upsertAttributeMapping: protectedProcedure.input(z16.object({
    marketplaceType: z16.string(),
    sourceName: z16.string(),
    externalName: z16.string(),
    valueMap: z16.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(marketplaceAttributeMappings).where(and23(
      eq24(marketplaceAttributeMappings.userId, ctx.user.id),
      eq24(marketplaceAttributeMappings.marketplaceType, input.marketplaceType),
      eq24(marketplaceAttributeMappings.sourceName, input.sourceName)
    )).limit(1);
    if (existing.length) {
      return db.update(marketplaceAttributeMappings).set({
        externalName: input.externalName,
        valueMap: input.valueMap
      }).where(eq24(marketplaceAttributeMappings.id, existing[0].id));
    }
    return db.insert(marketplaceAttributeMappings).values({
      userId: ctx.user.id,
      ...input
    });
  }),
  runPreflight: protectedProcedure.input(z16.object({
    productId: z16.number(),
    marketplaceType: z16.enum(["mercadolivre", "shopee", "amazon", "tiktok"])
  })).mutation(async ({ ctx, input }) => {
    return runPublicationPreflight(ctx.user.id, input.productId, input.marketplaceType);
  })
});

// server/routers/supply.ts
import { and as and27, desc as desc6, eq as eq28 } from "drizzle-orm";
import { TRPCError as TRPCError16 } from "@trpc/server";
import { z as z17 } from "zod";

// server/suppliers/supplierService.ts
import { and as and24, desc as desc5, eq as eq25 } from "drizzle-orm";
function requireDb2(db) {
  if (!db) throw new Error("Database not available");
  return db;
}
var SupplierService = class {
  static async list(userId) {
    const db = requireDb2(await getDb());
    return db.select().from(suppliers).where(eq25(suppliers.userId, userId)).orderBy(desc5(suppliers.updatedAt));
  }
  static async create(userId, input) {
    const db = requireDb2(await getDb());
    const result = await db.insert(suppliers).values({ ...input, userId });
    return Number(result[0]?.insertId ?? 0);
  }
  static async updateStatus(userId, supplierId, status) {
    const db = requireDb2(await getDb());
    const result = await db.update(suppliers).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(and24(eq25(suppliers.id, supplierId), eq25(suppliers.userId, userId)));
    if (!result[0]?.affectedRows) throw new Error("Fornecedor n\xE3o encontrado");
    return { success: true };
  }
  static async saveIntegration(userId, input) {
    const db = requireDb2(await getDb());
    const supplier = await db.select({ id: suppliers.id }).from(suppliers).where(and24(eq25(suppliers.id, input.supplierId), eq25(suppliers.userId, userId))).limit(1);
    if (!supplier.length) throw new Error("Fornecedor n\xE3o encontrado");
    const encryptedCredentials = input.credentials ? encryptData(JSON.stringify(input.credentials)) : void 0;
    const existing = await db.select({ id: supplierIntegrations.id }).from(supplierIntegrations).where(and24(eq25(supplierIntegrations.supplierId, input.supplierId), eq25(supplierIntegrations.userId, userId), eq25(supplierIntegrations.type, input.type))).limit(1);
    if (existing.length) {
      await db.update(supplierIntegrations).set({ status: "pending", ...encryptedCredentials ? { encryptedCredentials } : {}, updatedAt: /* @__PURE__ */ new Date() }).where(and24(eq25(supplierIntegrations.id, existing[0].id), eq25(supplierIntegrations.userId, userId)));
      return existing[0].id;
    }
    const result = await db.insert(supplierIntegrations).values({ userId, supplierId: input.supplierId, type: input.type, status: "pending", encryptedCredentials });
    return Number(result[0]?.insertId ?? 0);
  }
  static async listProducts(userId, supplierId) {
    const db = requireDb2(await getDb());
    return db.select().from(supplierProducts).where(supplierId ? and24(eq25(supplierProducts.userId, userId), eq25(supplierProducts.supplierId, supplierId)) : eq25(supplierProducts.userId, userId)).orderBy(desc5(supplierProducts.updatedAt));
  }
  static async upsertProduct(userId, input) {
    const db = requireDb2(await getDb());
    const supplier = await db.select({ id: suppliers.id }).from(suppliers).where(and24(eq25(suppliers.id, input.supplierId), eq25(suppliers.userId, userId))).limit(1);
    if (!supplier.length) throw new Error("Fornecedor n\xE3o encontrado");
    const existing = await db.select({ id: supplierProducts.id }).from(supplierProducts).where(and24(eq25(supplierProducts.userId, userId), eq25(supplierProducts.supplierId, input.supplierId), eq25(supplierProducts.externalId, input.externalId))).limit(1);
    if (existing.length) {
      await db.update(supplierProducts).set({ ...input, updatedAt: /* @__PURE__ */ new Date() }).where(and24(eq25(supplierProducts.id, existing[0].id), eq25(supplierProducts.userId, userId)));
      return { id: existing[0].id, created: false };
    }
    const result = await db.insert(supplierProducts).values({ ...input, userId });
    return { id: Number(result[0]?.insertId ?? 0), created: true };
  }
};

// server/supply/engines.ts
function calculateLandedCost(input) {
  const components = {
    supplierCostCents: Math.max(0, input.supplierCostCents),
    supplierShippingCents: Math.max(0, input.supplierShippingCents),
    marketplaceFeesCents: Math.max(0, input.marketplaceFeesCents ?? 0),
    paymentFeesCents: Math.max(0, input.paymentFeesCents ?? 0),
    taxesCents: Math.max(0, input.taxesCents ?? 0),
    operationalCostCents: Math.max(0, input.operationalCostCents ?? 0),
    packagingCents: Math.max(0, input.packagingCents ?? 0),
    expectedReturnCostCents: Math.max(0, input.expectedReturnCostCents ?? 0),
    riskReserveCents: Math.max(0, input.riskReserveCents ?? 0)
  };
  const realCostCents = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { ...components, realCostCents };
}
function calculateMargin(salePriceCents, landedCostCents, minimumMarginBp = 0) {
  const price = Math.max(0, salePriceCents);
  const cost = Math.max(0, landedCostCents);
  const marginCents = price - cost;
  const marginBp = price > 0 ? Math.round(marginCents / price * 1e4) : 0;
  return { salePriceCents: price, landedCostCents: cost, marginCents, marginBp, valid: price > 0 && marginCents >= 0 && marginBp >= minimumMarginBp };
}
function routeSupply(candidates, quantity = 1, mode = "dropshipping") {
  const scored = candidates.map((candidate) => {
    const availableStock = Math.max(0, candidate.stock - (candidate.reservedStock ?? 0) - (candidate.stockBuffer ?? 0));
    const modeAllowed = !candidate.allowedModes?.length || candidate.allowedModes.includes(mode) || mode === "hybrid";
    const score = Math.round(
      (availableStock > 0 ? 30 : 0) + Math.min(25, candidate.reliabilityBp / 1e4 * 25) + Math.max(0, 20 - Math.min(20, candidate.costCents / 100)) + Math.max(0, 15 - Math.min(15, candidate.shippingCents / 100)) + Math.max(0, 10 - Math.min(10, candidate.leadTimeDays)) - (candidate.stale ? 25 : 0) - (candidate.blocked || !modeAllowed ? 100 : 0) - Math.min(10, ((candidate.cancellationRateBp ?? 0) + (candidate.returnRateBp ?? 0)) / 1e3)
    );
    return { ...candidate, availableStock, score };
  }).sort((a, b) => b.score - a.score || a.priority - b.priority);
  const winner = scored.find((candidate) => !candidate.blocked && !candidate.stale && candidate.availableStock >= quantity && candidate.score > 0);
  return winner ? { supplierId: winner.supplierId, reason: "melhor combina\xE7\xE3o de estoque, custo, prazo, confiabilidade e risco", candidates: scored } : { supplierId: null, reason: "nenhum fornecedor aprovado possui estoque confi\xE1vel suficiente", candidates: scored };
}
function calculateSupplyScore(input) {
  const score = Math.round(
    Math.min(100, Math.max(0, input.marginBp / 100)) * 0.25 + Math.min(100, Math.max(0, input.stockScore)) * 0.2 + Math.min(100, Math.max(0, input.demandScore)) * 0.2 + Math.min(100, Math.max(0, input.supplierScore)) * 0.15 + Math.min(100, Math.max(0, input.leadTimeScore)) * 0.1 + Math.min(100, Math.max(0, input.riskScore)) * 0.1
  );
  return { score, classification: score >= 90 ? "hot" : score >= 75 ? "good" : score >= 60 ? "watch" : "risk" };
}
function calculateOpportunityScore(input) {
  const score = Math.round(
    input.demandScore * 0.25 + input.marginScore * 0.25 + input.supplierScore * 0.2 + input.seoScore * 0.1 + input.competitivenessScore * 0.1 - input.riskScore * 0.1
  );
  return { score: Math.max(0, Math.min(100, score)), classification: score >= 90 ? "hot" : score >= 75 ? "good" : score >= 60 ? "watch" : "risk" };
}

// server/sourcing/supplierMatchingService.ts
import { and as and25, eq as eq26 } from "drizzle-orm";

// server/supply/securityPolicy.ts
import { TRPCError as TRPCError15 } from "@trpc/server";
function assertVariantOwnership(input) {
  if (!input.variantExists || !input.ownerMatches || !input.productMatches) {
    throw new TRPCError15({ code: "BAD_REQUEST", message: "A variante n\xE3o pertence ao usu\xE1rio e ao Produto Mestre selecionado" });
  }
  return true;
}
function shouldAutoApproveExact(enabled) {
  return String(enabled ?? "false").toLowerCase() === "true";
}

// server/sourcing/supplierMatchingService.ts
function requireDb3(db) {
  if (!db) throw new Error("Database not available");
  return db;
}
var SupplierMatchingService = class {
  static async analyze(userId, supplierProductId) {
    const db = requireDb3(await getDb());
    const rows = await db.select().from(supplierProducts).where(and25(eq26(supplierProducts.id, supplierProductId), eq26(supplierProducts.userId, userId))).limit(1);
    if (!rows.length) throw new Error("Produto do fornecedor n\xE3o encontrado");
    const source = rows[0];
    let attributes = {};
    try {
      attributes = source.attributes ? JSON.parse(source.attributes) : {};
    } catch {
      attributes = {};
    }
    const result = await MatchingService.match(userId, {
      sku: source.sku ?? void 0,
      gtin: source.gtin ?? source.ean ?? void 0,
      mpn: source.mpn ?? void 0,
      internalCode: source.internalCode ?? void 0,
      title: source.name,
      brand: source.brand ?? void 0,
      attributes
    });
    const autoApproved = result.matchClass === "exact" && shouldAutoApproveExact(process.env.AUTO_APPROVE_EXACT);
    const status = autoApproved ? "approved" : "pending_review";
    const current = await db.select({ id: supplierProductMappings.id }).from(supplierProductMappings).where(and25(eq26(supplierProductMappings.userId, userId), eq26(supplierProductMappings.supplierProductId, supplierProductId))).limit(1);
    const values = { productId: result.productId ?? null, variantId: result.variantId ?? null, confidence: result.confidence, matchType: result.matchClass, status, ...autoApproved ? { reviewedAt: /* @__PURE__ */ new Date() } : {}, updatedAt: /* @__PURE__ */ new Date() };
    if (current.length) await db.update(supplierProductMappings).set(values).where(and25(eq26(supplierProductMappings.id, current[0].id), eq26(supplierProductMappings.userId, userId)));
    else await db.insert(supplierProductMappings).values({ ...values, userId, supplierProductId });
    return { ...result, reviewRequired: !autoApproved, status };
  }
  static canApprove(matchClass, reviewed) {
    return reviewed && ["exact", "probable"].includes(matchClass);
  }
};

// server/suppliers/supplierConnectionService.ts
import { and as and26, eq as eq27 } from "drizzle-orm";

// server/suppliers/manualAdapter.ts
var ManualSupplierAdapter = class {
  type = "manual";
  capabilities = ["CATALOG_READ", "INVENTORY_READ", "PRICE_READ"];
  credentials;
  constructor(credentials = {}) {
    this.credentials = credentials;
  }
  async authenticate() {
    return;
  }
  async testConnection() {
    return { ok: true, message: "Modo manual dispon\xEDvel" };
  }
  async listProducts() {
    return { products: this.products() };
  }
  async getProduct(externalId) {
    return this.products().find((product) => product.externalId === externalId) ?? null;
  }
  async syncProducts() {
    const count = this.products().length;
    return { productsRead: count, productsAdded: 0, productsUpdated: 0, errors: [] };
  }
  async syncInventory() {
    return { changed: 0, errors: [] };
  }
  async syncPrices() {
    return { changed: 0, errors: [] };
  }
  products() {
    return Array.isArray(this.credentials.products) ? this.credentials.products : [];
  }
};

// server/suppliers/money.ts
var MAX_MONEY_CENTS = 1e10;
function parseMoneyToCents(value) {
  if (value === void 0 || value === null || String(value).trim() === "") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error("Valor monet\xE1rio inv\xE1lido");
    const cents2 = Math.round(value * 100);
    if (cents2 > MAX_MONEY_CENTS) throw new Error("Valor monet\xE1rio excede o limite permitido");
    return cents2;
  }
  let raw = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!raw || raw.startsWith("-") || raw.includes("-")) throw new Error("Valor monet\xE1rio negativo ou inv\xE1lido");
  raw = raw.replace(/[^0-9.,]/g, "");
  if (!raw || !/[0-9]/.test(raw)) throw new Error("Valor monet\xE1rio inv\xE1lido");
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let integerPart = raw;
  let fractionPart = "";
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot);
    integerPart = raw.slice(0, decimalIndex).replace(/[.,]/g, "");
    fractionPart = raw.slice(decimalIndex + 1);
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? "," : ".";
    const parts = raw.split(separator);
    const candidateFraction = parts[parts.length - 1];
    if (parts.length === 2 && candidateFraction.length <= 2) {
      integerPart = parts[0];
      fractionPart = candidateFraction;
    } else if (candidateFraction.length === 2 && parts.length > 2) {
      integerPart = parts.slice(0, -1).join("").replace(/[.,]/g, "");
      fractionPart = candidateFraction;
    } else {
      integerPart = raw.replace(/[.,]/g, "");
    }
  }
  integerPart = integerPart.replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(fractionPart)) throw new Error("Formato monet\xE1rio inv\xE1lido");
  const cents = Number(integerPart) * 100 + Number((fractionPart + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > MAX_MONEY_CENTS) throw new Error("Valor monet\xE1rio excede o limite permitido");
  return cents;
}

// server/suppliers/csvAdapter.ts
function splitCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += char;
  }
  if (quoted) throw new Error("CSV inv\xE1lido: aspas n\xE3o fechadas");
  values.push(current.trim());
  return values;
}
function detectDelimiter(header) {
  const semicolons = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}
function parseStock(value) {
  if (value === void 0 || value === null || String(value).trim() === "") return 0;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) throw new Error(`Estoque inv\xE1lido: ${normalized}`);
  const stock = Number(normalized);
  if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Estoque inv\xE1lido: ${normalized}`);
  return stock;
}
var CsvSupplierAdapter = class {
  type = "csv";
  capabilities = ["CATALOG_READ", "INVENTORY_READ", "PRICE_READ"];
  credentials;
  constructor(credentials = {}) {
    this.credentials = credentials;
  }
  async authenticate() {
    return;
  }
  async testConnection() {
    return { ok: typeof this.credentials.csv === "string", message: typeof this.credentials.csv === "string" ? "CSV dispon\xEDvel para leitura" : "Informe o conte\xFAdo CSV" };
  }
  async listProducts() {
    return { products: this.parse(String(this.credentials.csv ?? "")) };
  }
  async getProduct(externalId) {
    return (await this.listProducts()).products.find((product) => product.externalId === externalId) ?? null;
  }
  async syncProducts() {
    const products3 = this.parse(String(this.credentials.csv ?? ""));
    return { productsRead: products3.length, productsAdded: 0, productsUpdated: 0, errors: [] };
  }
  async syncInventory() {
    return { changed: 0, errors: [] };
  }
  async syncPrices() {
    return { changed: 0, errors: [] };
  }
  parse(csv) {
    const cleanCsv = csv.replace(/^\uFEFF/, "");
    const lines = cleanCsv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCsvLine(lines[0], delimiter).map((header) => header.toLowerCase().replace(/^\uFEFF/, ""));
    return lines.slice(1).map((line, rowIndex) => {
      const values = splitCsvLine(line, delimiter);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const externalId = row.externalid || row.id || row.codigo;
      const name = row.name || row.nome || row.title || row.titulo;
      if (!externalId || !name) throw new Error(`CSV inv\xE1lido na linha ${rowIndex + 2}: externalId e name s\xE3o obrigat\xF3rios`);
      return { externalId, sku: row.sku || void 0, internalCode: row.internalcode || row.codigo_interno || void 0, ean: row.ean || void 0, gtin: row.gtin || void 0, mpn: row.mpn || void 0, name, description: row.description || row.descricao || void 0, brand: row.brand || row.marca || void 0, costCents: parseMoneyToCents(row.cost || row.custo), shippingCostCents: parseMoneyToCents(row.shipping || row.frete), stock: parseStock(row.stock || row.estoque), category: row.category || row.categoria || void 0 };
    });
  }
};

// server/suppliers/registry.ts
var registry = /* @__PURE__ */ new Map([
  ["manual", (credentials) => new ManualSupplierAdapter(credentials)],
  ["csv", (credentials) => new CsvSupplierAdapter(credentials)]
]);
var SupplierAdapterRegistry = class {
  static register(type, factory) {
    registry.set(type, factory);
  }
  static create(type, credentials = {}) {
    const factory = registry.get(type);
    if (!factory) throw new Error(`Supplier adapter n\xE3o registrado: ${type}`);
    return factory(credentials);
  }
  static supported() {
    return Array.from(registry.keys());
  }
  static capabilities(type) {
    const factory = registry.get(type);
    if (!factory) return [];
    return factory({}).capabilities;
  }
};

// server/suppliers/supplierConnectionService.ts
function requireDb4(db) {
  if (!db) throw new Error("Database not available");
  return db;
}
function toSafeSupplierIntegration(integration) {
  return {
    id: integration.id,
    supplierId: integration.supplierId,
    type: integration.type,
    status: integration.status,
    lastSyncAt: integration.lastSyncAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}
var SupplierConnectionService = class {
  static async getOwnedIntegration(userId, integrationId) {
    const db = requireDb4(await getDb());
    const rows = await db.select({ integration: supplierIntegrations, supplierName: suppliers.name }).from(supplierIntegrations).innerJoin(suppliers, eq27(supplierIntegrations.supplierId, suppliers.id)).where(and26(eq27(supplierIntegrations.id, integrationId), eq27(supplierIntegrations.userId, userId), eq27(suppliers.userId, userId))).limit(1);
    if (!rows.length) throw new Error("Integra\xE7\xE3o n\xE3o encontrada");
    return rows[0];
  }
  static async list(userId) {
    const db = requireDb4(await getDb());
    const rows = await db.select({
      integration: {
        id: supplierIntegrations.id,
        supplierId: supplierIntegrations.supplierId,
        type: supplierIntegrations.type,
        status: supplierIntegrations.status,
        lastSyncAt: supplierIntegrations.lastSyncAt,
        lastError: supplierIntegrations.lastError,
        createdAt: supplierIntegrations.createdAt,
        updatedAt: supplierIntegrations.updatedAt
      },
      supplierName: suppliers.name
    }).from(supplierIntegrations).innerJoin(suppliers, eq27(supplierIntegrations.supplierId, suppliers.id)).where(and26(eq27(supplierIntegrations.userId, userId), eq27(suppliers.userId, userId)));
    return rows.map((row) => ({ integration: toSafeSupplierIntegration(row.integration), supplierName: row.supplierName, capabilities: SupplierAdapterRegistry.capabilities(row.integration.type) }));
  }
  static async testConnection(userId, integrationId) {
    const db = requireDb4(await getDb());
    const row = await this.getOwnedIntegration(userId, integrationId);
    await db.update(supplierIntegrations).set({ status: "testing", lastError: null, updatedAt: /* @__PURE__ */ new Date() }).where(and26(eq27(supplierIntegrations.id, integrationId), eq27(supplierIntegrations.userId, userId)));
    try {
      const raw = row.integration.encryptedCredentials ? decryptData(row.integration.encryptedCredentials) : "{}";
      const credentials = JSON.parse(raw);
      const adapter = SupplierAdapterRegistry.create(row.integration.type, credentials);
      await adapter.authenticate();
      const result = await adapter.testConnection();
      await db.update(supplierIntegrations).set({ status: result.ok ? "connected" : "error", lastError: result.ok ? null : result.message ?? "Teste de conex\xE3o rejeitado", updatedAt: /* @__PURE__ */ new Date() }).where(and26(eq27(supplierIntegrations.id, integrationId), eq27(supplierIntegrations.userId, userId)));
      return { ...result, integrationId, supplierName: row.supplierName, capabilities: adapter.capabilities };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida no teste de conex\xE3o";
      await db.update(supplierIntegrations).set({ status: "error", lastError: message, updatedAt: /* @__PURE__ */ new Date() }).where(and26(eq27(supplierIntegrations.id, integrationId), eq27(supplierIntegrations.userId, userId)));
      return { ok: false, integrationId, supplierName: row.supplierName, message, capabilities: [] };
    }
  }
};

// server/routers/supply.ts
var supplierStatus = z17.enum(["active", "inactive", "blocked", "pending_review"]);
var fulfillmentMode = z17.enum(["own_stock", "dropshipping", "cross_docking", "pre_order", "supplier_fulfillment", "hybrid"]);
function dbOrThrow(db) {
  if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
  return db;
}
var supplyRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = dbOrThrow(await getDb());
    const [supplierRows, productRows, alertRows, policyRows] = await Promise.all([
      db.select().from(suppliers).where(eq28(suppliers.userId, ctx.user.id)),
      db.select().from(supplierProducts).where(eq28(supplierProducts.userId, ctx.user.id)),
      db.select({ id: suppliers.id }).from(suppliers).where(and27(eq28(suppliers.userId, ctx.user.id), eq28(suppliers.status, "blocked"))),
      db.select().from(supplyRoutingPolicies).where(eq28(supplyRoutingPolicies.userId, ctx.user.id))
    ]);
    const activeProducts = productRows.filter((row) => row.status === "active");
    return { suppliers: supplierRows.length, products: productRows.length, activeProducts: activeProducts.length, dropshipping: policyRows.filter((row) => row.fulfillmentMode === "dropshipping").length, hybrid: policyRows.filter((row) => row.fulfillmentMode === "hybrid").length, blockedSuppliers: alertRows.length };
  }),
  suppliers: router({
    list: protectedProcedure.query(({ ctx }) => SupplierService.list(ctx.user.id)),
    create: protectedProcedure.input(z17.object({ name: z17.string().min(1).max(255), legalName: z17.string().max(255).optional(), document: z17.string().max(50).optional(), email: z17.string().email().optional(), phone: z17.string().max(50).optional(), website: z17.string().url().optional(), defaultShippingDays: z17.number().int().nonnegative().default(0), returnPolicy: z17.string().optional(), dropshippingEnabled: z17.boolean().default(false), crossDockingEnabled: z17.boolean().default(false), integrationType: z17.string().max(30).default("manual") })).mutation(({ ctx, input }) => SupplierService.create(ctx.user.id, { ...input, dropshippingEnabled: input.dropshippingEnabled ? 1 : 0, crossDockingEnabled: input.crossDockingEnabled ? 1 : 0, apiEnabled: 0, feedEnabled: 0, status: "pending_review", rating: 0 })),
    updateStatus: protectedProcedure.input(z17.object({ id: z17.number().int().positive(), status: supplierStatus })).mutation(({ ctx, input }) => SupplierService.updateStatus(ctx.user.id, input.id, input.status)),
    saveIntegration: protectedProcedure.input(z17.object({ supplierId: z17.number().int().positive(), type: z17.enum(["api", "csv", "xlsx", "xml", "json", "manual", "erp", "ftp", "sftp"]), credentials: z17.record(z17.string(), z17.unknown()).optional() })).mutation(({ ctx, input }) => SupplierService.saveIntegration(ctx.user.id, input)),
    connections: router({
      list: protectedProcedure.query(({ ctx }) => SupplierConnectionService.list(ctx.user.id)),
      test: protectedProcedure.input(z17.object({ integrationId: z17.number().int().positive() })).mutation(({ ctx, input }) => SupplierConnectionService.testConnection(ctx.user.id, input.integrationId))
    })
  }),
  catalog: router({
    list: protectedProcedure.input(z17.object({ supplierId: z17.number().int().positive().optional() }).default({})).query(({ ctx, input }) => SupplierService.listProducts(ctx.user.id, input.supplierId)),
    upsert: protectedProcedure.input(z17.object({ supplierId: z17.number().int().positive(), externalId: z17.string().min(1).max(255), sku: z17.string().max(100).optional(), internalCode: z17.string().max(100).optional(), ean: z17.string().max(50).optional(), gtin: z17.string().max(50).optional(), mpn: z17.string().max(100).optional(), name: z17.string().min(1).max(500), description: z17.string().optional(), brand: z17.string().max(150).optional(), costCents: z17.number().int().nonnegative().default(0), shippingCostCents: z17.number().int().nonnegative().default(0), stock: z17.number().int().nonnegative().default(0), weightGrams: z17.number().int().nonnegative().default(0), widthMm: z17.number().int().nonnegative().default(0), heightMm: z17.number().int().nonnegative().default(0), lengthMm: z17.number().int().nonnegative().default(0), images: z17.array(z17.string().url()).default([]), videos: z17.array(z17.string().url()).default([]), attributes: z17.record(z17.string(), z17.string()).default({}), category: z17.string().max(150).optional(), status: z17.enum(["active", "inactive", "unmatched", "blocked"]).default("active") })).mutation(({ ctx, input }) => SupplierService.upsertProduct(ctx.user.id, { ...input, images: JSON.stringify(input.images), videos: JSON.stringify(input.videos), attributes: JSON.stringify(input.attributes) })),
    analyzeMatch: protectedProcedure.input(z17.object({ supplierProductId: z17.number().int().positive() })).mutation(({ ctx, input }) => SupplierMatchingService.analyze(ctx.user.id, input.supplierProductId))
  }),
  mappings: router({
    list: protectedProcedure.input(z17.object({ status: z17.string().optional() }).default({})).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      return db.select().from(supplierProductMappings).where(input.status ? and27(eq28(supplierProductMappings.userId, ctx.user.id), eq28(supplierProductMappings.status, input.status)) : eq28(supplierProductMappings.userId, ctx.user.id)).orderBy(desc6(supplierProductMappings.updatedAt));
    }),
    review: protectedProcedure.input(z17.object({ id: z17.number().int().positive(), status: z17.enum(["approved", "rejected", "reviewed", "pending_review"]), productId: z17.number().int().positive().optional(), variantId: z17.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const current = await db.select().from(supplierProductMappings).where(and27(eq28(supplierProductMappings.id, input.id), eq28(supplierProductMappings.userId, ctx.user.id))).limit(1);
      if (!current.length) throw new TRPCError16({ code: "NOT_FOUND", message: "Mapping n\xE3o encontrado" });
      if (input.status === "approved" && !input.productId) throw new TRPCError16({ code: "BAD_REQUEST", message: "Produto Mestre obrigat\xF3rio para aprovar" });
      if (input.status === "approved" && !["exact", "probable"].includes(current[0].matchType)) throw new TRPCError16({ code: "BAD_REQUEST", message: "Este mapping n\xE3o \xE9 eleg\xEDvel para aprova\xE7\xE3o" });
      if (input.status === "approved" && current[0].matchType === "probable" && current[0].status !== "reviewed") throw new TRPCError16({ code: "BAD_REQUEST", message: "Match prov\xE1vel exige revis\xE3o expl\xEDcita antes da aprova\xE7\xE3o" });
      const selectedProductId = input.productId ?? current[0].productId;
      if (input.variantId && !selectedProductId) throw new TRPCError16({ code: "BAD_REQUEST", message: "Produto Mestre obrigat\xF3rio para validar a variante" });
      if (selectedProductId) {
        const product = await db.select({ id: products.id }).from(products).where(and27(eq28(products.id, selectedProductId), eq28(products.userId, ctx.user.id))).limit(1);
        if (!product.length) throw new TRPCError16({ code: "NOT_FOUND", message: "Produto Mestre n\xE3o encontrado" });
      }
      if (input.variantId) {
        const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and27(eq28(productVariants.id, input.variantId), eq28(productVariants.userId, ctx.user.id), eq28(productVariants.productId, selectedProductId))).limit(1);
        assertVariantOwnership({ variantExists: variant.length > 0, ownerMatches: variant.length > 0, productMatches: variant.length > 0 });
      }
      await db.update(supplierProductMappings).set({ status: input.status, ...input.productId ? { productId: input.productId } : {}, ...input.variantId ? { variantId: input.variantId } : {}, reviewedBy: ctx.user.id, reviewedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and27(eq28(supplierProductMappings.id, input.id), eq28(supplierProductMappings.userId, ctx.user.id)));
      return { success: true };
    })
  }),
  routing: router({
    list: protectedProcedure.input(z17.object({ productId: z17.number().int().positive().optional() }).default({})).query(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      return db.select().from(supplyRoutingPolicies).where(input.productId ? and27(eq28(supplyRoutingPolicies.userId, ctx.user.id), eq28(supplyRoutingPolicies.productId, input.productId)) : eq28(supplyRoutingPolicies.userId, ctx.user.id)).orderBy(supplyRoutingPolicies.priority);
    }),
    upsert: protectedProcedure.input(z17.object({ productId: z17.number().int().positive(), supplierId: z17.number().int().positive(), priority: z17.number().int().nonnegative().default(0), fulfillmentMode, supplierStockBuffer: z17.number().int().nonnegative().default(0), staleAfterMinutes: z17.number().int().positive().default(120), blockAfterStaleMinutes: z17.number().int().positive().default(1440), minimumMarginBp: z17.number().int().nonnegative().default(0), autoFulfillmentAllowed: z17.boolean().default(false), isActive: z17.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      const db = dbOrThrow(await getDb());
      const [product, supplier] = await Promise.all([
        db.select({ id: products.id }).from(products).where(and27(eq28(products.id, input.productId), eq28(products.userId, ctx.user.id))).limit(1),
        db.select({ id: suppliers.id }).from(suppliers).where(and27(eq28(suppliers.id, input.supplierId), eq28(suppliers.userId, ctx.user.id))).limit(1)
      ]);
      if (!product.length || !supplier.length) throw new TRPCError16({ code: "NOT_FOUND", message: "Produto ou fornecedor n\xE3o encontrado" });
      const current = await db.select({ id: supplyRoutingPolicies.id }).from(supplyRoutingPolicies).where(and27(eq28(supplyRoutingPolicies.userId, ctx.user.id), eq28(supplyRoutingPolicies.productId, input.productId), eq28(supplyRoutingPolicies.supplierId, input.supplierId))).limit(1);
      const values = { priority: input.priority, fulfillmentMode: input.fulfillmentMode, supplierStockBuffer: input.supplierStockBuffer, staleAfterMinutes: input.staleAfterMinutes, blockAfterStaleMinutes: input.blockAfterStaleMinutes, minimumMarginBp: input.minimumMarginBp, autoFulfillmentAllowed: input.autoFulfillmentAllowed ? 1 : 0, isActive: input.isActive ? 1 : 0, updatedAt: /* @__PURE__ */ new Date() };
      if (current.length) await db.update(supplyRoutingPolicies).set(values).where(and27(eq28(supplyRoutingPolicies.id, current[0].id), eq28(supplyRoutingPolicies.userId, ctx.user.id)));
      else await db.insert(supplyRoutingPolicies).values({ ...values, userId: ctx.user.id, productId: input.productId, supplierId: input.supplierId });
      return { success: true };
    })
  }),
  analysis: router({
    landedCost: protectedProcedure.input(z17.object({ supplierCostCents: z17.number().int().nonnegative(), supplierShippingCents: z17.number().int().nonnegative(), marketplaceFeesCents: z17.number().int().nonnegative().default(0), paymentFeesCents: z17.number().int().nonnegative().default(0), taxesCents: z17.number().int().nonnegative().default(0), operationalCostCents: z17.number().int().nonnegative().default(0), packagingCents: z17.number().int().nonnegative().default(0), expectedReturnCostCents: z17.number().int().nonnegative().default(0), riskReserveCents: z17.number().int().nonnegative().default(0), salePriceCents: z17.number().int().nonnegative().optional(), minimumMarginBp: z17.number().int().nonnegative().default(0) })).query(({ input }) => {
      const landed = calculateLandedCost(input);
      return { ...landed, margin: input.salePriceCents === void 0 ? null : calculateMargin(input.salePriceCents, landed.realCostCents, input.minimumMarginBp) };
    }),
    supplyScore: protectedProcedure.input(z17.object({ marginBp: z17.number(), stockScore: z17.number(), demandScore: z17.number(), supplierScore: z17.number(), leadTimeScore: z17.number(), riskScore: z17.number() })).query(({ input }) => calculateSupplyScore(input)),
    opportunityScore: protectedProcedure.input(z17.object({ demandScore: z17.number(), marginScore: z17.number(), supplierScore: z17.number(), seoScore: z17.number(), competitivenessScore: z17.number(), riskScore: z17.number() })).query(({ input }) => calculateOpportunityScore(input)),
    route: protectedProcedure.input(z17.object({ quantity: z17.number().int().positive().default(1), mode: fulfillmentMode, candidates: z17.array(z17.object({ supplierId: z17.number().int().positive(), priority: z17.number().int().nonnegative(), stock: z17.number().int().nonnegative(), reservedStock: z17.number().int().nonnegative().default(0), stockBuffer: z17.number().int().nonnegative().default(0), costCents: z17.number().int().nonnegative(), shippingCents: z17.number().int().nonnegative(), leadTimeDays: z17.number().int().nonnegative(), reliabilityBp: z17.number().int().min(0).max(1e4), cancellationRateBp: z17.number().int().min(0).max(1e4).default(0), returnRateBp: z17.number().int().min(0).max(1e4).default(0), stale: z17.boolean(), blocked: z17.boolean(), allowedModes: z17.array(fulfillmentMode).optional() })) })).query(({ input }) => routeSupply(input.candidates, input.quantity, input.mode))
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    // Login local por senha (substitui o OAuth da Manus). A senha vem da
    // variável de ambiente ADMIN_PASSWORD — não fica no código-fonte.
    login: publicProcedure.input(z18.object({ password: z18.string().min(1, "Senha obrigat\xF3ria") })).mutation(async ({ input, ctx }) => {
      if (!ENV.adminPassword) {
        throw new TRPCError17({
          code: "INTERNAL_SERVER_ERROR",
          message: "ADMIN_PASSWORD n\xE3o configurada no servidor."
        });
      }
      if (input.password !== ENV.adminPassword) {
        throw new TRPCError17({ code: "UNAUTHORIZED", message: "Senha incorreta" });
      }
      const openId = ENV.ownerOpenId;
      await upsertUser({
        openId,
        name: ENV.ownerName,
        email: null,
        loginMethod: "password",
        lastSignedIn: /* @__PURE__ */ new Date(),
        role: "admin"
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: ENV.ownerName,
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  marketplace: marketplaceRouter,
  products: productsRouter,
  orders: ordersRouter,
  catalog: catalogRouter,
  pricing: pricingRouter,
  omnichannel: omnichannelRouter,
  seoAdvanced: seoAdvancedRouter,
  inventory: inventoryRouter2,
  catalogEnhancements: catalogEnhancementsRouter,
  dataTools: dataToolsRouter,
  operations: operationsRouter,
  conflicts: conflictsRouter,
  identifiers: identifiersRouter,
  inventoryMovements: inventoryMovementsRouter,
  mappings: mappingsRouter,
  supply: supplyRouter
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
async function setupVite(app, server) {
  const viteModuleName = "vite";
  const nanoidModuleName = "nanoid";
  const viteConfigPath = "../../vite.config";
  const { createServer: createViteServer } = await import(viteModuleName);
  const { nanoid } = await import(nanoidModuleName);
  const { default: viteConfig } = await import(viteConfigPath);
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path.resolve(import.meta.dirname, "../..", "dist", "public") : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/services/webhookService.ts
import crypto6 from "node:crypto";
import { and as and28, eq as eq29 } from "drizzle-orm";

// server/services/webhookEventRouter.ts
function routeWebhookEvent(topic, body) {
  const value = topic || String(body?.type || "unknown");
  const normalized = value.toLowerCase();
  if (normalized.includes("order") || normalized.includes("payment") || normalized.includes("shipment") || normalized.includes("cancel") || normalized.includes("return")) {
    return { jobType: "order", normalizedTopic: normalized };
  }
  if (normalized.includes("price")) return { jobType: "price", normalizedTopic: normalized };
  if (normalized.includes("stock") || normalized.includes("inventory") || normalized.includes("item") || normalized.includes("listing")) {
    return { jobType: "stock", normalizedTopic: normalized };
  }
  return { jobType: null, normalizedTopic: normalized };
}

// server/services/webhookService.ts
var WebhookService = class {
  static async ingest(connectionId, marketplaceType, body, signature) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(marketplaceConnections).where(and28(eq29(marketplaceConnections.id, connectionId), eq29(marketplaceConnections.marketplaceType, marketplaceType))).limit(1);
    if (!rows.length || rows[0].isConnected !== 1) throw new Error("Conex\xE3o de marketplace inv\xE1lida");
    const connection = rows[0];
    const adapter = await MarketplaceService.getAdapter(connection);
    const raw = JSON.stringify(body ?? {});
    const secret = MarketplaceService.decryptConnection(connection).webhookSecret ?? "";
    if (secret && signature && !adapter.verifyWebhookSignature(raw, signature, secret)) throw new Error("Assinatura de webhook inv\xE1lida");
    if (secret && !signature) throw new Error("Assinatura de webhook ausente");
    const parsed = adapter.parseWebhookPayload(body);
    const route = routeWebhookEvent(parsed?.type, body);
    const externalEventId = String(body?.id ?? crypto6.createHash("sha256").update(raw).digest("hex"));
    const event = { userId: connection.userId, marketplaceConnectionId: connection.id, externalEventId, topic: route.normalizedTopic, payload: raw, status: route.jobType ? "received" : "ignored" };
    try {
      const result = await db.insert(webhookEvents).values(event);
      const eventId = Number(result[0]?.insertId ?? 0);
      if (route.jobType) {
        await db.insert(syncJobs).values({ userId: connection.userId, marketplaceConnectionId: connection.id, type: route.jobType, idempotencyKey: `webhook-${connection.id}-${externalEventId}`, payload: JSON.stringify({ eventId, data: parsed?.data ?? body }) });
      }
      return { accepted: true, duplicate: false, eventId, queued: Boolean(route.jobType), topic: route.normalizedTopic };
    } catch (error) {
      if (String(error).toLowerCase().includes("duplicate") || String(error).toLowerCase().includes("unique")) return { accepted: true, duplicate: true };
      throw error;
    }
  }
};

// server/services/publicStoreService.ts
import { and as and29, eq as eq30 } from "drizzle-orm";
var esc = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
var slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
var PublicStoreService = class {
  static async list() {
    const db = await getDb();
    if (!db || !ENV.publicStoreUserId) return [];
    return db.select({ product: products, seo: productSeoProfiles }).from(products).leftJoin(productSeoProfiles, and29(eq30(productSeoProfiles.productId, products.id), eq30(productSeoProfiles.channel, "store"))).where(and29(eq30(products.userId, ENV.publicStoreUserId), eq30(products.status, "active")));
  }
  static async getBySlug(slug) {
    const db = await getDb();
    if (!db || !ENV.publicStoreUserId) return null;
    const rows = await db.select({ product: products, seo: productSeoProfiles }).from(products).leftJoin(productSeoProfiles, and29(eq30(productSeoProfiles.productId, products.id), eq30(productSeoProfiles.channel, "store"))).where(and29(eq30(products.userId, ENV.publicStoreUserId), eq30(products.status, "active"))).limit(500);
    const row = rows.find(({ product, seo }) => (seo?.slug || slugify(product.name)) === slug);
    if (!row) return null;
    const [variants, media] = await Promise.all([
      db.select().from(productVariants).where(and29(eq30(productVariants.userId, ENV.publicStoreUserId), eq30(productVariants.productId, row.product.id), eq30(productVariants.status, "active"))),
      db.select().from(productMedia).where(and29(eq30(productMedia.userId, ENV.publicStoreUserId), eq30(productMedia.productId, row.product.id), eq30(productMedia.status, "ready")))
    ]);
    return { ...row, variants, media };
  }
  static jsonLd(record) {
    const url = `${ENV.publicStoreUrl.replace(/\/$/, "")}/produtos/${record.seo?.slug || slugify(record.product.name)}`;
    const base = { "@context": "https://schema.org", "@type": record.variants.length ? "ProductGroup" : "Product", name: record.product.name, description: record.product.description || void 0, productGroupID: record.variants.length ? record.product.sku : void 0, variesBy: record.variants.length ? ["https://schema.org/color", "https://schema.org/size"] : void 0, image: record.media.filter((item) => item.kind === "image").map((item) => item.url), url };
    if (record.variants.length) base.hasVariant = record.variants.map((variant) => ({ "@type": "Product", name: variant.name || record.product.name, sku: variant.sku, offers: { "@type": "Offer", priceCurrency: "BRL", price: (variant.price / 100).toFixed(2), availability: variant.stock - variant.reservedStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } }));
    else base.offers = { "@type": "Offer", priceCurrency: "BRL", price: ((record.product.costBase || 0) / 100).toFixed(2), availability: (record.product.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" };
    return JSON.stringify(base);
  }
  static renderHtml(record) {
    const title = record.seo?.seoTitle || record.product.name;
    const description = record.seo?.metaDescription || record.product.description || "Confira detalhes deste produto.";
    const image = record.media.find((item) => item.isCover)?.url || record.product.photoUrl || "";
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(`${ENV.publicStoreUrl.replace(/\/$/, "")}/produtos/${record.seo?.slug || slugify(record.product.name)}`)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${image ? `<meta property="og:image" content="${esc(image)}">` : ""}<script type="application/ld+json">${this.jsonLd(record)}</script></head><body><main><h1>${esc(record.product.name)}</h1><p>${esc(record.product.description || "")}</p>${image ? `<img src="${esc(image)}" alt="${esc(record.seo?.altText || record.product.name)}">` : ""}</main></body></html>`;
  }
  static async sitemap() {
    const records = await this.list();
    const urls = records.map(({ product, seo }) => `${ENV.publicStoreUrl.replace(/\/$/, "")}/produtos/${seo?.slug || slugify(product.name)}`);
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${esc(url)}</loc></url>`).join("")}</urlset>`;
  }
};

// server/_core/index.ts
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.get("/sitemap.xml", async (_req, res) => {
    res.type("application/xml").send(await PublicStoreService.sitemap());
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(`User-agent: *
Allow: /produtos/
Sitemap: ${process.env.PUBLIC_STORE_URL || "http://localhost:3000"}/sitemap.xml
`);
  });
  app.get("/api/public/products/:slug", async (req, res) => {
    const record = await PublicStoreService.getBySlug(req.params.slug);
    if (!record) return res.status(404).json({ error: "Produto n\xE3o encontrado" });
    return res.json({ ...record, jsonLd: JSON.parse(PublicStoreService.jsonLd(record)) });
  });
  app.get("/produtos/:slug", async (req, res, next) => {
    if (process.env.NODE_ENV === "development") return next();
    const record = await PublicStoreService.getBySlug(req.params.slug);
    if (!record) return next();
    return res.type("html").send(PublicStoreService.renderHtml(record));
  });
  app.post("/api/webhooks/:marketplace/:connectionId", async (req, res) => {
    const marketplace = req.params.marketplace;
    const connectionId = Number(req.params.connectionId);
    if (!["mercadolivre", "shopee"].includes(marketplace) || !Number.isInteger(connectionId) || connectionId <= 0) {
      return res.status(400).json({ error: "Webhook inv\xE1lido" });
    }
    try {
      const result = await WebhookService.ingest(connectionId, marketplace, req.body, req.header("x-marketplace-signature") ?? req.header("x-signature"));
      return res.status(202).json(result);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : "Falha ao receber webhook" });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}
startServer().catch(console.error);
