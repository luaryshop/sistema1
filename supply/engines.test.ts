import { describe, expect, it } from "vitest";
import { calculateLandedCost, calculateMargin, calculateMinimumSalePrice, calculateOpportunityScore, calculateSupplyScore, evaluateSupplyGate, routeSupply } from "./engines";

describe("Supply Engine", () => {
  it("calcula landed cost somando todos os componentes em centavos", () => {
    expect(calculateLandedCost({ supplierCostCents: 1000, supplierShippingCents: 200, marketplaceFeesCents: 150, paymentFeesCents: 50, taxesCents: 100, operationalCostCents: 25, packagingCents: 75, expectedReturnCostCents: 40, riskReserveCents: 60 }).realCostCents).toBe(1700);
  });

  it("calcula preço mínimo com taxas percentuais e margem mínima", () => {
    const minimum = calculateMinimumSalePrice({ fixedCostCents: 10000, marketplaceFeeBp: 1200, paymentFeeBp: 300, taxBp: 500, minimumMarginBp: 1500 });
    expect(minimum.valid).toBe(true);
    expect(minimum.minimumSalePriceCents).toBe(15385);
  });

  it("bloqueia preço mínimo quando as taxas atingem 100%", () => {
    expect(calculateMinimumSalePrice({ fixedCostCents: 1000, marketplaceFeeBp: 10000 }).valid).toBe(false);
  });

  it("bloqueia margem abaixo do mínimo", () => {
    const margin = calculateMargin(10000, 8500, 2000);
    expect(margin.marginBp).toBe(1500);
    expect(margin.valid).toBe(false);
  });

  it("escolhe fornecedor backup confiável quando o principal está sem estoque", () => {
    const decision = routeSupply([
      { supplierId: 1, priority: 0, stock: 0, costCents: 900, shippingCents: 100, leadTimeDays: 2, reliabilityBp: 9500, stale: false, blocked: false },
      { supplierId: 2, priority: 1, stock: 50, costCents: 1100, shippingCents: 100, leadTimeDays: 3, reliabilityBp: 9000, stale: false, blocked: false },
    ]);
    expect(decision.supplierId).toBe(2);
  });

  it("não vende com estoque stale ou sem buffer disponível", () => {
    const decision = routeSupply([
      { supplierId: 1, priority: 0, stock: 20, stockBuffer: 20, costCents: 1000, shippingCents: 100, leadTimeDays: 2, reliabilityBp: 9500, stale: false, blocked: false },
      { supplierId: 2, priority: 1, stock: 20, stockBuffer: 0, costCents: 1200, shippingCents: 100, leadTimeDays: 3, reliabilityBp: 9000, stale: true, blocked: false },
    ]);
    expect(decision.supplierId).toBeNull();
  });

  it("aplica o Supply Gate e mantém pre-order como exceção explícita", () => {
    const input = { productValid: true, supplierApproved: true, productLinked: true, stockReliable: false, costValid: true, marginValid: true, shippingKnown: true, leadTimeKnown: true, mediaValid: true, contentValid: true, rightsAuthorized: true, fulfillmentMode: "dropshipping" as const };
    const blocked = evaluateSupplyGate(input);
    expect(blocked.status).toBe("blocked");
    const preorder = evaluateSupplyGate({ ...input, fulfillmentMode: "pre_order" });
    expect(preorder.status).toBe("eligible");
  });

  it("bloqueia pre-order quando falha governança comercial", () => {
    const base = { productValid: true, supplierApproved: true, productLinked: true, stockReliable: false, costValid: true, marginValid: true, shippingKnown: false, leadTimeKnown: false, mediaValid: true, contentValid: true, rightsAuthorized: true, fulfillmentMode: "pre_order" as const };
    expect(evaluateSupplyGate({ ...base, supplierApproved: false }).status).toBe("blocked");
    expect(evaluateSupplyGate({ ...base, marginValid: false }).status).toBe("blocked");
    expect(evaluateSupplyGate({ ...base, mediaValid: false }).status).toBe("blocked");
    expect(evaluateSupplyGate({ ...base, rightsAuthorized: false }).status).toBe("blocked");
    expect(evaluateSupplyGate(base).status).toBe("eligible");
  });

  it("classifica Supply Score e Opportunity Score", () => {
    expect(calculateSupplyScore({ marginBp: 8000, stockScore: 90, demandScore: 80, supplierScore: 95, leadTimeScore: 90, riskScore: 90 }).classification).toBe("good");
    expect(calculateOpportunityScore({ demandScore: 90, marginScore: 90, supplierScore: 90, seoScore: 80, competitivenessScore: 80, riskScore: 10 }).score).toBeGreaterThan(70);
  });
});
