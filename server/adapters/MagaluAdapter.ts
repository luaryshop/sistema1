import crypto from "crypto";
import axios from "axios";
import { BaseMarketplaceAdapter } from "./BaseAdapter";
import { assertMarketplaceWriteEnabled } from "../services/marketplaceSafetyService";
import {
  IMarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceTokens,
  PublishProductPayload,
  PublishProductResponse,
  UpdateProductPayload,
  UpdatePricePayload,
  UpdateStockPayload,
  Order,
  ImportedListing,
  SyncResult,
} from "./types";

/**
 * Magalu (Magazine Luiza) Marketplace Adapter
 *
 * Baseado na documentação oficial: https://developers.magalu.com
 *
 * Domínios (confirmados na doc oficial):
 *  - Login/token: id.magalu.com (GET /login, POST /oauth/token)
 *  - API de produtos/pedidos: api.magalu.com
 *
 * Os endpoints de catálogo (SKUs) e os escopos abaixo foram confirmados
 * direto na documentação oficial. Os endpoints de preço/estoque/pedidos
 * seguem o mesmo padrão REST usado pelos SKUs, mas ainda não foram testados
 * contra uma conta sandbox real — vale validar antes de usar em produção.
 */
export class MagaluAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly idUrl = "https://id.magalu.com";

  // Escopos necessários pra ler/escrever produtos, preços, estoque e pedidos.
  // Precisam ser os MESMOS escopos configurados na criação do client em id.magalu.com,
  // senão a Magalu recusa o login com erro de "invalid_scope".
  private readonly scopes = [
    "open:portfolio-skus-seller:read",
    "open:portfolio-skus-seller:write",
    "open:portfolio-prices-seller:read",
    "open:portfolio-prices-seller:write",
    "open:portfolio-stocks-seller:read",
    "open:portfolio-stocks-seller:write",
    "open:order-order-seller:read",
    "open:order-delivery-seller:read",
    "open:order-delivery-seller:write",
    "open:order-invoice-seller:read",
  ].join(" ");

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://api.magalu.com");
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: "code",
      scope: this.scopes,
      state,
      choose_tenants: "true",
    });

    return `${this.idUrl}/login?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(
        `${this.idUrl}/oauth/token`,
        {
          grant_type: "authorization_code",
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          redirect_uri: this.credentials.redirectUri,
          code,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const expiresIn = response.data.expires_in || 21600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "Magalu.exchangeCodeForTokens");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(
        `${this.idUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          refresh_token: refreshToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const expiresIn = response.data.expires_in || 21600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "Magalu.refreshAccessToken");
    }
  }

  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/seller/v1/portfolios/me");

      return {
        sellerId: String(response.data.id ?? response.data.seller_id ?? ""),
        sellerName: response.data.name ?? response.data.fantasy_name ?? "Loja Magalu",
      };
    } catch (error) {
      this.handleApiError(error, "Magalu.validateAndGetSellerInfo");
    }
  }

  /**
   * List existing seller SKUs for safe import/linking.
   */
  async listListings(accessToken: string, filters?: { status?: string; limit?: number }): Promise<ImportedListing[]> {
    try {
      this.setAuthHeader(accessToken);
      const limit = Math.min(filters?.limit ?? 50, 100);

      const response = await this.httpClient.get("/seller/v1/portfolios/skus", {
        params: { _limit: limit },
      });

      const items: any[] = response.data?.results ?? response.data ?? [];

      return items.map(
        (item): ImportedListing => ({
          listingId: String(item.id ?? item.sku_id ?? ""),
          title: item.description ?? item.name ?? "",
          description: item.description,
          sku: item.seller_sku_id ?? item.sku,
          gtin: item.ean,
          price: typeof item.price === "number" ? Math.round(item.price * 100) : undefined,
          stock: item.quantity,
          status: item.active === false ? "inactive" : "active",
          categoryId: item.category_id,
          brand: item.brand,
          images: (item.images ?? []).map((img: any) => img.url ?? img).filter(Boolean),
          attributes: {},
          raw: item,
        })
      );
    } catch (error) {
      this.handleApiError(error, "Magalu.listListings");
    }
  }

  /**
   * Publish a product (SKU) to Magalu
   */
  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      this.setAuthHeader(accessToken);

      if (!payload.category?.trim()) throw new Error("Magalu exige categoryId mapeado antes da publicação");

      const skuPayload = {
        seller_sku_id: payload.sku,
        description: payload.title,
        category_id: payload.category,
        price: payload.price / 100,
        quantity: payload.stock,
        images: payload.images.map((url) => ({ url })),
        attributes: payload.attributes ?? {},
      };

      const response = await this.httpClient.post("/seller/v1/portfolios/skus", skuPayload);

      return {
        listingId: String(response.data.id ?? response.data.sku_id ?? payload.sku),
        listingUrl: response.data.url,
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "Magalu.publishProduct");
    }
  }

  /**
   * Update an existing SKU
   */
  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      const updateData: Record<string, unknown> = {};
      if (payload.title) updateData.description = payload.title;
      if (payload.price) updateData.price = payload.price / 100;
      if (payload.stock !== undefined) updateData.quantity = payload.stock;
      if (payload.images) updateData.images = payload.images.map((url) => ({ url }));

      await this.httpClient.patch(`/seller/v1/portfolios/skus/${payload.listingId}`, updateData);

      return { success: true, message: `SKU ${payload.listingId} atualizado com sucesso` };
    } catch (error) {
      this.handleApiError(error, "Magalu.updateProduct");
    }
  }

  /**
   * Update product price
   */
  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.put(`/seller/v1/portfolios/prices/${payload.listingId}`, {
        price: payload.price / 100,
      });

      return { success: true, message: `Preço atualizado para o SKU ${payload.listingId}` };
    } catch (error) {
      this.handleApiError(error, "Magalu.updatePrice");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.put(`/seller/v1/portfolios/stocks/${payload.listingId}`, {
        quantity: payload.stock,
      });

      return { success: true, message: `Estoque atualizado para o SKU ${payload.listingId}` };
    } catch (error) {
      this.handleApiError(error, "Magalu.updateStock");
    }
  }

  /**
   * Get orders from Magalu
   */
  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      this.setAuthHeader(accessToken);

      const params: Record<string, string> = { _limit: "50" };
      if (filters?.since) params._since = filters.since.toISOString();
      if (filters?.status) params.status = filters.status;

      const response = await this.httpClient.get("/seller/v1/orders", { params });
      const orders: any[] = response.data?.results ?? response.data ?? [];

      return orders.map((order) => this.parseMagaluOrder(order));
    } catch (error) {
      this.handleApiError(error, "Magalu.getOrders");
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/seller/v1/orders/${orderId}`);
      return this.parseMagaluOrder(response.data);
    } catch (error) {
      this.handleApiError(error, "Magalu.getOrder");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  }

  /**
   * Pause or activate a SKU
   */
  async pauseListing(accessToken: string, payload: any): Promise<any> {
    try {
      assertMarketplaceWriteEnabled(payload.paused ? "pausa de anúncio" : "ativação de anúncio", "magalu");
      this.setAuthHeader(accessToken);

      await this.httpClient.patch(`/seller/v1/portfolios/skus/${payload.listingId}`, {
        active: !payload.paused,
      });

      return {
        listingId: payload.listingId,
        status: payload.paused ? "paused" : "active",
        updatedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "Magalu.pauseListing");
    }
  }

  /**
   * Get listing status
   */
  async getListingStatus(accessToken: string, listingId: string): Promise<any> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/seller/v1/portfolios/skus/${listingId}`);
      const status = response.data.active === false ? "paused" : "active";

      return { listingId, status, updatedAt: new Date() };
    } catch (error) {
      this.handleApiError(error, "Magalu.getListingStatus");
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null {
    if (typeof payload !== "object" || payload === null) return null;
    const data = payload as Record<string, unknown>;
    const eventType = (data.event_type ?? data.type) as string | undefined;

    if (eventType?.includes("order")) return { type: "order_update", data: payload };
    if (eventType?.includes("sku") || eventType?.includes("product")) return { type: "item_update", data: payload };

    return null;
  }

  /**
   * Helper: Parse Magalu order response
   */
  private parseMagaluOrder(order: any): Order {
    const items = order.items ?? order.deliveries?.flatMap((d: any) => d.items) ?? [];

    return {
      orderId: String(order.id ?? order.order_id ?? ""),
      buyerName: order.customer?.name ?? "Cliente Magalu",
      buyerEmail: order.customer?.email,
      totalAmount: Math.round((order.total ?? order.total_amount ?? 0) * 100),
      status: order.status ?? "unknown",
      orderDate: new Date(order.created_at ?? order.order_date ?? Date.now()),
      items: items.map((item: any) => ({
        itemId: String(item.sku_id ?? item.info?.sku ?? ""),
        title: item.description ?? item.title ?? "",
        sku: item.seller_sku_id ?? item.info?.sku,
        quantity: item.quantity ?? 1,
        unitPrice: Math.round((item.unit_price ?? item.price ?? 0) * 100),
        totalPrice: Math.round((item.unit_price ?? item.price ?? 0) * (item.quantity ?? 1) * 100),
      })),
      shippingAddress: order.shipping_address
        ? {
            name: order.shipping_address.name,
            street: order.shipping_address.street,
            number: order.shipping_address.number,
            complement: order.shipping_address.complement,
            city: order.shipping_address.city,
            state: order.shipping_address.state,
            zipCode: order.shipping_address.zip_code,
            country: "BR",
          }
        : undefined,
    };
  }
}
