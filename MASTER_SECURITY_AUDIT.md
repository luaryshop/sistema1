## Status de segurança
server/_core/map.ts:5: * All credentials are automatically injected. Array parameters use | as separator.
server/_core/map.ts:18:  apiKey: string;
server/_core/map.ts:23:  const apiKey = ENV.forgeApiKey;
server/_core/map.ts:25:  if (!baseUrl || !apiKey) {
server/_core/map.ts:27:      "Google Maps proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
server/_core/map.ts:33:    apiKey,
server/_core/map.ts:59:  const { baseUrl, apiKey } = getMapsConfig();
server/_core/map.ts:65:  url.searchParams.append("key", apiKey);
server/_core/oauth.ts:36:      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
server/_core/sdk.ts:63:        accessToken: token.accessToken,
server/_core/sdk.ts:123:   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
server/_core/sdk.ts:125:  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
server/_core/sdk.ts:127:      accessToken,
server/_core/sdk.ts:150:    const secret = ENV.cookieSecret;
server/_core/sdk.ts:151:    return new TextEncoder().encode(secret);
server/_core/sdk.ts:180:    const secretKey = this.getSessionSecret();
server/_core/sdk.ts:189:      .sign(secretKey);
server/_core/sdk.ts:201:      const secretKey = this.getSessionSecret();
server/_core/sdk.ts:202:      const { payload } = await jwtVerify(cookieValue, secretKey, {
server/_core/types/manusTypes.ts:20:  refreshToken?: string;
server/_core/types/manusTypes.ts:27:  accessToken: string;
server/_core/types/manusTypes.ts:30:  refreshToken?: string;
server/_core/types/manusTypes.ts:36:  accessToken: string;
server/adapters/AdapterFactory.ts:29:    credentials: MarketplaceCredentials
server/adapters/AdapterFactory.ts:37:    return new AdapterClass(credentials);
server/adapters/AmazonAdapter.ts:26:  constructor(credentials: MarketplaceCredentials) {
server/adapters/AmazonAdapter.ts:27:    super(credentials, "https://sellingpartnerapi-na.amazon.com");
server/adapters/AmazonAdapter.ts:35:      client_id: this.credentials.clientId,
server/adapters/AmazonAdapter.ts:36:      redirect_uri: this.credentials.redirectUri,
server/adapters/AmazonAdapter.ts:52:        redirect_uri: this.credentials.redirectUri,
server/adapters/AmazonAdapter.ts:53:        client_id: this.credentials.clientId,
server/adapters/AmazonAdapter.ts:54:        client_secret: this.credentials.clientSecret,
server/adapters/AmazonAdapter.ts:61:        accessToken: response.data.access_token,
server/adapters/AmazonAdapter.ts:62:        refreshToken: response.data.refresh_token,
server/adapters/AmazonAdapter.ts:74:  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
server/adapters/AmazonAdapter.ts:78:        refresh_token: refreshToken,
server/adapters/AmazonAdapter.ts:79:        client_id: this.credentials.clientId,
server/adapters/AmazonAdapter.ts:80:        client_secret: this.credentials.clientSecret,
server/adapters/AmazonAdapter.ts:87:        accessToken: response.data.access_token,
server/adapters/AmazonAdapter.ts:88:        refreshToken: response.data.refresh_token,
server/adapters/AmazonAdapter.ts:100:  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
server/adapters/AmazonAdapter.ts:102:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:118:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/AmazonAdapter.ts:120:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:158:  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
server/adapters/AmazonAdapter.ts:160:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:183:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/AmazonAdapter.ts:185:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:203:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/AmazonAdapter.ts:205:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:223:  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
server/adapters/AmazonAdapter.ts:225:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:247:  async getOrder(accessToken: string, orderId: string): Promise<Order> {
server/adapters/AmazonAdapter.ts:249:      this.setAuthHeader(accessToken);
server/adapters/AmazonAdapter.ts:260:  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
server/adapters/AmazonAdapter.ts:261:    const hash = crypto.createHmac("sha256", secret).update(payload).digest("base64");
server/adapters/BaseAdapter.ts:9:  protected credentials: MarketplaceCredentials;
server/adapters/BaseAdapter.ts:13:  constructor(credentials: MarketplaceCredentials, baseUrl: string) {
server/adapters/BaseAdapter.ts:14:    this.credentials = credentials;
server/adapters/BaseAdapter.ts:25:  protected setAuthHeader(accessToken: string): void {
server/adapters/BaseAdapter.ts:26:    this.httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
server/adapters/BaseAdapter.ts:53:  abstract refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens>;
server/adapters/BaseAdapter.ts:54:  abstract validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }>;
server/adapters/BaseAdapter.ts:55:  async listListings(_accessToken: string, _filters?: { status?: string; limit?: number }): Promise<ImportedListing[]> {
server/adapters/BaseAdapter.ts:58:  abstract publishProduct(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:59:  abstract updateProduct(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:60:  abstract updatePrice(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:61:  abstract updateStock(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:62:  abstract getOrders(accessToken: string, filters?: any): Promise<any>;
server/adapters/BaseAdapter.ts:63:  abstract getOrder(accessToken: string, orderId: string): Promise<any>;
server/adapters/BaseAdapter.ts:64:  abstract verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
server/adapters/BaseAdapter.ts:66:  async pauseListing(_accessToken: string, _payload: any): Promise<any> {
server/adapters/BaseAdapter.ts:70:  async getListingStatus(_accessToken: string, _listingId: string): Promise<any> {
server/adapters/MercadoLivreAdapter.ts:26:  constructor(credentials: MarketplaceCredentials) {
server/adapters/MercadoLivreAdapter.ts:27:    super(credentials, "https://api.mercadolibre.com");
server/adapters/MercadoLivreAdapter.ts:36:      client_id: this.credentials.clientId,
server/adapters/MercadoLivreAdapter.ts:37:      redirect_uri: this.credentials.redirectUri,
server/adapters/MercadoLivreAdapter.ts:51:        client_id: this.credentials.clientId,
server/adapters/MercadoLivreAdapter.ts:52:        client_secret: this.credentials.clientSecret,
server/adapters/MercadoLivreAdapter.ts:54:        redirect_uri: this.credentials.redirectUri,
server/adapters/MercadoLivreAdapter.ts:61:        accessToken: response.data.access_token,
server/adapters/MercadoLivreAdapter.ts:62:        refreshToken: response.data.refresh_token,
server/adapters/MercadoLivreAdapter.ts:74:  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
server/adapters/MercadoLivreAdapter.ts:78:        client_id: this.credentials.clientId,
server/adapters/MercadoLivreAdapter.ts:79:        client_secret: this.credentials.clientSecret,
server/adapters/MercadoLivreAdapter.ts:80:        refresh_token: refreshToken,
server/adapters/MercadoLivreAdapter.ts:87:        accessToken: response.data.access_token,
server/adapters/MercadoLivreAdapter.ts:88:        refreshToken: response.data.refresh_token,
server/adapters/MercadoLivreAdapter.ts:100:  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
server/adapters/MercadoLivreAdapter.ts:102:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:117:  async listListings(accessToken: string, filters?: { status?: string; limit?: number }): Promise<ImportedListing[]> {
server/adapters/MercadoLivreAdapter.ts:119:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:120:      const seller = await this.validateAndGetSellerInfo(accessToken);
server/adapters/MercadoLivreAdapter.ts:151:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/MercadoLivreAdapter.ts:153:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:156:      const sellerInfo = await this.validateAndGetSellerInfo(accessToken);
server/adapters/MercadoLivreAdapter.ts:191:  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
server/adapters/MercadoLivreAdapter.ts:193:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:217:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/MercadoLivreAdapter.ts:219:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:237:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/MercadoLivreAdapter.ts:239:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:257:  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
server/adapters/MercadoLivreAdapter.ts:259:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:281:  async getOrder(accessToken: string, orderId: string): Promise<Order> {
server/adapters/MercadoLivreAdapter.ts:283:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:294:  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
server/adapters/MercadoLivreAdapter.ts:295:    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
server/adapters/MercadoLivreAdapter.ts:302:  async pauseListing(accessToken: string, payload: any): Promise<any> {
server/adapters/MercadoLivreAdapter.ts:305:      this.setAuthHeader(accessToken);
server/adapters/MercadoLivreAdapter.ts:326:  async getListingStatus(accessToken: string, listingId: string): Promise<any> {
server/adapters/MercadoLivreAdapter.ts:328:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:27:  constructor(credentials: MarketplaceCredentials) {
server/adapters/ShopeeAdapter.ts:28:    super(credentials, "https://partner.shopeemobile.com/api/v2");
server/adapters/ShopeeAdapter.ts:36:      client_id: this.credentials.clientId,
server/adapters/ShopeeAdapter.ts:37:      redirect_uri: this.credentials.redirectUri,
server/adapters/ShopeeAdapter.ts:54:        client_id: this.credentials.clientId,
server/adapters/ShopeeAdapter.ts:55:        client_secret: this.credentials.clientSecret,
server/adapters/ShopeeAdapter.ts:58:        redirect_uri: this.credentials.redirectUri,
server/adapters/ShopeeAdapter.ts:65:        accessToken: response.data.access_token,
server/adapters/ShopeeAdapter.ts:66:        refreshToken: response.data.refresh_token,
server/adapters/ShopeeAdapter.ts:78:  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
server/adapters/ShopeeAdapter.ts:81:        client_id: this.credentials.clientId,
server/adapters/ShopeeAdapter.ts:82:        client_secret: this.credentials.clientSecret,
server/adapters/ShopeeAdapter.ts:83:        refresh_token: refreshToken,
server/adapters/ShopeeAdapter.ts:91:        accessToken: response.data.access_token,
server/adapters/ShopeeAdapter.ts:92:        refreshToken: response.data.refresh_token,
server/adapters/ShopeeAdapter.ts:104:  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
server/adapters/ShopeeAdapter.ts:106:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:121:  async listListings(accessToken: string, filters?: { status?: string; limit?: number }): Promise<ImportedListing[]> {
server/adapters/ShopeeAdapter.ts:123:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:124:      const seller = await this.validateAndGetSellerInfo(accessToken);
server/adapters/ShopeeAdapter.ts:161:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/ShopeeAdapter.ts:163:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:197:  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
server/adapters/ShopeeAdapter.ts:199:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:225:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/ShopeeAdapter.ts:227:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:246:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/ShopeeAdapter.ts:248:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:267:  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
server/adapters/ShopeeAdapter.ts:269:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:293:  async getOrder(accessToken: string, orderId: string): Promise<Order> {
server/adapters/ShopeeAdapter.ts:295:      this.setAuthHeader(accessToken);
server/adapters/ShopeeAdapter.ts:308:  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
server/adapters/ShopeeAdapter.ts:309:    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
server/adapters/ShopeeAdapter.ts:335:    const message = `${this.credentials.clientId}${code}${timestamp}`;
server/adapters/ShopeeAdapter.ts:336:    return crypto.createHmac("sha256", this.credentials.clientSecret).update(message).digest("hex");
server/adapters/TikTokAdapter.ts:26:  constructor(credentials: MarketplaceCredentials) {
server/adapters/TikTokAdapter.ts:27:    super(credentials, "https://open-api.tiktokshop.com");
server/adapters/TikTokAdapter.ts:35:      client_key: this.credentials.clientId,
server/adapters/TikTokAdapter.ts:36:      redirect_uri: this.credentials.redirectUri,
server/adapters/TikTokAdapter.ts:51:        client_key: this.credentials.clientId,
server/adapters/TikTokAdapter.ts:52:        client_secret: this.credentials.clientSecret,
server/adapters/TikTokAdapter.ts:55:        redirect_uri: this.credentials.redirectUri,
server/adapters/TikTokAdapter.ts:62:        accessToken: response.data.access_token,
server/adapters/TikTokAdapter.ts:63:        refreshToken: response.data.refresh_token,
server/adapters/TikTokAdapter.ts:75:  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
server/adapters/TikTokAdapter.ts:78:        client_key: this.credentials.clientId,
server/adapters/TikTokAdapter.ts:79:        client_secret: this.credentials.clientSecret,
server/adapters/TikTokAdapter.ts:80:        refresh_token: refreshToken,
server/adapters/TikTokAdapter.ts:88:        accessToken: response.data.access_token,
server/adapters/TikTokAdapter.ts:89:        refreshToken: response.data.refresh_token,
server/adapters/TikTokAdapter.ts:101:  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
server/adapters/TikTokAdapter.ts:103:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:118:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/TikTokAdapter.ts:120:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:155:  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
server/adapters/TikTokAdapter.ts:157:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:189:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/TikTokAdapter.ts:191:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:215:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/TikTokAdapter.ts:217:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:241:  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
server/adapters/TikTokAdapter.ts:243:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:265:  async getOrder(accessToken: string, orderId: string): Promise<Order> {
server/adapters/TikTokAdapter.ts:267:      this.setAuthHeader(accessToken);
server/adapters/TikTokAdapter.ts:280:  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
server/adapters/TikTokAdapter.ts:281:    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
server/adapters/types.ts:13:  accessToken: string;

## Operações externas
server/_core/dataApi.ts:31:  const response = await fetch(fullUrl, {
server/_core/heartbeat.ts:21: * `enable`: true = resume, false = pause; omit = unchanged.
server/_core/heartbeat.ts:83:    response = await fetch(endpoint, {
server/_core/heartbeat.ts:161: * `patch` are mutated. `enable` flips resume/pause; omit to leave alone.
server/_core/imageGeneration.ts:66:  const response = await fetch(fullUrl, {
server/_core/imageGeneration.ts:140:  const response = await fetch(fullUrl, {
server/_core/llm.ts:310:      const response = await fetch(url, init);
server/_core/map.ts:74:  const response = await fetch(url.toString(), {
server/_core/notification.ts:88:    const response = await fetch(endpoint, {
server/_core/storageProxy.ts:24:      const forgeResp = await fetch(forgeUrl, {
server/_core/voiceTranscription.ts:97:      const response = await fetch(options.audioUrl);
server/_core/voiceTranscription.ts:155:    const response = await fetch(fullUrl, {
server/adapters/AmazonAdapter.ts:118:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/AmazonAdapter.ts:151:      this.handleApiError(error, "Amazon.publishProduct");
server/adapters/AmazonAdapter.ts:183:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/AmazonAdapter.ts:196:      this.handleApiError(error, "Amazon.updatePrice");
server/adapters/AmazonAdapter.ts:203:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/AmazonAdapter.ts:216:      this.handleApiError(error, "Amazon.updateStock");
server/adapters/BaseAdapter.ts:58:  abstract publishProduct(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:60:  abstract updatePrice(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:61:  abstract updateStock(accessToken: string, payload: any): Promise<any>;
server/adapters/BaseAdapter.ts:66:  async pauseListing(_accessToken: string, _payload: any): Promise<any> {
server/adapters/BaseAdapter.ts:67:    throw new Error("This marketplace adapter does not implement listing pause yet");
server/adapters/MercadoLivreAdapter.ts:136:        status: data.status === "active" ? "active" : data.status === "paused" ? "paused" : "inactive",
server/adapters/MercadoLivreAdapter.ts:151:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/MercadoLivreAdapter.ts:184:      this.handleApiError(error, "MercadoLivre.publishProduct");
server/adapters/MercadoLivreAdapter.ts:217:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/MercadoLivreAdapter.ts:230:      this.handleApiError(error, "MercadoLivre.updatePrice");
server/adapters/MercadoLivreAdapter.ts:237:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/MercadoLivreAdapter.ts:250:      this.handleApiError(error, "MercadoLivre.updateStock");
server/adapters/MercadoLivreAdapter.ts:300:   * Pause or activate a listing
server/adapters/MercadoLivreAdapter.ts:302:  async pauseListing(accessToken: string, payload: any): Promise<any> {
server/adapters/MercadoLivreAdapter.ts:304:      assertMarketplaceWriteEnabled(payload.paused ? "pausa de anúncio" : "ativação de anúncio", "mercadolivre");
server/adapters/MercadoLivreAdapter.ts:307:      const status = payload.paused ? "closed" : "active";
server/adapters/MercadoLivreAdapter.ts:315:        status: payload.paused ? "paused" : "active",
server/adapters/MercadoLivreAdapter.ts:319:      this.handleApiError(error, "MercadoLivre.pauseListing");
server/adapters/MercadoLivreAdapter.ts:331:      const status = response.data.status === "active" ? "active" : "paused";
server/adapters/ShopeeAdapter.ts:147:        status: data.item_status === "NORMAL" ? "active" : data.item_status === "UNLIST" ? "paused" : "inactive",
server/adapters/ShopeeAdapter.ts:161:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/ShopeeAdapter.ts:190:      this.handleApiError(error, "Shopee.publishProduct");
server/adapters/ShopeeAdapter.ts:225:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/ShopeeAdapter.ts:239:      this.handleApiError(error, "Shopee.updatePrice");
server/adapters/ShopeeAdapter.ts:246:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/ShopeeAdapter.ts:260:      this.handleApiError(error, "Shopee.updateStock");
server/adapters/TikTokAdapter.ts:118:  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
server/adapters/TikTokAdapter.ts:148:      this.handleApiError(error, "TikTok.publishProduct");
server/adapters/TikTokAdapter.ts:189:  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
server/adapters/TikTokAdapter.ts:208:      this.handleApiError(error, "TikTok.updatePrice");
server/adapters/TikTokAdapter.ts:215:  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
server/adapters/TikTokAdapter.ts:234:      this.handleApiError(error, "TikTok.updateStock");
server/adapters/types.ts:52:  paused: boolean; // true = pause, false = activate
server/adapters/types.ts:57:  status: 'active' | 'paused' | 'inactive';
server/adapters/types.ts:77:  status: "active" | "paused" | "inactive" | "unknown";
server/adapters/types.ts:155:  publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse>;
server/adapters/types.ts:165:  updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult>;
server/adapters/types.ts:170:  updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult>;
server/adapters/types.ts:173:   * Pause or activate a listing
server/adapters/types.ts:175:  pauseListing(accessToken: string, payload: PauseListingPayload): Promise<ListingStatusResponse>;
server/routers/marketplace.ts:221:      const values = { marketplaceConnectionId: connection[0].id, productId: input.productId, variantId: input.variantId, marketplaceListingId: listing.listingId, title: listing.title, description: listing.description, price: listing.price, stock: listing.stock, status: listing.status || "paused", listingUrl: listing.listingUrl, lastSyncedAt: new Date() };
server/routers/marketplace.ts:258:      status: z.enum(["active", "paused", "inactive", "sold_out"]).default("paused"),
server/routers/products.ts:49:        const result = await ProductSyncService.publishProductToMarketplace(
server/routers/products.ts:82:        const result = await ProductSyncService.publishProductToAllMarketplaces(
server/routers/products.ts:103:  updatePrice: protectedProcedure
server/routers/products.ts:113:        const result = await ProductSyncService.updatePriceOnMarketplace(
server/routers/products.ts:139:  updateStock: protectedProcedure
server/routers/products.ts:149:        const result = await ProductSyncService.updateStockOnMarketplace(
server/services/productSyncService.ts:22:  static async publishProductToMarketplace(
server/services/productSyncService.ts:78:      const result = await adapter.publishProduct(accessToken, payload);
server/services/productSyncService.ts:124:  static async updatePriceOnMarketplace(
server/services/productSyncService.ts:165:      await adapter.updatePrice(accessToken, payload);
server/services/productSyncService.ts:196:  static async updateStockOnMarketplace(
server/services/productSyncService.ts:236:      await adapter.updateStock(accessToken, payload);
server/services/productSyncService.ts:267:  static async publishProductToAllMarketplaces(
server/services/productSyncService.ts:277:        const result = await this.publishProductToMarketplace(
server/services/syncJobService.ts:38:          await ProductSyncService.updateStockOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.stock);
server/services/syncJobService.ts:43:          await ProductSyncService.updatePriceOnMarketplace(userId, payload.listingId, job.marketplaceConnectionId, payload.price);
server/storage.ts:43:  const presignResp = await fetch(presignUrl, {
server/storage.ts:61:  const uploadResp = await fetch(s3Url, {
server/storage.ts:86:  const resp = await fetch(getUrl, {
server/suppliers/types.ts:46:  createOrder?(request: SupplierOrderRequest): Promise<SupplierOrderStatus>;
server/suppliers/types.ts:48:  cancelOrder?(externalId: string): Promise<SupplierOrderStatus>;

## Autorizações
server/routers/catalog.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/catalog.ts:19:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:21:    return db.select().from(insumos).where(eq(insumos.userId, ctx.user.id)).orderBy(desc(insumos.updatedAt));
server/routers/catalog.ts:23:  create: protectedProcedure
server/routers/catalog.ts:37:        userId: ctx.user.id,
server/routers/catalog.ts:49:  update: protectedProcedure
server/routers/catalog.ts:66:      await db.update(insumos).set(updateData).where(and(eq(insumos.id, id), eq(insumos.userId, ctx.user.id)));
server/routers/catalog.ts:69:  remove: protectedProcedure
server/routers/catalog.ts:73:      await db.delete(insumos).where(and(eq(insumos.id, input.id), eq(insumos.userId, ctx.user.id)));
server/routers/catalog.ts:79:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:81:    return db.select().from(banhos).where(eq(banhos.userId, ctx.user.id)).orderBy(desc(banhos.updatedAt));
server/routers/catalog.ts:83:  create: protectedProcedure
server/routers/catalog.ts:98:      const result = await db.insert(banhos).values({ userId: ctx.user.id, ...input });
server/routers/catalog.ts:101:  update: protectedProcedure
server/routers/catalog.ts:118:      await db.update(banhos).set(fields).where(and(eq(banhos.id, id), eq(banhos.userId, ctx.user.id)));
server/routers/catalog.ts:121:  remove: protectedProcedure
server/routers/catalog.ts:125:      await db.delete(banhos).where(and(eq(banhos.id, input.id), eq(banhos.userId, ctx.user.id)));
server/routers/catalog.ts:157:async function verifyKitOwner(db: any, kitId: number, userId: number) {
server/routers/catalog.ts:158:  const rows = await db.select({ id: kits.id }).from(kits).where(and(eq(kits.id, kitId), eq(kits.userId, userId))).limit(1);
server/routers/catalog.ts:169:async function calculateKitComposition(db: any, userId: number, items: Array<z.infer<typeof kitItemInput>>) {
server/routers/catalog.ts:175:    productIds.length ? db.select().from(products).where(and(eq(products.userId, userId), inArray(products.id, productIds))) : [],
server/routers/catalog.ts:176:    insumoIds.length ? db.select().from(insumos).where(and(eq(insumos.userId, userId), inArray(insumos.id, insumoIds))) : [],
server/routers/catalog.ts:192:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:194:    return db.select().from(kits).where(eq(kits.userId, ctx.user.id)).orderBy(desc(kits.updatedAt));
server/routers/catalog.ts:196:  getItems: protectedProcedure
server/routers/catalog.ts:203:  create: protectedProcedure.input(kitInput).mutation(async ({ ctx, input }) => {
server/routers/catalog.ts:208:      userId: ctx.user.id,
server/routers/catalog.ts:219:  update: protectedProcedure
server/routers/catalog.ts:238:  remove: protectedProcedure
server/routers/catalog.ts:249:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:251:    return db.select().from(financeiro).where(eq(financeiro.userId, ctx.user.id)).orderBy(desc(financeiro.date));
server/routers/catalog.ts:253:  summary: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:255:    const rows = await db.select({ type: financeiro.type, total: sql<number>`COALESCE(SUM(${financeiro.amount}), 0)` }).from(financeiro).where(eq(financeiro.userId, ctx.user.id)).groupBy(financeiro.type);
server/routers/catalog.ts:260:  create: protectedProcedure
server/routers/catalog.ts:271:      const result = await db.insert(financeiro).values({ userId: ctx.user.id, ...input });
server/routers/catalog.ts:274:  update: protectedProcedure
server/routers/catalog.ts:287:      await db.update(financeiro).set(fields).where(and(eq(financeiro.id, id), eq(financeiro.userId, ctx.user.id)));
server/routers/catalog.ts:290:  remove: protectedProcedure
server/routers/catalog.ts:294:      await db.delete(financeiro).where(and(eq(financeiro.id, input.id), eq(financeiro.userId, ctx.user.id)));
server/routers/catalog.ts:300:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:302:    return db.select().from(seoSettings).where(eq(seoSettings.userId, ctx.user.id)).orderBy(seoSettings.pageKey);
server/routers/catalog.ts:304:  upsert: protectedProcedure
server/routers/catalog.ts:315:      const existing = await db.select({ id: seoSettings.id }).from(seoSettings).where(and(eq(seoSettings.userId, ctx.user.id), eq(seoSettings.pageKey, input.pageKey))).limit(1);
server/routers/catalog.ts:320:      const result = await db.insert(seoSettings).values({ userId: ctx.user.id, ...input });
server/routers/catalog.ts:323:  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
server/routers/catalog.ts:325:    await db.delete(seoSettings).where(and(eq(seoSettings.id, input.id), eq(seoSettings.userId, ctx.user.id)));
server/routers/catalog.ts:331:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:333:    return db.select().from(liveStreams).where(eq(liveStreams.userId, ctx.user.id)).orderBy(desc(liveStreams.scheduledAt));
server/routers/catalog.ts:335:  create: protectedProcedure.input(z.object({
server/routers/catalog.ts:344:    const result = await db.insert(liveStreams).values({ userId: ctx.user.id, ...input });
server/routers/catalog.ts:347:  update: protectedProcedure.input(z.object({
server/routers/catalog.ts:358:    await db.update(liveStreams).set(fields).where(and(eq(liveStreams.id, id), eq(liveStreams.userId, ctx.user.id)));
server/routers/catalog.ts:361:  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
server/routers/catalog.ts:363:    await db.delete(liveStreams).where(and(eq(liveStreams.id, input.id), eq(liveStreams.userId, ctx.user.id)));
server/routers/catalog.ts:369:  summary: protectedProcedure.query(async ({ ctx }) => {
server/routers/catalog.ts:372:      db.select().from(products).where(eq(products.userId, ctx.user.id)),
server/routers/catalog.ts:373:      db.select().from(insumos).where(eq(insumos.userId, ctx.user.id)),
server/routers/catalog.ts:374:      db.select().from(kits).where(eq(kits.userId, ctx.user.id)),
server/routers/marketplace.ts:1:import { router, protectedProcedure } from "../_core/trpc";
server/routers/marketplace.ts:16:const pendingOAuthStates = new Map<string, { userId: number; createdAt: number }>();
server/routers/marketplace.ts:32:  getConnections: protectedProcedure.query(async ({ ctx }) => {
server/routers/marketplace.ts:58:  getAuthorizationUrl: protectedProcedure
server/routers/marketplace.ts:77:        pendingOAuthStates.set(state, { userId: ctx.user.id, createdAt: Date.now() });
server/routers/marketplace.ts:100:  handleOAuthCallback: protectedProcedure
server/routers/marketplace.ts:116:        if (!pending || pending.userId !== ctx.user.id) {
server/routers/marketplace.ts:167:  stageListings: protectedProcedure
server/routers/marketplace.ts:174:  analyzeStagedMatch: protectedProcedure
server/routers/marketplace.ts:181:  listStagedListings: protectedProcedure
server/routers/marketplace.ts:185:  reviewStagedListing: protectedProcedure
server/routers/marketplace.ts:190:      const result = await db.update(listingImportStaging).set({ status: "reviewed", reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id)));
server/routers/marketplace.ts:194:  ignoreStagedListing: protectedProcedure
server/routers/marketplace.ts:199:      const result = await db.update(listingImportStaging).set({ status: "ignored", reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id)));
server/routers/marketplace.ts:203:  linkStagedListing: protectedProcedure
server/routers/marketplace.ts:208:      const staged = await db.select().from(listingImportStaging).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id))).limit(1);
server/routers/marketplace.ts:212:      const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
server/routers/marketplace.ts:215:        const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(productVariants.userId, ctx.user.id))).limit(1);
server/routers/marketplace.ts:224:      await db.update(listingImportStaging).set({ suggestedProductId: input.productId, status: "linked", reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id)));
server/routers/marketplace.ts:228:  previewListings: protectedProcedure
server/routers/marketplace.ts:249:  linkListing: protectedProcedure
server/routers/marketplace.ts:266:      const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
server/routers/marketplace.ts:296:  disconnect: protectedProcedure
server/routers/marketplace.ts:321:  getSupportedMarketplaces: protectedProcedure.query(() => {
server/routers/orders.ts:1:import { router, protectedProcedure } from "../_core/trpc";
server/routers/orders.ts:10:  importFromMarketplace: protectedProcedure
server/routers/orders.ts:48:  importFromAllMarketplaces: protectedProcedure
server/routers/orders.ts:71:  list: protectedProcedure.input(z.object({ limit: z.number().default(50) })).query(async ({ ctx, input }) => {
server/routers/orders.ts:86:  getItems: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ ctx, input }) => {
server/routers/orders.ts:101:  updateStatus: protectedProcedure
server/routers/pricing.ts:1:import { router, protectedProcedure } from "../_core/trpc";
server/routers/pricing.ts:88:    list: protectedProcedure.query(async ({ ctx }) => {
server/routers/pricing.ts:91:      return db.select().from(salesChannels).where(eq(salesChannels.userId, ctx.user.id));
server/routers/pricing.ts:94:    create: protectedProcedure.input(z.object(channelFields)).mutation(async ({ ctx, input }) => {
server/routers/pricing.ts:98:        userId: ctx.user.id,
server/routers/pricing.ts:111:    update: protectedProcedure
server/routers/pricing.ts:128:          .where(and(eq(salesChannels.id, id), eq(salesChannels.userId, ctx.user.id)));
server/routers/pricing.ts:132:    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
server/routers/pricing.ts:135:      await db.delete(salesChannels).where(and(eq(salesChannels.id, input.id), eq(salesChannels.userId, ctx.user.id)));
server/routers/pricing.ts:144:  calculate: protectedProcedure
server/routers/pricing.ts:164:          .where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id)))
server/routers/pricing.ts:172:      const allChannels = await db.select().from(salesChannels).where(eq(salesChannels.userId, ctx.user.id));
server/routers/pricing.ts:224:  evaluate: protectedProcedure
server/routers/pricing.ts:236:      const allChannels = await db.select().from(salesChannels).where(eq(salesChannels.userId, ctx.user.id));
server/routers/products.ts:1:import { router, protectedProcedure } from "../_core/trpc";
server/routers/products.ts:32:export function isProductOwnedByUser(productOwnerId: number, userId: number) {
server/routers/products.ts:33:  return productOwnerId === userId;
server/routers/products.ts:40:  publishToMarketplace: protectedProcedure
server/routers/products.ts:78:  publishToAllMarketplaces: protectedProcedure
server/routers/products.ts:103:  updatePrice: protectedProcedure
server/routers/products.ts:139:  updateStock: protectedProcedure
server/routers/products.ts:175:  getSyncHistory: protectedProcedure
server/routers/products.ts:197:  list: protectedProcedure.query(async ({ ctx }) => {
server/routers/products.ts:202:      const userProducts = await db.select().from(products).where(eq(products.userId, ctx.user.id));
server/routers/products.ts:216:  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
server/routers/products.ts:224:        .where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)))
server/routers/products.ts:247:  create: protectedProcedure
server/routers/products.ts:254:        const duplicate = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, ctx.user.id), eq(products.sku, input.sku))).limit(1);
server/routers/products.ts:256:        const result = await db.insert(products).values({ userId: ctx.user.id, ...input });
server/routers/products.ts:258:        await writeAudit({ userId: ctx.user.id, action: "create_product", entity: "product", entityId: id, after: input, origin: "admin" });
server/routers/products.ts:272:  update: protectedProcedure
server/routers/products.ts:298:        const current = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
server/routers/products.ts:301:          const duplicate = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, ctx.user.id), eq(products.sku, input.sku))).limit(1);
server/routers/products.ts:307:        const before = await db.select().from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
server/routers/products.ts:308:        await db.update(products).set(updateData).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
server/routers/products.ts:309:        await writeAudit({ userId: ctx.user.id, action: "update_product", entity: "product", entityId: input.id, before: before[0], after: updateData, origin: "admin" });
server/routers/products.ts:320:  remove: protectedProcedure
server/routers/products.ts:326:        const current = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
server/routers/products.ts:328:        const before = await db.select().from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id))).limit(1);
server/routers/products.ts:329:        await db.delete(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
server/routers/products.ts:330:        await writeAudit({ userId: ctx.user.id, action: "delete_product", entity: "product", entityId: input.id, before: before[0], origin: "admin" });
server/routers/omnichannel.ts:9:import { protectedProcedure, router } from "../_core/trpc";
server/routers/omnichannel.ts:22:  listMedia: protectedProcedure
server/routers/omnichannel.ts:31:          eq(productMedia.userId, ctx.user.id),
server/routers/omnichannel.ts:33:          eq(products.userId, ctx.user.id),
server/routers/omnichannel.ts:38:  addMedia: protectedProcedure
server/routers/omnichannel.ts:52:        and(eq(products.id, input.productId), eq(products.userId, ctx.user.id)),
server/routers/omnichannel.ts:58:          and(eq(productMedia.productId, input.productId), eq(productMedia.userId, ctx.user.id)),
server/routers/omnichannel.ts:62:        userId: ctx.user.id,
server/routers/omnichannel.ts:75:  removeMedia: protectedProcedure
server/routers/omnichannel.ts:80:        and(eq(productMedia.id, input.id), eq(productMedia.userId, ctx.user.id)),
server/routers/omnichannel.ts:85:  enqueueSync: protectedProcedure
server/routers/omnichannel.ts:97:        and(eq(syncJobs.userId, ctx.user.id), eq(syncJobs.idempotencyKey, input.idempotencyKey)),
server/routers/omnichannel.ts:101:        userId: ctx.user.id,
server/routers/omnichannel.ts:112:  processPendingJobs: protectedProcedure
server/routers/omnichannel.ts:116:  listJobs: protectedProcedure
server/routers/omnichannel.ts:121:        .where(eq(syncJobs.userId, ctx.user.id))
server/routers/seoAdvanced.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/seoAdvanced.ts:40:  get: protectedProcedure.input(z.object({ productId: z.number().int().positive(), channel: channelSchema.default("store") })).query(async ({ ctx, input }) => {
server/routers/seoAdvanced.ts:42:    const rows = await db.select().from(productSeoProfiles).where(and(eq(productSeoProfiles.userId, ctx.user.id), eq(productSeoProfiles.productId, input.productId), eq(productSeoProfiles.channel, input.channel))).limit(1);
server/routers/seoAdvanced.ts:46:  analyze: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
server/routers/seoAdvanced.ts:48:    const productRows = await db.select({ name: products.name, description: products.description, photoUrl: products.photoUrl }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
server/routers/seoAdvanced.ts:54:  save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
server/routers/seoAdvanced.ts:56:    const productRows = await db.select({ name: products.name, description: products.description, photoUrl: products.photoUrl }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
server/routers/seoAdvanced.ts:60:    const existing = await db.select({ id: productSeoProfiles.id }).from(productSeoProfiles).where(and(eq(productSeoProfiles.userId, ctx.user.id), eq(productSeoProfiles.productId, input.productId), eq(productSeoProfiles.channel, input.channel))).limit(1);
server/routers/seoAdvanced.ts:61:    const values = { userId: ctx.user.id, productId: input.productId, channel: input.channel, slug: input.slug, seoTitle: input.seoTitle, metaDescription: input.metaDescription, focusKeyword: input.focusKeyword, secondaryKeywords: JSON.stringify(input.secondaryKeywords), altText: input.altText, canonicalUrl: input.canonicalUrl, schemaJson, score: result.score, issues: JSON.stringify(result.issues), status: input.status };
server/routers/inventory.ts:2:import { protectedProcedure, router } from "../_core/trpc";
server/routers/inventory.ts:6:  available: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional() })).query(({ ctx, input }) => InventoryService.available(ctx.user.id, input.productId, input.variantId)),
server/routers/inventory.ts:7:  availableToSell: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional() })).query(({ ctx, input }) => InventoryService.availableToSell(ctx.user.id, input.productId, input.variantId)),
server/routers/inventory.ts:8:  reserve: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), orderId: z.number().int().positive().optional(), quantity: z.number().int().positive(), expiresAt: z.coerce.date().optional() })).mutation(({ ctx, input }) => InventoryService.reserve({ userId: ctx.user.id, ...input })),
server/routers/inventory.ts:9:  release: protectedProcedure.input(z.object({ reservationId: z.number().int().positive(), status: z.enum(["released", "expired"]) })).mutation(({ ctx, input }) => InventoryService.changeStatus(ctx.user.id, input.reservationId, input.status)),
server/routers/inventory.ts:10:  confirm: protectedProcedure.input(z.object({ reservationId: z.number().int().positive() })).mutation(({ ctx, input }) => InventoryService.changeStatus(ctx.user.id, input.reservationId, "confirmed")),
server/routers/inventory.ts:11:  releaseExpired: protectedProcedure.mutation(({ ctx }) => InventoryService.releaseExpired(ctx.user.id)),
server/routers/catalogEnhancements.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/catalogEnhancements.ts:12:  listVariants: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ ctx, input }) => {
server/routers/catalogEnhancements.ts:14:    return db.select().from(productVariants).where(and(eq(productVariants.userId, ctx.user.id), eq(productVariants.productId, input.productId)));
server/routers/catalogEnhancements.ts:16:  createVariant: protectedProcedure.input(variantInput).mutation(async ({ ctx, input }) => {
server/routers/catalogEnhancements.ts:18:    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
server/routers/catalogEnhancements.ts:20:    const duplicate = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.userId, ctx.user.id), eq(productVariants.sku, input.sku))).limit(1);
server/routers/catalogEnhancements.ts:22:    const result = await db.insert(productVariants).values({ userId: ctx.user.id, productId: input.productId, sku: input.sku, gtin: input.gtin, name: input.name, attributes: JSON.stringify(input.attributes), price: input.price, stock: input.stock, status: input.status });
server/routers/catalogEnhancements.ts:25:  updateVariant: protectedProcedure.input(variantUpdateInput).mutation(async ({ ctx, input }) => {
server/routers/catalogEnhancements.ts:27:    const current = await db.select().from(productVariants).where(and(eq(productVariants.id, input.id), eq(productVariants.userId, ctx.user.id))).limit(1);
server/routers/catalogEnhancements.ts:31:    await db.update(productVariants).set(values).where(and(eq(productVariants.id, input.id), eq(productVariants.userId, ctx.user.id))); return { success: true };
server/routers/catalogEnhancements.ts:33:  removeVariant: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
server/routers/catalogEnhancements.ts:35:    await db.delete(productVariants).where(and(eq(productVariants.id, input.id), eq(productVariants.userId, ctx.user.id))); return { success: true };
server/routers/catalogEnhancements.ts:37:  listAttributes: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ ctx, input }) => {
server/routers/catalogEnhancements.ts:39:    return db.select().from(productAttributes).where(and(eq(productAttributes.userId, ctx.user.id), eq(productAttributes.productId, input.productId)));
server/routers/catalogEnhancements.ts:41:  upsertAttribute: protectedProcedure.input(z.object({ productId: z.number().int().positive(), namespace: z.string().max(50).default("catalog"), name: z.string().min(1).max(150), value: z.string().max(10000) })).mutation(async ({ ctx, input }) => {
server/routers/catalogEnhancements.ts:43:    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1); if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
server/routers/catalogEnhancements.ts:44:    const result = await db.insert(productAttributes).values({ userId: ctx.user.id, ...input }); return { id: Number((result as any)[0]?.insertId ?? 0) };
server/routers/dataTools.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/dataTools.ts:11:  exportCatalog: protectedProcedure.query(async ({ ctx }) => {
server/routers/dataTools.ts:13:    const rows = await db.select().from(products).where(eq(products.userId, ctx.user.id));
server/routers/dataTools.ts:14:    const variants = await db.select().from(productVariants).where(eq(productVariants.userId, ctx.user.id));
server/routers/dataTools.ts:15:    const seo = await db.select().from(productSeoProfiles).where(eq(productSeoProfiles.userId, ctx.user.id));
server/routers/dataTools.ts:18:  importCatalog: protectedProcedure.input(z.object({ rows: z.array(importRow).min(1).max(2000), mode: z.enum(["create_only", "upsert"]).default("upsert") })).mutation(async ({ ctx, input }) => {
server/routers/dataTools.ts:23:        const existing = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, ctx.user.id), eq(products.sku, row.sku))).limit(1);
server/routers/dataTools.ts:26:          await db.update(products).set({ ...row, updatedAt: new Date() }).where(and(eq(products.id, existing[0].id), eq(products.userId, ctx.user.id))); updated++;
server/routers/dataTools.ts:28:          await db.insert(products).values({ userId: ctx.user.id, ...row }); created++;
server/routers/operations.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/operations.ts:9:  readiness: protectedProcedure.query(async ({ ctx }) => {
server/routers/operations.ts:12:    const pending = await db.select({ count: sql<number>`count(*)` }).from(syncJobs).where(and(eq(syncJobs.userId, ctx.user.id), eq(syncJobs.status, "pending")));
server/routers/operations.ts:22:  overview: protectedProcedure.query(async ({ ctx }) => {
server/routers/operations.ts:25:      db.select({ status: syncJobs.status, count: sql<number>`count(*)` }).from(syncJobs).where(eq(syncJobs.userId, ctx.user.id)).groupBy(syncJobs.status),
server/routers/operations.ts:26:      db.select().from(syncJobs).where(eq(syncJobs.userId, ctx.user.id)).orderBy(desc(syncJobs.createdAt)).limit(50),
server/routers/operations.ts:27:      db.select().from(syncLogs).where(eq(syncLogs.userId, ctx.user.id)).orderBy(desc(syncLogs.createdAt)).limit(30),
server/routers/operations.ts:28:      db.select().from(webhookEvents).where(eq(webhookEvents.userId, ctx.user.id)).orderBy(desc(webhookEvents.createdAt)).limit(30),
server/routers/operations.ts:29:      db.select({ status: inventoryReservations.status, quantity: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(eq(inventoryReservations.userId, ctx.user.id)).groupBy(inventoryReservations.status),
server/routers/operations.ts:33:  retryJob: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
server/routers/operations.ts:35:    const result = await db.update(syncJobs).set({ status: "pending", nextRunAt: new Date(), errorMessage: null, updatedAt: new Date() }).where(and(eq(syncJobs.id, input.jobId), eq(syncJobs.userId, ctx.user.id)));
server/routers/conflicts.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/conflicts.ts:10:  list: protectedProcedure.input(z.object({ status: z.enum(["open", "resolved", "ignored"]).default("open") })).query(async ({ ctx, input }) => {
server/routers/conflicts.ts:12:    return db.select().from(syncConflicts).where(and(eq(syncConflicts.userId, ctx.user.id), eq(syncConflicts.status, input.status))).orderBy(desc(syncConflicts.createdAt)).limit(200);
server/routers/conflicts.ts:14:  resolve: protectedProcedure.input(z.object({ id: z.number().int().positive(), resolution: z.enum(["use_luary", "use_marketplace", "keep_both", "manual", "ignore"]) })).mutation(async ({ ctx, input }) => {
server/routers/conflicts.ts:16:    const current = await db.select().from(syncConflicts).where(and(eq(syncConflicts.id, input.id), eq(syncConflicts.userId, ctx.user.id), eq(syncConflicts.status, "open"))).limit(1);
server/routers/conflicts.ts:18:    await db.update(syncConflicts).set({ status: input.resolution === "ignore" ? "ignored" : "resolved", resolution: input.resolution, resolvedBy: ctx.user.id, resolvedAt: new Date(), updatedAt: new Date() }).where(and(eq(syncConflicts.id, input.id), eq(syncConflicts.userId, ctx.user.id)));
server/routers/conflicts.ts:19:    await writeAudit({ userId: ctx.user.id, action: "resolve_conflict", entity: "sync_conflict", entityId: input.id, before: current[0], after: { status: input.resolution === "ignore" ? "ignored" : "resolved", resolution: input.resolution }, origin: "admin" });
server/routers/identifiers.ts:5:import { protectedProcedure, router } from "../_core/trpc";
server/routers/identifiers.ts:11:  list: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ ctx, input }) => {
server/routers/identifiers.ts:13:    return db.select().from(productIdentifiers).where(and(eq(productIdentifiers.userId, ctx.user.id), eq(productIdentifiers.productId, input.productId)));
server/routers/identifiers.ts:15:  add: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), type: identifierType, value: z.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
server/routers/identifiers.ts:17:    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
server/routers/identifiers.ts:20:      const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(productVariants.userId, ctx.user.id))).limit(1);
server/routers/identifiers.ts:23:    const duplicate = await db.select({ id: productIdentifiers.id }).from(productIdentifiers).where(and(eq(productIdentifiers.userId, ctx.user.id), eq(productIdentifiers.type, input.type), eq(productIdentifiers.value, input.value))).limit(1);
server/routers/identifiers.ts:25:    const result = await db.insert(productIdentifiers).values({ userId: ctx.user.id, ...input });
server/routers/identifiers.ts:27:    await writeAudit({ userId: ctx.user.id, action: "add_identifier", entity: "product_identifier", entityId: id, after: input, origin: "admin" });
server/routers/identifiers.ts:30:  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
server/routers/identifiers.ts:32:    const current = await db.select().from(productIdentifiers).where(and(eq(productIdentifiers.id, input.id), eq(productIdentifiers.userId, ctx.user.id))).limit(1);
server/routers/identifiers.ts:34:    await db.delete(productIdentifiers).where(and(eq(productIdentifiers.id, input.id), eq(productIdentifiers.userId, ctx.user.id)));
server/routers/identifiers.ts:35:    await writeAudit({ userId: ctx.user.id, action: "remove_identifier", entity: "product_identifier", entityId: input.id, before: current[0], origin: "admin" });
server/routers/inventoryMovements.ts:2:import { protectedProcedure, router } from "../_core/trpc";
server/routers/inventoryMovements.ts:6:  applyMovement: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), orderId: z.number().int().positive().optional(), type: z.enum(["in", "out", "sale", "cancel", "return", "adjustment", "transfer"]), quantity: z.number().int().positive(), reason: z.string().max(255).optional(), reference: z.string().max(255).optional(), allowNegative: z.boolean().default(false) })).mutation(({ ctx, input }) => InventoryMovementService.apply({ userId: ctx.user.id, ...input })),
server/routers/mappings.ts:2:import { router, protectedProcedure } from "../_core/trpc";
server/routers/mappings.ts:9:  listCategoryMappings: protectedProcedure.query(async ({ ctx }) => {
server/routers/mappings.ts:12:    return db.select().from(marketplaceCategoryMappings).where(eq(marketplaceCategoryMappings.userId, ctx.user.id));
server/routers/mappings.ts:14:  upsertCategoryMapping: protectedProcedure.input(z.object({
server/routers/mappings.ts:23:      eq(marketplaceCategoryMappings.userId, ctx.user.id),
server/routers/mappings.ts:34:      userId: ctx.user.id,
server/routers/mappings.ts:38:  listAttributeMappings: protectedProcedure.query(async ({ ctx }) => {
server/routers/mappings.ts:41:    return db.select().from(marketplaceAttributeMappings).where(eq(marketplaceAttributeMappings.userId, ctx.user.id));
server/routers/mappings.ts:43:  upsertAttributeMapping: protectedProcedure.input(z.object({
server/routers/mappings.ts:52:      eq(marketplaceAttributeMappings.userId, ctx.user.id),
server/routers/mappings.ts:63:      userId: ctx.user.id,
server/routers/mappings.ts:67:  runPreflight: protectedProcedure.input(z.object({
server/routers/supply.ts:6:import { protectedProcedure, router } from "../_core/trpc";
server/routers/supply.ts:24:  dashboard: protectedProcedure.query(async ({ ctx }) => {
server/routers/supply.ts:27:      db.select().from(suppliers).where(eq(suppliers.userId, ctx.user.id)),
server/routers/supply.ts:28:      db.select().from(supplierProducts).where(eq(supplierProducts.userId, ctx.user.id)),
server/routers/supply.ts:29:      db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.userId, ctx.user.id), eq(suppliers.status, "blocked"))),
server/routers/supply.ts:30:      db.select().from(supplyRoutingPolicies).where(eq(supplyRoutingPolicies.userId, ctx.user.id)),
server/routers/supply.ts:37:    list: protectedProcedure.query(({ ctx }) => SupplierService.list(ctx.user.id)),
server/routers/supply.ts:38:    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(255), legalName: z.string().max(255).optional(), document: z.string().max(50).optional(), email: z.string().email().optional(), phone: z.string().max(50).optional(), website: z.string().url().optional(), defaultShippingDays: z.number().int().nonnegative().default(0), returnPolicy: z.string().optional(), dropshippingEnabled: z.boolean().default(false), crossDockingEnabled: z.boolean().default(false), integrationType: z.string().max(30).default("manual") })).mutation(({ ctx, input }) => SupplierService.create(ctx.user.id, { ...input, dropshippingEnabled: input.dropshippingEnabled ? 1 : 0, crossDockingEnabled: input.crossDockingEnabled ? 1 : 0, apiEnabled: 0, feedEnabled: 0, status: "pending_review", rating: 0 })),

## Placeholders
server/db.ts:92:// TODO: add feature queries here as your schema grows.
server/routers.ts:95:  // TODO: add feature routers here, e.g.
client/src/components/AIChatBox.tsx:38:  placeholder?: string;
client/src/components/AIChatBox.tsx:117:  placeholder = "Type your message...",
client/src/components/AIChatBox.tsx:316:          placeholder={placeholder}
client/src/components/LoginForm.tsx:27:        placeholder="Senha de acesso"
client/src/components/ui/command.tsx:76:          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
client/src/components/ui/input.tsx:57:        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
client/src/components/ui/select.tsx:38:        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
client/src/components/ui/textarea.tsx:56:        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
client/src/pages/Cadastros.tsx:161:      <div className="mt-4 max-w-xl"><Input placeholder="Filtrar o módulo atual por nome, código ou categoria" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
client/src/pages/ComponentShowcase.tsx:413:                  <Input id="email" type="email" placeholder="Email" />
client/src/pages/ComponentShowcase.tsx:419:                    placeholder="Type your message here."
client/src/pages/ComponentShowcase.tsx:426:                      <SelectValue placeholder="Select a fruit" />
client/src/pages/ComponentShowcase.tsx:562:                        <CommandInput placeholder="Search frameworks..." />
client/src/pages/ComponentShowcase.tsx:630:                          <SelectValue placeholder="MM" />
client/src/pages/ComponentShowcase.tsx:655:                          <SelectValue placeholder="YYYY" />
client/src/pages/ComponentShowcase.tsx:1039:                            placeholder="Type something..."
client/src/pages/ComponentShowcase.tsx:1413:                    placeholder="Try sending a message..."
client/src/pages/Products.tsx:173:                placeholder="SKU"
client/src/pages/Products.tsx:178:                placeholder="Nome do Produto"
client/src/pages/Products.tsx:183:                placeholder="Categoria"
client/src/pages/Products.tsx:188:                placeholder="Marca"
client/src/pages/Products.tsx:193:                placeholder="Descrição"
client/src/pages/Products.tsx:199:                placeholder="Custo Base (R$)"
client/src/pages/Products.tsx:205:                placeholder="Estoque"
client/src/pages/Products.tsx:211:                placeholder="Estoque Mínimo"
client/src/pages/Products.tsx:229:                placeholder="SKU"
client/src/pages/Products.tsx:234:                placeholder="Nome do Produto"
client/src/pages/Products.tsx:239:                placeholder="Categoria"
client/src/pages/Products.tsx:244:                placeholder="Marca"
client/src/pages/Products.tsx:249:                placeholder="Descrição"
client/src/pages/Products.tsx:255:                placeholder="Custo Base (R$)"
client/src/pages/Products.tsx:261:                placeholder="Estoque"
client/src/pages/Products.tsx:267:                placeholder="Estoque Mínimo"
client/src/pages/SalesChannels.tsx:192:                placeholder="Ex: Mercado Livre, Loja Própria, Instagram"
client/src/pages/SalesChannels.tsx:200:                placeholder="mercadolivre, shopee, amazon ou tiktok — deixe em branco se não for o caso"
client/src/pages/Omnichannel.tsx:108:              <Input placeholder="URL pública da mídia" value={url} onChange={(event) => setUrl(event.target.value)} />
client/src/pages/Omnichannel.tsx:110:            <Input placeholder="Texto alternativo / descrição SEO" value={altText} onChange={(event) => setAltText(event.target.value)} />
client/src/pages/SEOAdvanced.tsx:44:      <Card className="rounded-3xl border-slate-200/80 shadow-sm"><CardHeader><CardTitle>{product?.name ?? "Produto"}</CardTitle><CardDescription>Campos com limites e qualidade verificáveis antes da publicação.</CardDescription></CardHeader><CardContent className="space-y-4"><div><label className="text-sm font-medium">Título SEO</label><Input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder="Ex.: Brinco dourado minimalista" /><p className="mt-1 text-xs text-muted-foreground">{seoTitle.length}/60 caracteres recomendados</p></div><div><label className="text-sm font-medium">Meta description</label><Textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} placeholder="Resumo persuasivo da página..." /><p className="mt-1 text-xs text-muted-foreground">{metaDescription.length}/160 caracteres recomendados</p></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm font-medium">Palavra-chave principal</label><Input value={focusKeyword} onChange={(event) => setFocusKeyword(event.target.value)} /></div><div><label className="text-sm font-medium">Palavras secundárias</label><Input value={secondaryKeywords} onChange={(event) => setSecondaryKeywords(event.target.value)} placeholder="separadas, por vírgula" /></div></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm font-medium">Slug</label><Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="brinco-dourado-minimalista" /></div><div><label className="text-sm font-medium">Alt text da capa</label><Input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Descrição objetiva da imagem" /></div></div><div><label className="text-sm font-medium">URL canônica</label><Input value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} placeholder="https://sualoja.com/produtos/..." /></div><div className="flex flex-wrap gap-2"><Button disabled={!activeId || analyze.isPending} variant="outline" onClick={() => analyze.mutate(payload())}>{analyze.isPending ? "Analisando..." : "Analisar qualidade"}</Button><Button disabled={!activeId || save.isPending} onClick={() => save.mutate(payload())}>{save.isPending ? "Salvando..." : "Salvar perfil SEO"}</Button></div></CardContent></Card>
