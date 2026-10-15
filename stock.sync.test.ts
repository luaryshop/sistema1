import { describe, expect, it } from "vitest";
import { MarketplaceRateLimiter } from "./services/rateLimiter";

describe("marketplace rate limiter", () => {
  it("permite chamadas dentro da janela", async () => {
    await expect(MarketplaceRateLimiter.acquire(`test-${Date.now()}`, 2, 1000)).resolves.toBeUndefined();
  });
});

describe("inventory movement rules", () => {
  it("classifica entrada, venda e devolução com sinais corretos", () => {
    const delta = (type: string, quantity: number) => ["in", "cancel", "return"].includes(type) ? quantity : -quantity;
    expect(delta("in", 5)).toBe(5);
    expect(delta("sale", 2)).toBe(-2);
    expect(delta("return", 1)).toBe(1);
  });
});
