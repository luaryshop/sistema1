import { describe, expect, it } from "vitest";
import { assertVariantOwnership, shouldAutoApproveExact } from "./securityPolicy";

describe("Supply security policy", () => {
  it("aceita somente a variante que passou pelas três validações", () => {
    expect(assertVariantOwnership({ variantExists: true, ownerMatches: true, productMatches: true })).toBe(true);
  });

  it("bloqueia variante inexistente, de outro usuário ou de outro produto", () => {
    for (const input of [
      { variantExists: false, ownerMatches: true, productMatches: true },
      { variantExists: true, ownerMatches: false, productMatches: true },
      { variantExists: true, ownerMatches: true, productMatches: false },
    ]) {
      expect(() => assertVariantOwnership(input)).toThrow();
    }
  });

  it("mantém auto aprovação exact desligada por padrão", () => {
    expect(shouldAutoApproveExact(undefined)).toBe(false);
    expect(shouldAutoApproveExact("false")).toBe(false);
    expect(shouldAutoApproveExact("true")).toBe(true);
  });
});
