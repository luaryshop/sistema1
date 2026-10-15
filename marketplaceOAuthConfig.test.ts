import { describe, expect, it } from "vitest";
import { getMarketplaceOAuthConfig } from "./services/marketplaceOAuthConfig";

describe("marketplace OAuth configuration", () => {
  const validEnv = {
    NODE_ENV: "production",
    MERCADOLIVRE_CLIENT_ID: "client-id",
    MERCADOLIVRE_CLIENT_SECRET: "client-secret",
    MARKETPLACE_REDIRECT_URI: "https://sistema1-production.up.railway.app/marketplaces",
  };

  it("accepts a complete HTTPS configuration", () => {
    expect(getMarketplaceOAuthConfig("mercadolivre", validEnv)).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: validEnv.MARKETPLACE_REDIRECT_URI,
    });
  });

  it("rejects missing credentials with an actionable message", () => {
    expect(() => getMarketplaceOAuthConfig("mercadolivre", {
      ...validEnv,
      MERCADOLIVRE_CLIENT_SECRET: "",
    })).toThrow("MERCADOLIVRE_CLIENT_SECRET não configurado no servidor");
  });

  it("rejects a non-HTTPS production callback", () => {
    expect(() => getMarketplaceOAuthConfig("mercadolivre", {
      ...validEnv,
      MARKETPLACE_REDIRECT_URI: "http://localhost:3000/marketplaces",
    })).toThrow("MARKETPLACE_REDIRECT_URI deve usar HTTPS em produção");
  });

  it("requires Shopee partner credentials", () => {
    const shopeeEnv = {
      NODE_ENV: "production",
      SHOPEE_CLIENT_ID: "app-id",
      SHOPEE_CLIENT_SECRET: "app-secret",
      MARKETPLACE_REDIRECT_URI: validEnv.MARKETPLACE_REDIRECT_URI,
      SHOPEE_PARTNER_ID: "123456",
      SHOPEE_PARTNER_KEY: "partner-key",
    };

    expect(getMarketplaceOAuthConfig("shopee", shopeeEnv)).toEqual({
      clientId: "app-id",
      clientSecret: "app-secret",
      redirectUri: validEnv.MARKETPLACE_REDIRECT_URI,
      partnerId: "123456",
      partnerKey: "partner-key",
    });
    expect(() => getMarketplaceOAuthConfig("shopee", { ...shopeeEnv, SHOPEE_PARTNER_ID: "" })).toThrow(
      "SHOPEE_PARTNER_ID não configurado no servidor",
    );
    expect(() => getMarketplaceOAuthConfig("shopee", { ...shopeeEnv, SHOPEE_PARTNER_KEY: "" })).toThrow(
      "SHOPEE_PARTNER_KEY não configurado no servidor",
    );
  });
});
