import { describe, expect, it } from "vitest";
import { calculateAvailableToSell } from "./services/inventoryService";

describe("available to sell", () => {
  it("combines own stock with eligible supplier stock", () => {
    const result = calculateAvailableToSell(3, [{ supplierId: 1, supplierProductId: 10, mode: "dropshipping", available: 5, stale: false, blocked: false }]);
    expect(result.available).toBe(8);
    expect(result.eligibleSources).toHaveLength(1);
  });

  it("excludes stale and blocked supplier sources", () => {
    const result = calculateAvailableToSell(2, [
      { supplierId: 1, supplierProductId: 10, mode: "dropshipping", available: 9, stale: true, blocked: false },
      { supplierId: 2, supplierProductId: 20, mode: "hybrid", available: 7, stale: false, blocked: true },
    ]);
    expect(result.available).toBe(2);
    expect(result.eligibleSources).toHaveLength(0);
  });

  it("never returns negative own availability", () => {
    expect(calculateAvailableToSell(-4, []).available).toBe(0);
  });
});
