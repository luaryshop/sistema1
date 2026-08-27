import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { marketplaceAttributeMappings, productAttributes } from "../../drizzle/schema";

export async function resolveMarketplaceAttributes(userId: number, productId: number, marketplaceType: string): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [sourceRows, mappingRows] = await Promise.all([
    db.select().from(productAttributes).where(and(eq(productAttributes.userId, userId), eq(productAttributes.productId, productId))),
    db.select().from(marketplaceAttributeMappings).where(and(eq(marketplaceAttributeMappings.userId, userId), eq(marketplaceAttributeMappings.marketplaceType, marketplaceType))),
  ]);
  const mappings = new Map(mappingRows.map((row) => [row.sourceName.toLowerCase(), row]));
  const output: Record<string, string> = {};
  for (const source of sourceRows) {
    const mapping = mappings.get(source.name.toLowerCase());
    const externalName = mapping?.externalName || source.name;
    let value = source.value;
    if (mapping?.valueMap) {
      try {
        const valueMap = JSON.parse(mapping.valueMap) as Record<string, string>;
        value = valueMap[value] || value;
      } catch {
        // Ignore malformed optional maps; the source value remains auditable.
      }
    }
    output[externalName] = value;
  }
  return output;
}
