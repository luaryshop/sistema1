import { describe, expect, it } from "vitest";
import { normalizeSupplierProduct } from "./supplierImportService";

describe("supplier import normalization", () => {
  it("normalizes a valid supplier product", () => {
    const product = normalizeSupplierProduct({ externalId: "A-1", name: "Produto", costCents: 1290, stock: 4 });
    expect(product).toMatchObject({ externalId: "A-1", name: "Produto", costCents: 1290, stock: 4 });
  });

  it("rejects missing identity and commercial values", () => {
    expect(() => normalizeSupplierProduct({ name: "Produto", costCents: 1290, stock: 4 })).toThrow();
    expect(() => normalizeSupplierProduct({ externalId: "A-1", name: "Produto", costCents: -1, stock: 4 })).toThrow();
    expect(() => normalizeSupplierProduct({ externalId: "A-1", name: "Produto", costCents: 1290, stock: -1 })).toThrow();
  });

  it("rejects malformed media and attributes", () => {
    expect(() => normalizeSupplierProduct({ externalId: "A-1", name: "Produto", costCents: 1290, stock: 4, images: ["not-a-url"] })).toThrow();
    expect(() => normalizeSupplierProduct({ externalId: "A-1", name: "Produto", costCents: 1290, stock: 4, attributes: { color: 123 } })).toThrow();
  });
});
