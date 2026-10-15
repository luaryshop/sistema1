import { describe, expect, it } from "vitest";
import { CsvSupplierAdapter, parseStock } from "./csvAdapter";
import { ManualSupplierAdapter } from "./manualAdapter";
import { SupplierAdapterRegistry } from "./registry";
import { parseMoneyToCents } from "./money";

describe("Supplier Adapter Framework", () => {
  it("registra e cria adapters seguros", async () => {
    expect(SupplierAdapterRegistry.supported()).toEqual(["manual", "csv"]);
    expect((await SupplierAdapterRegistry.create("manual").testConnection()).ok).toBe(true);
  });

  it("converte formatos monetários brasileiro e internacional para centavos", () => {
    expect(parseMoneyToCents("12,50")).toBe(1250);
    expect(parseMoneyToCents("12.50")).toBe(1250);
    expect(parseMoneyToCents("1.250,50")).toBe(125050);
    expect(parseMoneyToCents("1,250.50")).toBe(125050);
    expect(parseMoneyToCents("1250")).toBe(125000);
    expect(parseMoneyToCents("R$ 12,50")).toBe(1250);
    expect(() => parseMoneyToCents("-1,00")).toThrow();
    expect(() => parseMoneyToCents("999999999999,99")).toThrow();
  });

  it("normaliza CSV para centavos e estoque", async () => {
    const adapter = new CsvSupplierAdapter({ csv: "id,nome,custo,estoque\nABC,Produto A,\"12,50\",5\nDEF,Produto B,19.00,2" });
    const result = await adapter.listProducts();
    expect(result.products).toHaveLength(2);
    expect(result.products[0].costCents).toBe(1250);
    expect(result.products[1].stock).toBe(2);
  });

  it("detecta CSV brasileiro com ponto e vírgula, BOM e aspas escapadas", async () => {
    const adapter = new CsvSupplierAdapter({ csv: "\uFEFFcodigo;nome;custo;estoque\nA;\"Produto \"\"Especial\"\"\";\"1.250,50\";10" });
    const result = await adapter.listProducts();
    expect(result.products[0].name).toBe('Produto "Especial"');
    expect(result.products[0].costCents).toBe(125050);
    expect(result.products[0].stock).toBe(10);
  });

  it("rejeita estoque inválido e fracionado", () => {
    expect(() => parseStock("abc")).toThrow();
    expect(() => parseStock("1.5")).toThrow();
    expect(() => parseStock("-1")).toThrow();
    expect(parseStock("2")).toBe(2);
  });

  it("rejeita linha CSV sem identificador ou nome", async () => {
    const adapter = new CsvSupplierAdapter({ csv: "id,nome,custo\n,Produto A,10" });
    await expect(adapter.listProducts()).rejects.toThrow("externalId e name");
  });

  it("mantém catálogo manual somente em memória", async () => {
    const adapter = new ManualSupplierAdapter({ products: [{ externalId: "1", name: "Produto", costCents: 1000, stock: 3 }] });
    expect((await adapter.getProduct("1"))?.stock).toBe(3);
    expect((await adapter.syncInventory()).changed).toBe(0);
  });
});
