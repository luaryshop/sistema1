import type { SupplierAdapter, SupplierCredentials, SupplierProductRecord } from "./types";
import { parseMoneyToCents } from "./money";

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { values.push(current.trim()); current = ""; }
    else current += char;
  }
  if (quoted) throw new Error("CSV inválido: aspas não fechadas");
  values.push(current.trim());
  return values;
}

function detectDelimiter(header: string) {
  const semicolons = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseStock(value: string | number | undefined | null) {
  if (value === undefined || value === null || String(value).trim() === "") return 0;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) throw new Error(`Estoque inválido: ${normalized}`);
  const stock = Number(normalized);
  if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Estoque inválido: ${normalized}`);
  return stock;
}

export class CsvSupplierAdapter implements SupplierAdapter {
  readonly type = "csv" as const;
  readonly capabilities = ["CATALOG_READ", "INVENTORY_READ", "PRICE_READ"] as const;
  private readonly credentials: SupplierCredentials;
  constructor(credentials: SupplierCredentials = {}) { this.credentials = credentials; }
  async authenticate() { return; }
  async testConnection() { return { ok: typeof this.credentials.csv === "string", message: typeof this.credentials.csv === "string" ? "CSV disponível para leitura" : "Informe o conteúdo CSV" }; }
  async listProducts() { return { products: this.parse(String(this.credentials.csv ?? "")) }; }
  async getProduct(externalId: string) { return (await this.listProducts()).products.find((product) => product.externalId === externalId) ?? null; }
  async syncProducts() { const products = this.parse(String(this.credentials.csv ?? "")); return { productsRead: products.length, productsAdded: 0, productsUpdated: 0, errors: [] as string[] }; }
  async syncInventory() { return { changed: 0, errors: [] as string[] }; }
  async syncPrices() { return { changed: 0, errors: [] as string[] }; }
  private parse(csv: string): SupplierProductRecord[] {
    const cleanCsv = csv.replace(/^\uFEFF/, "");
    const lines = cleanCsv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCsvLine(lines[0], delimiter).map((header) => header.toLowerCase().replace(/^\uFEFF/, ""));
    return lines.slice(1).map((line, rowIndex) => {
      const values = splitCsvLine(line, delimiter);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const externalId = row.externalid || row.id || row.codigo;
      const name = row.name || row.nome || row.title || row.titulo;
      if (!externalId || !name) throw new Error(`CSV inválido na linha ${rowIndex + 2}: externalId e name são obrigatórios`);
      return { externalId, sku: row.sku || undefined, internalCode: row.internalcode || row.codigo_interno || undefined, ean: row.ean || undefined, gtin: row.gtin || undefined, mpn: row.mpn || undefined, name, description: row.description || row.descricao || undefined, brand: row.brand || row.marca || undefined, costCents: parseMoneyToCents(row.cost || row.custo), shippingCostCents: parseMoneyToCents(row.shipping || row.frete), stock: parseStock(row.stock || row.estoque), category: row.category || row.categoria || undefined };
    });
  }
}
