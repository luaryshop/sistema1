import { afterEach, describe, expect, it, vi } from "vitest";
import { ListingImportService } from "./services/listingImportService";
import { MarketplaceService } from "./services/marketplaceService";

afterEach(() => vi.restoreAllMocks());

describe("ListingImportService Shopee preview", () => {
  it("passes the persisted sellerId connection to the read-only adapter", async () => {
    const connection = {
      id: 7,
      userId: 11,
      marketplaceType: "shopee",
      sellerId: "987",
      isConnected: 1,
      accessToken: "encrypted-access-token",
      refreshToken: null,
      tokenExpiresAt: null,
    } as any;
    const listListings = vi.fn().mockResolvedValue([
      { listingId: "123", title: "Brinco", status: "paused", raw: { item_status: "UNLIST" } },
    ]);
    const adapter = { listListings } as any;

    const getConnection = vi.spyOn(MarketplaceService, "getConnection").mockResolvedValue(connection);
    const refreshTokenIfNeeded = vi.spyOn(MarketplaceService, "refreshTokenIfNeeded").mockResolvedValue("access-token");
    const getAdapter = vi.spyOn(MarketplaceService, "getAdapter").mockResolvedValue(adapter);

    await expect(ListingImportService.previewListings(11, "shopee", "all", 10)).resolves.toEqual([
      expect.objectContaining({ listingId: "123", status: "paused" }),
    ]);
    expect(getConnection).toHaveBeenCalledWith(11, "shopee");
    expect(refreshTokenIfNeeded).toHaveBeenCalledWith(connection);
    expect(getAdapter).toHaveBeenCalledWith(expect.objectContaining({ sellerId: "987" }));
    expect(listListings).toHaveBeenCalledWith("access-token", { status: "all", limit: 10 });
  });
});
