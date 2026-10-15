export type MarketplaceMode = "read_only" | "live";

export function getMarketplaceMode(): MarketplaceMode {
  return String(process.env.MARKETPLACE_MODE || "READ_ONLY").toLowerCase() === "live" ? "live" : "read_only";
}

export function assertMarketplaceWriteEnabled(operation: string, marketplaceType?: string): void {
  if (getMarketplaceMode() !== "live") {
    const channel = marketplaceType ? ` no canal ${marketplaceType}` : "";
    throw new Error(`MARKETPLACE_MODE=READ_ONLY bloqueou ${operation}${channel}. Ative o modo live explicitamente após a homologação.`);
  }
}
