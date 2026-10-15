export type SupplierAdapterType = "manual" | "csv" | "xlsx" | "xml" | "json" | "api" | "erp" | "ftp" | "sftp";
export type SupplierCapability = "CATALOG_READ" | "INVENTORY_READ" | "PRICE_READ" | "ORDER_CREATE" | "ORDER_READ" | "ORDER_CANCEL" | "TRACKING_READ" | "MEDIA_READ";

export interface SupplierCredentials {
  [key: string]: string | number | boolean | undefined;
}

export interface SupplierProductRecord {
  externalId: string;
  sku?: string;
  internalCode?: string;
  ean?: string;
  gtin?: string;
  mpn?: string;
  name: string;
  description?: string;
  brand?: string;
  costCents: number;
  shippingCostCents?: number;
  stock: number;
  weightGrams?: number;
  images?: string[];
  videos?: string[];
  attributes?: Record<string, string>;
  category?: string;
}

export interface SupplierOrderRequest {
  externalOrderId: string;
  items: Array<{ externalId?: string; sku?: string; quantity: number }>;
  shippingAddress?: Record<string, string>;
}

export interface SupplierOrderStatus { externalId: string; status: string; trackingCode?: string; carrier?: string; raw?: unknown; }

export interface SupplierAdapter {
  readonly type: SupplierAdapterType;
  readonly capabilities: readonly SupplierCapability[];
  authenticate(): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message?: string }>;
  listProducts(cursor?: string): Promise<{ products: SupplierProductRecord[]; nextCursor?: string }>;
  getProduct(externalId: string): Promise<SupplierProductRecord | null>;
  syncProducts(): Promise<{ productsRead: number; productsAdded: number; productsUpdated: number; errors: string[] }>;
  syncInventory(): Promise<{ changed: number; errors: string[] }>;
  syncPrices(): Promise<{ changed: number; errors: string[] }>;
  createOrder?(request: SupplierOrderRequest): Promise<SupplierOrderStatus>;
  getOrder?(externalId: string): Promise<SupplierOrderStatus | null>;
  cancelOrder?(externalId: string): Promise<SupplierOrderStatus>;
  getTracking?(externalId: string): Promise<SupplierOrderStatus | null>;
}
