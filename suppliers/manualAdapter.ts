import type { SupplierAdapter, SupplierCredentials, SupplierProductRecord } from "./types";

export class ManualSupplierAdapter implements SupplierAdapter {
  readonly type = "manual" as const;
  readonly capabilities = ["CATALOG_READ", "INVENTORY_READ", "PRICE_READ"] as const;
  private readonly credentials: SupplierCredentials;
  constructor(credentials: SupplierCredentials = {}) { this.credentials = credentials; }
  async authenticate() { return; }
  async testConnection() { return { ok: true, message: "Modo manual disponível" }; }
  async listProducts() { return { products: this.products() }; }
  async getProduct(externalId: string) { return this.products().find((product) => product.externalId === externalId) ?? null; }
  async syncProducts() { const count = this.products().length; return { productsRead: count, productsAdded: 0, productsUpdated: 0, errors: [] as string[] }; }
  async syncInventory() { return { changed: 0, errors: [] as string[] }; }
  async syncPrices() { return { changed: 0, errors: [] as string[] }; }
  private products(): SupplierProductRecord[] { return Array.isArray(this.credentials.products) ? this.credentials.products as SupplierProductRecord[] : []; }
}
