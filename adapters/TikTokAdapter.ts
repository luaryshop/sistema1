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
 * TikTok Shop Marketplace Adapter
 *
 * Baseado na documentação oficial do TikTok Shop Partner Center.
 * É a integração mais diferente das outras:
 *
 *  - Usa 3 credenciais (App Key, App Secret, Service ID), não só 2
 *  - O link de retorno é FIXO, configurado uma vez no Partner Center — não é
 *    passado a cada login, e o TikTok não devolve o parâmetro "state"
 *  - Toda chamada de API (exceto login) precisa vir assinada com HMAC-SHA256
 *  - Token exchange é via GET com query params, e o grant_type é literalmente
 *    "authorized_code" (não "authorization_code" — não é erro de digitação)
 */
export class TikTokAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly authUrl = "https://services.tiktokshop.com/open/authorize";
  private readonly tokenBaseUrl = "https://auth.tiktok-shops.com/api/v2";

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://open-api.tiktokglobalshop.com");
    if (!credentials.serviceId) {
      throw new Error("TikTok Shop exige TIKTOK_SERVICE_ID (além de App Key/App Secret)");
    }
  }

  /**
   * O TikTok Shop não aceita redirect_uri nem state nessa URL — o link de
   * retorno é fixo, cadastrado no Partner Center. Ao cadastrar lá, use um link
   * terminando em "?mkt=tiktok" para o sistema reconhecer o callback depois.
   */
  getAuthorizationUrl(_state: string): string {
    const params = new URLSearchParams({ service_id: this.credentials.serviceId! });
    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.get(`${this.tokenBaseUrl}/token/get`, {
        params: {
          app_key: this.credentials.clientId,
          app_secret: this.credentials.clientSecret,
          auth_code: code,
          grant_type: "authorized_code",
        },
      });

      const data = response.data?.data ?? response.data;
      const expiresIn = data.access_token_expire_in || 7200;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.exchangeCodeForTokens");
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.get(`${this.tokenBaseUrl}/token/refresh`, {
        params: {
          app_key: this.credentials.clientId,
          app_secret: this.credentials.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        },
      });

      const data = response.data?.data ?? response.data;
      const expiresIn = data.access_token_expire_in || 7200;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.refreshAccessToken");
    }
  }

  /**
   * Assinatura exigida pela API do TikTok Shop:
   * sign = HMAC_SHA256(app_secret, app_secret + path + params_ordenados + [body] + app_secret)
   */
  private signRequest(
    path: string,
    accessToken: string,
    queryParams: Record<string, string> = {},
    body?: unknown
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const allParams: Record<string, string> = {
      ...queryParams,
      app_key: this.credentials.clientId,
      timestamp,
    };

    const sortedKeys = Object.keys(allParams).sort();
    let paramString = "";
    for (const key of sortedKeys) {
      paramString += `${key}${allParams[key]}`;
    }

    let signInput = `${this.credentials.clientSecret}${path}${paramString}`;
    if (body) signInput += JSON.stringify(body);
    signInput += this.credentials.clientSecret;

    const sign = crypto.createHmac("sha256", this.credentials.clientSecret).update(signInput).digest("hex");

    return { ...allParams, sign, access_token: accessToken };
  }

  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      const path = "/authorization/202309/shops";
      const signedParams = this.signRequest(path, accessToken);

      const response = await this.httpClient.get(path, { params: signedParams });
      const shops = response.data?.data?.shops ?? [];
      const shop = shops[0] ?? {};

      return {
        sellerId: String(shop.shop_id ?? shop.id ?? ""),
        sellerName: shop.shop_name ?? shop.name ?? "Loja TikTok Shop",
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.validateAndGetSellerInfo");
    }
  }

  async listListings(accessToken: string, filters?: { status?: string; limit?: number }): Promise<ImportedListing[]> {
    try {
      const path = "/product/202309/products/search";
      const pageSize = Math.min(filters?.limit ?? 50, 100);
      const signedParams = this.signRequest(path, accessToken, { page_size: String(pageSize) });

      const response = await this.httpClient.post(
        path,
        { status: filters?.status ?? undefined },
        { params: signedParams }
      );

      const products: any[] = response.data?.data?.products ?? [];

      return products.map(
        (item): ImportedListing => ({
          listingId: String(item.id ?? ""),
          title: item.title ?? "",
          description: item.description,
          sku: item.skus?.[0]?.seller_sku,
          price:
            typeof item.skus?.[0]?.price?.sale_price === "string"
              ? Math.round(parseFloat(item.skus[0].price.sale_price) * 100)
              : undefined,
          stock: item.skus?.[0]?.inventory?.[0]?.quantity,
          status: item.status === "ACTIVATE" ? "active" : "inactive",
          categoryId: item.category_chains?.[0]?.id,
          brand: item.brand?.name,
          images: (item.main_images ?? []).map((img: any) => img.url ?? img).filter(Boolean),
          attributes: {},
          raw: item,
        })
      );
    } catch (error) {
      this.handleApiError(error, "TikTok.listListings");
    }
  }

  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      if (!payload.category?.trim()) throw new Error("TikTok Shop exige categoryId mapeado antes da publicação");

      const path = "/product/202309/products";
      const signedParams = this.signRequest(path, accessToken);

      const body = {
        title: payload.title,
        description: payload.description ?? payload.title,
        category_id: payload.category,
        main_images: payload.images.map((url) => ({ url })),
        skus: [
          {
            seller_sku: payload.sku,
            price: { amount: String((payload.price / 100).toFixed(2)), currency: "BRL" },
            inventory: [{ quantity: payload.stock }],
          },
        ],
      };

      const response = await this.httpClient.post(path, body, { params: signedParams });

      return {
        listingId: String(response.data?.data?.product_id ?? ""),
        listingUrl: "",
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.publishProduct");
    }
  }

  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      const path = `/product/202309/products/${payload.listingId}`;
      const signedParams = this.signRequest(path, accessToken);

      const body: Record<string, unknown> = {};
      if (payload.title) body.title = payload.title;
      if (payload.images) body.main_images = payload.images.map((url) => ({ url }));

      await this.httpClient.put(path, body, { params: signedParams });

      return { success: true, message: `Produto ${payload.listingId} atualizado com sucesso` };
    } catch (error) {
      this.handleApiError(error, "TikTok.updateProduct");
    }
  }

  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      const path = `/product/202309/products/${payload.listingId}/prices/update`;
      const signedParams = this.signRequest(path, accessToken);

      await this.httpClient.post(
        path,
        {
          skus: [
            { id: payload.listingId, price: { amount: String((payload.price / 100).toFixed(2)), currency: "BRL" } },
          ],
        },
        { params: signedParams }
      );

      return { success: true, message: `Preço atualizado para o produto ${payload.listingId}` };
    } catch (error) {
      this.handleApiError(error, "TikTok.updatePrice");
    }
  }

  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      const path = `/product/202309/products/${payload.listingId}/inventory/update`;
      const signedParams = this.signRequest(path, accessToken);

      await this.httpClient.post(
        path,
        { skus: [{ id: payload.listingId, inventory: [{ quantity: payload.stock }] }] },
        { params: signedParams }
      );

      return { success: true, message: `Estoque atualizado para o produto ${payload.listingId}` };
    } catch (error) {
      this.handleApiError(error, "TikTok.updateStock");
    }
  }

  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      const path = "/order/202309/orders/search";
      const signedParams = this.signRequest(path, accessToken, { page_size: "50" });

      const body: Record<string, unknown> = {};
      if (filters?.since) body.create_time_ge = Math.floor(filters.since.getTime() / 1000);
      if (filters?.status) body.order_status = filters.status;

      const response = await this.httpClient.post(path, body, { params: signedParams });
      const orders: any[] = response.data?.data?.orders ?? [];

      return orders.map((order) => this.parseTikTokOrder(order));
    } catch (error) {
      this.handleApiError(error, "TikTok.getOrders");
    }
  }

  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      const path = "/order/202309/orders";
      const signedParams = this.signRequest(path, accessToken, { ids: orderId });

      const response = await this.httpClient.get(path, { params: signedParams });
      const order = response.data?.data?.orders?.[0];
      if (!order) throw new Error(`Pedido ${orderId} não encontrado`);

      return this.parseTikTokOrder(order);
    } catch (error) {
      this.handleApiError(error, "TikTok.getOrder");
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  }

  async pauseListing(accessToken: string, payload: any): Promise<any> {
    try {
      assertMarketplaceWriteEnabled(payload.paused ? "pausa de anúncio" : "ativação de anúncio", "tiktok");

      const path = payload.paused ? "/product/202309/products/deactivate" : "/product/202309/products/activate";
      const signedParams = this.signRequest(path, accessToken);

      await this.httpClient.post(path, { product_ids: [payload.listingId] }, { params: signedParams });

      return {
        listingId: payload.listingId,
        status: payload.paused ? "paused" : "active",
        updatedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.pauseListing");
    }
  }

  async getListingStatus(accessToken: string, listingId: string): Promise<any> {
    try {
      const path = "/product/202309/products";
      const signedParams = this.signRequest(path, accessToken, { ids: listingId });

      const response = await this.httpClient.get(path, { params: signedParams });
      const product = response.data?.data?.products?.[0];
      const status = product?.status === "ACTIVATE" ? "active" : "paused";

      return { listingId, status, updatedAt: new Date() };
    } catch (error) {
      this.handleApiError(error, "TikTok.getListingStatus");
    }
  }

  parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null {
    if (typeof payload !== "object" || payload === null) return null;
    const data = payload as Record<string, unknown>;
    const eventType = String(data.type ?? "").toLowerCase();

    if (eventType.includes("order")) return { type: "order_update", data: payload };
    if (eventType.includes("product")) return { type: "item_update", data: payload };

    return null;
  }

  private parseTikTokOrder(order: any): Order {
    const items = order.line_items ?? [];

    return {
      orderId: String(order.id ?? ""),
      buyerName: order.recipient_address?.name ?? "Cliente TikTok Shop",
      buyerEmail: undefined,
      totalAmount: Math.round(parseFloat(order.payment?.total_amount ?? "0") * 100),
      status: order.status ?? "unknown",
      orderDate: new Date((order.create_time ?? Date.now() / 1000) * 1000),
      items: items.map((item: any) => ({
        itemId: String(item.product_id ?? ""),
        title: item.product_name ?? "",
        sku: item.seller_sku,
        quantity: 1,
        unitPrice: Math.round(parseFloat(item.sale_price ?? "0") * 100),
        totalPrice: Math.round(parseFloat(item.sale_price ?? "0") * 100),
      })),
      shippingAddress: order.recipient_address
        ? {
            name: order.recipient_address.name,
            street: order.recipient_address.address_detail,
            number: "",
            city: order.recipient_address.district_info?.find((d: any) => d.address_level_name === "city")
              ?.address_name,
            state: order.recipient_address.district_info?.find((d: any) => d.address_level_name === "state")
              ?.address_name,
            zipCode: order.recipient_address.postal_code,
            country: "BR",
          }
        : undefined,
    };
  }
}
