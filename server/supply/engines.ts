export type FulfillmentMode = "own_stock" | "dropshipping" | "cross_docking" | "pre_order" | "supplier_fulfillment" | "hybrid";

export type LandedCostInput = {
  supplierCostCents: number;
  supplierShippingCents: number;
  marketplaceFeesCents?: number;
  paymentFeesCents?: number;
  taxesCents?: number;
  operationalCostCents?: number;
  packagingCents?: number;
  expectedReturnCostCents?: number;
  riskReserveCents?: number;
};

export function calculateLandedCost(input: LandedCostInput) {
  const components = {
    supplierCostCents: Math.max(0, input.supplierCostCents),
    supplierShippingCents: Math.max(0, input.supplierShippingCents),
    marketplaceFeesCents: Math.max(0, input.marketplaceFeesCents ?? 0),
    paymentFeesCents: Math.max(0, input.paymentFeesCents ?? 0),
    taxesCents: Math.max(0, input.taxesCents ?? 0),
    operationalCostCents: Math.max(0, input.operationalCostCents ?? 0),
    packagingCents: Math.max(0, input.packagingCents ?? 0),
    expectedReturnCostCents: Math.max(0, input.expectedReturnCostCents ?? 0),
    riskReserveCents: Math.max(0, input.riskReserveCents ?? 0),
  };
  const realCostCents = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { ...components, realCostCents };
}

export type MarginResult = {
  salePriceCents: number;
  landedCostCents: number;
  marginCents: number;
  marginBp: number;
  valid: boolean;
};

export function calculateMargin(salePriceCents: number, landedCostCents: number, minimumMarginBp = 0): MarginResult {
  const price = Math.max(0, salePriceCents);
  const cost = Math.max(0, landedCostCents);
  const marginCents = price - cost;
  const marginBp = price > 0 ? Math.round((marginCents / price) * 10_000) : 0;
  return { salePriceCents: price, landedCostCents: cost, marginCents, marginBp, valid: price > 0 && marginCents >= 0 && marginBp >= minimumMarginBp };
}

export type RoutingCandidate = {
  supplierId: number;
  priority: number;
  stock: number;
  reservedStock?: number;
  stockBuffer?: number;
  costCents: number;
  shippingCents: number;
  leadTimeDays: number;
  reliabilityBp: number;
  cancellationRateBp?: number;
  returnRateBp?: number;
  stale: boolean;
  blocked: boolean;
  allowedModes?: FulfillmentMode[];
};

export type RoutingDecision = {
  supplierId: number | null;
  reason: string;
  candidates: Array<RoutingCandidate & { availableStock: number; score: number }>;
};

export function routeSupply(candidates: RoutingCandidate[], quantity = 1, mode: FulfillmentMode = "dropshipping"): RoutingDecision {
  const scored = candidates.map((candidate) => {
    const availableStock = Math.max(0, candidate.stock - (candidate.reservedStock ?? 0) - (candidate.stockBuffer ?? 0));
    const modeAllowed = !candidate.allowedModes?.length || candidate.allowedModes.includes(mode) || mode === "hybrid";
    const score = Math.round(
      (availableStock > 0 ? 30 : 0) +
      Math.min(25, (candidate.reliabilityBp / 10_000) * 25) +
      Math.max(0, 20 - Math.min(20, candidate.costCents / 100)) +
      Math.max(0, 15 - Math.min(15, candidate.shippingCents / 100)) +
      Math.max(0, 10 - Math.min(10, candidate.leadTimeDays)) -
      (candidate.stale ? 25 : 0) -
      (candidate.blocked || !modeAllowed ? 100 : 0) -
      Math.min(10, ((candidate.cancellationRateBp ?? 0) + (candidate.returnRateBp ?? 0)) / 1_000)
    );
    return { ...candidate, availableStock, score };
  }).sort((a, b) => b.score - a.score || a.priority - b.priority);
  const winner = scored.find((candidate) => !candidate.blocked && !candidate.stale && candidate.availableStock >= quantity && candidate.score > 0);
  return winner
    ? { supplierId: winner.supplierId, reason: "melhor combinação de estoque, custo, prazo, confiabilidade e risco", candidates: scored }
    : { supplierId: null, reason: "nenhum fornecedor aprovado possui estoque confiável suficiente", candidates: scored };
}

export type SupplyGateInput = {
  productValid: boolean;
  supplierApproved: boolean;
  productLinked: boolean;
  stockReliable: boolean;
  costValid: boolean;
  marginValid: boolean;
  shippingKnown: boolean;
  leadTimeKnown: boolean;
  mediaValid: boolean;
  contentValid: boolean;
  rightsAuthorized: boolean;
  fulfillmentMode: FulfillmentMode;
};

export function evaluateSupplyGate(input: SupplyGateInput) {
  const checks = [
    ["productValid", input.productValid],
    ["supplierApproved", input.supplierApproved],
    ["productLinked", input.productLinked],
    ["stockReliable", input.stockReliable],
    ["costValid", input.costValid],
    ["marginValid", input.marginValid],
    ["shippingKnown", input.shippingKnown],
    ["leadTimeKnown", input.leadTimeKnown],
    ["mediaValid", input.mediaValid],
    ["contentValid", input.contentValid],
    ["rightsAuthorized", input.rightsAuthorized],
  ] as const;
  const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
  const preOrderAvailabilityOnly = input.fulfillmentMode === "pre_order";
  const effectiveFailures = preOrderAvailabilityOnly ? failures.filter((failure) => !["stockReliable", "shippingKnown", "leadTimeKnown"].includes(failure)) : failures;
  const eligible = effectiveFailures.length === 0;
  return { eligible, failures: effectiveFailures, status: eligible ? "eligible" as const : "blocked" as const };
}

export function calculateSupplyScore(input: { marginBp: number; stockScore: number; demandScore: number; supplierScore: number; leadTimeScore: number; riskScore: number }) {
  const score = Math.round(
    Math.min(100, Math.max(0, input.marginBp / 100)) * 0.25 +
    Math.min(100, Math.max(0, input.stockScore)) * 0.2 +
    Math.min(100, Math.max(0, input.demandScore)) * 0.2 +
    Math.min(100, Math.max(0, input.supplierScore)) * 0.15 +
    Math.min(100, Math.max(0, input.leadTimeScore)) * 0.1 +
    Math.min(100, Math.max(0, input.riskScore)) * 0.1
  );
  return { score, classification: score >= 90 ? "hot" as const : score >= 75 ? "good" as const : score >= 60 ? "watch" as const : "risk" as const };
}

export function calculateOpportunityScore(input: { demandScore: number; marginScore: number; supplierScore: number; seoScore: number; competitivenessScore: number; riskScore: number }) {
  const score = Math.round(
    input.demandScore * 0.25 + input.marginScore * 0.25 + input.supplierScore * 0.2 + input.seoScore * 0.1 + input.competitivenessScore * 0.1 - input.riskScore * 0.1
  );
  return { score: Math.max(0, Math.min(100, score)), classification: score >= 90 ? "hot" as const : score >= 75 ? "good" as const : score >= 60 ? "watch" as const : "risk" as const };
}
