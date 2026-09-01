import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import { ShopeeAdapter } from "./adapters/ShopeeAdapter";

const credentials = {
  clientId: "unused-client-id",
  clientSecret: "unused-client-secret",
  partnerId: "123456",
  partnerKey: "partner-key",
  redirectUri: "https://sistema1-production.up.railway.app/marketplaces",
};

describe("Shopee Open Platform adapter", () => {
  it("builds the Brazilian seller authorization URL with partner_id", () => {
    const url = new URL(new ShopeeAdapter(credentials).getAuthorizationUrl("shopee::state"));

    expect(url.origin + url.pathname).toBe("https://open.shopee.com.br/auth");
    expect(url.searchParams.get("partner_id")).toBe("123456");
    expect(url.searchParams.get("auth_type")).toBe("seller");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(credentials.redirectUri);
    expect(url.searchParams.get("state")).toBe("shopee::state");
  });

  it("rejects Shopee credentials without partner identity", () => {
    expect(() => new ShopeeAdapter({ ...credentials, partnerId: undefined })).toThrow(
      "Shopee exige SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY",
    );
    expect(() => new ShopeeAdapter({ ...credentials, partnerKey: undefined })).toThrow(
      "Shopee exige SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY",
    );
  });

  it("requires the persisted shop_id before read-only listing import", async () => {
    await expect(new ShopeeAdapter(credentials).listListings("access-token")).rejects.toThrow(
      "Shopee exige shop_id para consultar a loja",
    );
  });

  it("validates seller info through a signed shop request", async () => {
    const get = vi.fn().mockResolvedValue({ data: { response: { shop_id: 987, shop_name: "Loja Shopee" } } });
    const create = vi.spyOn(axios, "create").mockReturnValue({
      get,
      defaults: { headers: { common: {} } },
    } as any);
    try {
      const adapter = new ShopeeAdapter({ ...credentials, externalAccountId: "987" });
      await expect(adapter.validateAndGetSellerInfo("access-token", "987")).resolves.toEqual({
        sellerId: "987",
        sellerName: "Loja Shopee",
      });
      expect(get).toHaveBeenCalledWith("/shop/get_shop_info", {
        params: expect.objectContaining({ partner_id: 123456, shop_id: 987, access_token: "access-token" }),
      });
    } finally {
      create.mockRestore();
    }
  });

  it("imports read-only listings using the persisted shop_id", async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({ data: { response: { shop_id: 987, shop_name: "Loja Shopee" } } })
      .mockResolvedValueOnce({ data: { response: { item: [{ item_id: 123 }] } } })
      .mockResolvedValueOnce({ data: { response: { item_list: [{ item_id: 123, item_name: "Brinco", item_status: "UNLIST", item_sku: "BR-123", price_info: [{ current_price: 29.9 }], stock_info_v2: { summary_info: { total_reserved_stock: 4 } } }] } } });
    const create = vi.spyOn(axios, "create").mockReturnValue({
      get,
      defaults: { headers: { common: {} } },
    } as any);
    try {
      const listings = await new ShopeeAdapter({ ...credentials, externalAccountId: "987" }).listListings("access-token", { limit: 10 });
      expect(listings).toEqual([expect.objectContaining({ listingId: "123", title: "Brinco", status: "paused", price: 2990, stock: 4 })]);
      expect(get).toHaveBeenNthCalledWith(2, "/product/get_item_list", {
        params: expect.objectContaining({ shop_id: 987, access_token: "access-token", page_size: 10 }),
      });
      expect(get).toHaveBeenNthCalledWith(3, "/product/get_item_base_info", {
        params: expect.objectContaining({ shop_id: 987, item_id_list: [123] }),
      });
    } finally {
      create.mockRestore();
    }
  });
});
