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
 * Amazon Selling Partner API (SP-API) Adapter — Brasil
 *
 * Pontos importantes desta integração:
 *
 *  - Marketplace do Brasil: A2Q3Y263D00KWC (o código anterior usava o dos EUA)
 *  - Endpoint regional: sellingpartnerapi-na.amazon.com (o Brasil faz parte da
 *    região "North America" na SP-API, mesmo ficando na América do Sul)
 *  - Desde outubro/2023 a Amazon NÃO exige mais a assinatura AWS SigV4 nem
 *    credenciais IAM — basta o access token LWA no header x-amz-access-token
 *  - Para criar/atualizar anúncios usamos a Listings Items API
 *    (PUT/PATCH /listings/2021-08-01/items/{sellerId}/{sku}), não a Catalog
 *    Items API — essa última é somente leitura do catálogo global da Amazon
 */
export class AmazonAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly authUrl = "https://sellercentral.amazon.com.br/apps/authorize/consent";
  private readonly tokenUrl = "https://api.amazon.com/auth/o2/token";
  private readonly marketplaceId = "A2Q3Y263D00KWC"; // Brasil

  /** Cache do sellerId, necessário nas rotas de Listings. */
  private sellerId?: string;

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://sellingpartnerapi-na.amazon.com");
  }

  /**
   * A SP-API usa o header x-amz-access-token (não Authorization: Bearer).
   */
  private setAmazonAuth(accessToken: string): void {
    this.httpClient.defaults.headers.common["x-amz-access-token"] = accessToken;
    this.httpClient.defaults.headers.common["Content-Type"] = "application/json";
  }

  /**
   * Get OAuth authorization URL (Login with Amazon)
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      application_id: this.credentials.clientId,
      state,
      redirect_uri: this.credentials.redirectUri,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.credentials.redirectUri,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const expiresIn = response.data.expires_in || 3600;

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.exchangeCodeForTokens");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const expiresIn = response.data.expires_in || 3600;

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.refreshAccessToken");
    }
  }

  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      this.setAmazonAuth(accessToken);
      const response = await this.httpClient.get("/sellers/v1/account/marketplaceParticipations");

      const payload = response.data?.payload ?? [];
      // Prioriza a participação no marketplace brasileiro, se existir
      const brParticipation =
        payload.find((p: any) => p.marketplace?.id === this.marketplaceId) ?? payload[0] ?? {};

      const sellerId = brParticipation.participation?.sellerId ?? brParticipation.merchant?.merchant_id ?? "";
      this.sellerId = sellerId;

      return {
        sellerId: String(sellerId),
        sellerName: brParticipation.marketplace?.name ?? brParticipation.merchant?.merchant_name ?? "Loja Amazon",
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.validateAndGetSellerInfo");
    }
  }

  /**
   * Garante que temos o sellerId (necessário nas rotas de Listings).
   */
  private async ensureSellerId(accessToken: string): Promise<string> {
    if (this.sellerId) return this.sellerId;
    const info = await this.validateAndGetSellerInfo(accessToken);
    return info.sellerId;
  }

  /**
   * List existing listings for safe import/linking.
   */
  async listListings(accessToken: string, filters?: { status?: string; limit?: number }): Promise<ImportedListing[]> {
    try {
      this.setAmazonAuth(accessToken);
      const sellerId = await this.ensureSellerId(accessToken);

      const response = await this.httpClient.get(`/listings/2021-08-01/items/${sellerId}`, {
        params: {
          marketplaceIds: this.marketplaceId,
          pageSize: Math.min(filters?.limit ?? 20, 20), // limite máximo da API
          includedData: "summaries,attributes,offers,fulfillmentAvailability",
        },
      });

      const items: any[] = response.data?.items ?? [];

      return items.map((item): ImportedListing => {
        const summary = item.summaries?.[0] ?? {};
        const offer = item.offers?.[0] ?? {};

        return {
          listingId: item.sku,
          title: summary.itemName ?? "",
          description: undefined,
          sku: item.sku,
          gtin: undefined,
          price: offer.price?.amount ? Math.round(parseFloat(offer.price.amount) * 100) : undefined,
          stock: item.fulfillmentAvailability?.[0]?.quantity,
          status: summary.status?.includes("BUYABLE") ? "active" : "inactive",
          categoryId: summary.productType,
          brand: undefined,
          images: summary.mainImage?.link ? [summary.mainImage.link] : [],
          attributes: item.attributes ?? {},
          raw: item,
        };
      });
    } catch (error) {
      this.handleApiError(error, "Amazon.listListings");
    }
  }

  /**
   * Publish a product to Amazon (Listings Items API)
   */
  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      this.setAmazonAuth(accessToken);
      const sellerId = await this.ensureSellerId(accessToken);

      if (!payload.category?.trim()) {
        throw new Error("Amazon exige o productType (categoria) mapeado antes da publicação");
      }

      const body = {
        productType: payload.category,
        requirements: "LISTING",
        attributes: {
          item_name: [{ value: payload.title, marketplace_id: this.marketplaceId }],
          brand: [{ value: payload.brand || "Genérico", marketplace_id: this.marketplaceId }],
          product_description: [{ value: payload.description ?? payload.title, marketplace_id: this.marketplaceId }],
          purchasable_offer: [
            {
              currency: "BRL",
              our_price: [{ schedule: [{ value_with_tax: payload.price / 100 }] }],
              marketplace_id: this.marketplaceId,
            },
          ],
          fulfillment_availability: [{ fulfillment_channel_code: "DEFAULT", quantity: payload.stock }],
          main_product_image_locator: payload.images[0]
            ? [{ media_location: payload.images[0], marketplace_id: this.marketplaceId }]
            : undefined,
        },
      };

      await this.httpClient.put(`/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(payload.sku)}`, body, {
        params: { marketplaceIds: this.marketplaceId },
      });

      return {
        listingId: payload.sku,
        listingUrl: `https://www.amazon.com.br/dp/${payload.sku}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.publishProduct");
    }
  }

  /**
   * Update an existing listing (PATCH parcial)
   */
  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      this.setAmazonAuth(accessToken);
      const sellerId = await this.ensureSellerId(accessToken);

      const patches: any[] = [];
      if (payload.title) {
        patches.push({
          op: "replace",
          path: "/attributes/item_name",
          value: [{ value: payload.title, marketplace_id: this.marketplaceId }],
        });
      }
      if (payload.description) {
        patches.push({
          op: "replace",
          path: "/attributes/product_description",
          value: [{ value: payload.description, marketplace_id: this.marketplaceId }],
        });
      }

      if (patches.length === 0) {
        return { success: true, message: "Nada a atualizar" };
      }

      await this.httpClient.patch(
        `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(payload.listingId)}`,
        { productType: "PRODUCT", patches },
        { params: { marketplaceIds: this.marketplaceId } }
      );

      return { success: true, message: `Anúncio ${payload.listingId} atualizado com sucesso` };
    } catch (error) {
      this.handleApiError(error, "Amazon.updateProduct");
    }
  }

  /**
   * Update product price
   */
  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      this.setAmazonAuth(accessToken);
      const sellerId = await this.ensureSellerId(accessToken);

      await this.httpClient.patch(
        `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(payload.listingId)}`,
        {
          productType: "PRODUCT",
          patches: [
            {
              op: "replace",
              path: "/attributes/purchasable_offer",
              value: [
                {
                  currency: "BRL",
                  our_price: [{ schedule: [{ value_with_tax: payload.price / 100 }] }],
                  marketplace_id: this.marketplaceId,
                },
              ],
            },
          ],
        },
        { params: { marketplaceIds: this.marketplaceId } }
      );

      return { success: true, message: `Preço atualizado para o anúncio ${payload.listingId}` };
    } catch (error) {
      this.handleApiError(error, "Amazon.updatePrice");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      this.setAmazonAuth(accessToken);
      const sellerId = await this.ensureSellerId(accessToken);

      await this.httpClient.patch(
        `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(payload.listingId)}`,
        {
          productType: "PRODUCT",
          patches: [
            {
              op: "replace",
              path: "/attributes/fulfillment_availability",
              value: [{ fulfillment_channel_code: "DEFAULT", quantity: payload.stock }],
            },
          ],
        },
        { params: { marketplaceIds: this.marketplaceId } }
      );

      return { success: true, message: `Estoque atualizado para o anúncio ${payload.listingId}` };
    } catch (error) {
      this.handleApiError(error, "Amazon.updateStock");
    }
  }

  /**
   * Get orders from Amazon
   */
  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      this.setAmazonAuth(accessToken);

      const params: Record<string, string> = {
        MarketplaceIds: this.marketplaceId,
        MaxResultsPerPage: "50",
      };

      // A Amazon exige CreatedAfter (ou LastUpdatedAfter) — sem isso, retorna erro.
      params.CreatedAfter = (filters?.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString();
      if (filters?.status) params.OrderStatuses = filters.status;

      const response = await this.httpClient.get("/orders/v0/orders", { params });
      const orders: any[] = response.data?.payload?.Orders ?? [];

      // A listagem de pedidos não traz os itens; busca em seguida.
      const detailed: Order[] = [];
      for (const order of orders) {
        let items: any[] = [];
        try {
          const itemsResp = await this.httpClient.get(`/orders/v0/orders/${order.AmazonOrderId}/orderItems`);
          items = itemsResp.data?.payload?.OrderItems ?? [];
        } catch {
          // Se falhar ao buscar itens de um pedido, ainda importamos o pedido sem itens
        }
        detailed.push(this.parseAmazonOrder(order, items));
      }

      return detailed;
    } catch (error) {
      this.handleApiError(error, "Amazon.getOrders");
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      this.setAmazonAuth(accessToken);

      const response = await this.httpClient.get(`/orders/v0/orders/${orderId}`);
      const itemsResp = await this.httpClient.get(`/orders/v0/orders/${orderId}/orderItems`);

      return this.parseAmazonOrder(response.data?.payload ?? {}, itemsResp.data?.payload?.OrderItems ?? []);
    } catch (error) {
      this.handleApiError(error, "Amazon.getOrder");
    }
  }

  /**
   * Pause (delete) or reactivate a listing.
   * A Amazon não tem "pausar": zera-se o estoque para tirar do ar.
   */
  async pauseListing(accessToken: string, payload: any): Promise<any> {
    try {
      assertMarketplaceWriteEnabled(payload.paused ? "pausa de anúncio" : "ativação de anúncio", "amazon");

      await this.updateStock(accessToken, {
        listingId: payload.listingId,
        stock: payload.paused ? 0 : (payload.stock ?? 1),
      } as UpdateStockPayload);

      return {
        listingId: payload.listingId,
        status: payload.paused ? "paused" : "active",
        updatedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.pauseListing");
    }
  }

  /**
   * Get listing status
   */
  async getListingStatus(accessToken: string, listingId: string): Promise<any> {
    try {
      this.setAmazonAuth(accessToken);
      const sellerId = await this.ensureSellerId(accessToken);

      const response = await this.httpClient.get(
        `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(listingId)}`,
        { params: { marketplaceIds: this.marketplaceId, includedData: "summaries" } }
      );

      const summary = response.data?.summaries?.[0] ?? {};
      const status = summary.status?.includes("BUYABLE") ? "active" : "paused";

      return { listingId, status, updatedAt: new Date() };
    } catch (error) {
      this.handleApiError(error, "Amazon.getListingStatus");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    return hash === signature;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null {
    if (typeof payload !== "object" || payload === null) return null;

    const data = payload as Record<string, unknown>;
    const notificationType = (data.notificationType ?? data.EventType) as string | undefined;

    if (notificationType?.includes("ORDER")) return { type: "order_update", data: payload };
    if (notificationType?.includes("INVENTORY") || notificationType?.includes("LISTINGS")) {
      return { type: "item_update", data: payload };
    }

    return null;
  }

  /**
   * Helper: Parse Amazon order response
   */
  private parseAmazonOrder(amazonOrder: any, orderItems: any[] = []): Order {
    return {
      orderId: amazonOrder.AmazonOrderId,
      buyerName: amazonOrder.BuyerInfo?.BuyerName ?? amazonOrder.ShippingAddress?.Name ?? "Cliente Amazon",
      buyerEmail: amazonOrder.BuyerInfo?.BuyerEmail,
      totalAmount: Math.round(parseFloat(amazonOrder.OrderTotal?.Amount ?? "0") * 100),
      status: amazonOrder.OrderStatus,
      orderDate: new Date(amazonOrder.PurchaseDate ?? Date.now()),
      items: orderItems.map((item: any) => ({
        itemId: item.OrderItemId,
        title: item.Title,
        sku: item.SellerSKU,
        quantity: item.QuantityOrdered ?? 1,
        unitPrice: Math.round(parseFloat(item.ItemPrice?.Amount ?? "0") * 100),
        totalPrice: Math.round(parseFloat(item.ItemPrice?.Amount ?? "0") * 100),
      })),
      shippingAddress: amazonOrder.ShippingAddress
        ? {
            name: amazonOrder.ShippingAddress.Name,
            street: amazonOrder.ShippingAddress.AddressLine1,
            number: amazonOrder.ShippingAddress.AddressLine2 || "",
            city: amazonOrder.ShippingAddress.City,
            state: amazonOrder.ShippingAddress.StateOrRegion,
            zipCode: amazonOrder.ShippingAddress.PostalCode,
            country: amazonOrder.ShippingAddress.CountryCode ?? "BR",
          }
        : undefined,
    };
  }
}
