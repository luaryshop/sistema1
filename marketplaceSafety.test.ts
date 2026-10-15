import { afterEach, describe, expect, it } from "vitest";
import { assertMarketplaceWriteEnabled, getMarketplaceMode } from "./services/marketplaceSafetyService";

afterEach(() => {
  delete process.env.MARKETPLACE_MODE;
});

describe("marketplace safety mode", () => {
  it("usa READ_ONLY como padrão", () => {
    expect(getMarketplaceMode()).toBe("read_only");
    expect(() => assertMarketplaceWriteEnabled("publicação", "mercadolivre")).toThrow(/READ_ONLY/);
  });

  it("bloqueia escrita quando configurado como READ_ONLY", () => {
    process.env.MARKETPLACE_MODE = "READ_ONLY";
    for (const operation of ["publicação", "atualização de preço", "atualização de estoque", "pausa de anúncio", "ativação de anúncio"]) {
      expect(() => assertMarketplaceWriteEnabled(operation, "mercadolivre")).toThrow(/READ_ONLY/);
    }
  });

  it("permite escrita somente no modo LIVE explícito", () => {
    process.env.MARKETPLACE_MODE = "LIVE";
    expect(() => assertMarketplaceWriteEnabled("publicação", "mercadolivre")).not.toThrow();
  });
});
