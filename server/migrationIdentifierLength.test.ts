import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MAX_IDENTIFIER_LENGTH = 64;
const LEGACY_LONG_SUPPLIER_FK = "supplier_product_mappings_supplier_product_id_supplier_products_id_fk";

describe("migration identifier safety", () => {
  it("mantém nomes de constraints dentro do limite MariaDB/MySQL em SQL e snapshots", () => {
    const drizzleDir = join(process.cwd(), "drizzle");
    const metaDir = join(drizzleDir, "meta");
    const violations: string[] = [];

    for (const file of readdirSync(drizzleDir).filter((name) => name.endsWith(".sql"))) {
      const content = readFileSync(join(drizzleDir, file), "utf8");
      for (const match of content.matchAll(/CONSTRAINT `([^`]+)`/g)) {
        const name = match[1];
        if (name.length > MAX_IDENTIFIER_LENGTH) violations.push(`${file}: ${name.length}: ${name}`);
      }
    }

    for (const file of readdirSync(metaDir).filter((name) => name.endsWith(".snapshot.json"))) {
      const content = readFileSync(join(metaDir, file), "utf8");
      if (content.includes(LEGACY_LONG_SUPPLIER_FK)) violations.push(`${file}: legacy supplier FK remains`);
      for (const match of content.matchAll(/"name":\s*"([^"]+_fk)"/g)) {
        const name = match[1];
        if (name.length > MAX_IDENTIFIER_LENGTH) violations.push(`${file}: ${name.length}: ${name}`);
      }
    }

    const journal = readFileSync(join(metaDir, "_journal.json"), "utf8");
    expect(journal).not.toContain(LEGACY_LONG_SUPPLIER_FK);
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
