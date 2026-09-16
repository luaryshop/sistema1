import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      loginMethod: "password",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  MERCADOLIVRE_CLIENT_ID: process.env.MERCADOLIVRE_CLIENT_ID,
  MERCADOLIVRE_CLIENT_SECRET: process.env.MERCADOLIVRE_CLIENT_SECRET,
  MAGALU_CLIENT_ID: process.env.MAGALU_CLIENT_ID,
  MAGALU_CLIENT_SECRET: process.env.MAGALU_CLIENT_SECRET,
  AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
  AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
  TIKTOK_CLIENT_ID: process.env.TIKTOK_CLIENT_ID,
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
  TIKTOK_SERVICE_ID: process.env.TIKTOK_SERVICE_ID,
  MARKETPLACE_REDIRECT_URI: process.env.MARKETPLACE_REDIRECT_URI,
};

beforeEach(() => {
  process.env.NODE_ENV = "production";
  process.env.MERCADOLIVRE_CLIENT_ID = "client-id";
  process.env.MERCADOLIVRE_CLIENT_SECRET = "client-secret";
  process.env.MAGALU_CLIENT_ID = "magalu-client-id";
  process.env.MAGALU_CLIENT_SECRET = "magalu-client-secret";
  process.env.AMAZON_CLIENT_ID = "amazon-app-id";
  process.env.AMAZON_CLIENT_SECRET = "amazon-client-secret";
  process.env.TIKTOK_CLIENT_ID = "tiktok-app-key";
  process.env.TIKTOK_CLIENT_SECRET = "tiktok-app-secret";
  process.env.TIKTOK_SERVICE_ID = "tiktok-service-id";
  process.env.MARKETPLACE_REDIRECT_URI = "https://sistema1-production.up.railway.app/marketplaces";
});

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.MERCADOLIVRE_CLIENT_ID = originalEnv.MERCADOLIVRE_CLIENT_ID;
  process.env.MERCADOLIVRE_CLIENT_SECRET = originalEnv.MERCADOLIVRE_CLIENT_SECRET;
  process.env.MAGALU_CLIENT_ID = originalEnv.MAGALU_CLIENT_ID;
  process.env.MAGALU_CLIENT_SECRET = originalEnv.MAGALU_CLIENT_SECRET;
  process.env.AMAZON_CLIENT_ID = originalEnv.AMAZON_CLIENT_ID;
  process.env.AMAZON_CLIENT_SECRET = originalEnv.AMAZON_CLIENT_SECRET;
  process.env.TIKTOK_CLIENT_ID = originalEnv.TIKTOK_CLIENT_ID;
  process.env.TIKTOK_CLIENT_SECRET = originalEnv.TIKTOK_CLIENT_SECRET;
  process.env.TIKTOK_SERVICE_ID = originalEnv.TIKTOK_SERVICE_ID;
  process.env.MARKETPLACE_REDIRECT_URI = originalEnv.MARKETPLACE_REDIRECT_URI;
});

describe("marketplace.getAuthorizationUrl", () => {
  it("returns an authorization URL and CSRF state for Mercado Livre", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.marketplace.getAuthorizationUrl({ marketplaceType: "mercadolivre" });

    expect(result.authUrl).toMatch(/^https:\/\/auth\.mercadolivre\.com\.br\/authorization\?/);
    expect(result.authUrl).toContain("client_id=client-id");
    expect(result.authUrl).toContain("redirect_uri=https%3A%2F%2Fsistema1-production.up.railway.app%2Fmarketplaces");
    expect(result.state).toMatch(/^mercadolivre::/);
  });

  it("returns an authorization URL and CSRF state for Magalu", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.marketplace.getAuthorizationUrl({ marketplaceType: "magalu" });

    expect(result.authUrl).toMatch(/^https:\/\/id\.magalu\.com\/login\?/);
    expect(result.authUrl).toContain("client_id=magalu-client-id");
    expect(result.authUrl).toContain("scope=");
    expect(result.state).toMatch(/^magalu::/);
  });

  it("returns an authorization URL for Amazon pointing to the Brazilian Seller Central", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.marketplace.getAuthorizationUrl({ marketplaceType: "amazon" });

    expect(result.authUrl).toMatch(/^https:\/\/sellercentral\.amazon\.com\.br\/apps\/authorize\/consent\?/);
    expect(result.authUrl).toContain("application_id=amazon-app-id");
    expect(result.state).toMatch(/^amazon::/);
  });

  it("returns a TikTok Shop authorization URL with service_id (sem redirect_uri/state)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.marketplace.getAuthorizationUrl({ marketplaceType: "tiktok" });

    expect(result.authUrl).toBe("https://services.tiktokshop.com/open/authorize?service_id=tiktok-service-id");
    expect(result.state).toMatch(/^tiktok::/);
  });

  it("returns an actionable error when the client secret is missing", async () => {
    delete process.env.MERCADOLIVRE_CLIENT_SECRET;
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.marketplace.getAuthorizationUrl({ marketplaceType: "mercadolivre" })).rejects.toThrow(
      "MERCADOLIVRE_CLIENT_SECRET não configurado no servidor",
    );
  });

  it("rejects a missing callback", async () => {
    delete process.env.MARKETPLACE_REDIRECT_URI;
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.marketplace.getAuthorizationUrl({ marketplaceType: "mercadolivre" })).rejects.toThrow(
      "MARKETPLACE_REDIRECT_URI não configurada no servidor",
    );
  });

  it("rejects an insecure production callback", async () => {
    process.env.MARKETPLACE_REDIRECT_URI = "http://localhost:3000/marketplaces";
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.marketplace.getAuthorizationUrl({ marketplaceType: "mercadolivre" })).rejects.toThrow(
      "MARKETPLACE_REDIRECT_URI deve usar HTTPS em produção",
    );
  });
});
