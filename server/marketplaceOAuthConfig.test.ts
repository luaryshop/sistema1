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
});
