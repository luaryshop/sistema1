import { z } from "zod";

const supportedMarketplaceSchema = z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]);

export type MarketplaceOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  partnerId?: string;
  partnerKey?: string;
};

export function getMarketplaceOAuthConfig(
  marketplaceType: string,
  env: NodeJS.ProcessEnv = process.env,
): MarketplaceOAuthConfig {
  const parsedType = supportedMarketplaceSchema.safeParse(marketplaceType);
  if (!parsedType.success) {
    throw new Error(`Unsupported marketplace: ${marketplaceType}`);
  }

  const prefix = parsedType.data.toUpperCase();
  const clientId = env[`${prefix}_CLIENT_ID`]?.trim() ?? "";
  const clientSecret = env[`${prefix}_CLIENT_SECRET`]?.trim() ?? "";
  const redirectUri = env.MARKETPLACE_REDIRECT_URI?.trim() ?? "";

  const partnerId = parsedType.data === "shopee" ? env.SHOPEE_PARTNER_ID?.trim() ?? "" : undefined;
  const partnerKey = parsedType.data === "shopee" ? env.SHOPEE_PARTNER_KEY?.trim() ?? "" : undefined;
  if (parsedType.data === "shopee") {
    if (!partnerId) throw new Error("SHOPEE_PARTNER_ID não configurado no servidor");
    if (!partnerKey) throw new Error("SHOPEE_PARTNER_KEY não configurado no servidor");
  } else {
    if (!clientId) throw new Error(`${prefix}_CLIENT_ID não configurado no servidor`);
    if (!clientSecret) throw new Error(`${prefix}_CLIENT_SECRET não configurado no servidor`);
  }
  if (!redirectUri) {
    throw new Error("MARKETPLACE_REDIRECT_URI não configurada no servidor");
  }

  let parsedRedirectUri: URL;
  try {
    parsedRedirectUri = new URL(redirectUri);
  } catch {
    throw new Error("MARKETPLACE_REDIRECT_URI não é uma URL válida");
  }

  if (parsedRedirectUri.protocol !== "https:" && env.NODE_ENV === "production") {
    throw new Error("MARKETPLACE_REDIRECT_URI deve usar HTTPS em produção");
  }

  return {
    clientId: clientId || partnerId || "",
    clientSecret: clientSecret || partnerKey || "",
    redirectUri,
    partnerId,
    partnerKey,
  };
}
