export type WebhookJobType = "order" | "stock" | "price" | null;

export function routeWebhookEvent(topic: string | undefined, body: unknown): { jobType: WebhookJobType; normalizedTopic: string } {
  const value = topic || String((body as Record<string, unknown> | null)?.type || "unknown");
  const normalized = value.toLowerCase();
  if (normalized.includes("order") || normalized.includes("payment") || normalized.includes("shipment") || normalized.includes("cancel") || normalized.includes("return")) {
    return { jobType: "order", normalizedTopic: normalized };
  }
  if (normalized.includes("price")) return { jobType: "price", normalizedTopic: normalized };
  if (normalized.includes("stock") || normalized.includes("inventory") || normalized.includes("item") || normalized.includes("listing")) {
    return { jobType: "stock", normalizedTopic: normalized };
  }
  return { jobType: null, normalizedTopic: normalized };
}
