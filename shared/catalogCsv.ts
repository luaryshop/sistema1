/**
 * Leitor de CSV para importação do cadastro mestre — sem dependências.
 * Entende o CSV que o Excel em português gera (separador ";", vírgula
 * decimal, BOM no início, células com quebra de linha entre aspas) e também
 * o CSV "internacional" (separador ",", ponto decimal).
 */

export type CatalogImportRow = {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  stock?: number;
  minStock?: number;
  costBase?: number; // centavos
  basePrice?: number; // centavos
  weightBase?: number; // gramas
  height?: number; // mm
  width?: number; // mm
  length?: number; // mm
  ncm?: string;
  cest?: string;
  origin?: string;
  mpn?: string;
};

export type CatalogCsvIssue = { line: number; sku?: string; message: string };

export type CatalogCsvResult = {
  rows: CatalogImportRow[];
  issues: CatalogCsvIssue[];
  ignoredColumns: string[];
  totalDataLines: number;
};

/** Colunas do modelo, na ordem em que aparecem no arquivo-modelo. */
export const CATALOG_CSV_HEADERS = [
  "sku", "nome", "descricao", "categoria", "marca",
  "custo_rs", "preco_venda_rs", "estoque", "estoque_minimo",
  "peso_g", "altura_mm", "largura_mm", "comprimento_mm",
  "ncm", "cest", "origem", "mpn",
] as const;

type FieldKey = keyof CatalogImportRow;

const HEADER_ALIASES: Record<string, FieldKey> = {
  sku: "sku", codigo: "sku", codigosku: "sku",
  nome: "name", name: "name", titulo: "name", produto: "name",
  descricao: "description", description: "description",
  categoria: "category", category: "category",
  marca: "brand", brand: "brand",
  custo: "costBase", custors: "costBase", custobase: "costBase", cost: "costBase",
  preco: "basePrice", precors: "basePrice", precovenda: "basePrice", precodevenda: "basePrice", precovendars: "basePrice", price: "basePrice",
  estoque: "stock", stock: "stock", quantidade: "stock",
  estoqueminimo: "minStock", minimo: "minStock", minstock: "minStock",
  peso: "weightBase", pesog: "weightBase", weight: "weightBase",
  altura: "height", alturamm: "height", height: "height",
  largura: "width", larguramm: "width", width: "width",
  comprimento: "length", comprimentomm: "length", length: "length",
  ncm: "ncm", cest: "cest",
  origem: "origin", origin: "origin",
  mpn: "mpn", codigofabricante: "mpn",
};

const MONEY_FIELDS: FieldKey[] = ["costBase", "basePrice"];
const INT_FIELDS: FieldKey[] = ["stock", "minStock", "weightBase", "height", "width", "length"];

function normalizeHeader(value: string): string {
  return value
    .replace(/\([^)]*\)/g, "") // ignora unidades entre parênteses: "Custo (R$)" → "Custo"
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Lê o texto inteiro respeitando aspas (inclusive quebras de linha dentro de aspas). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");

  // Detecta o separador olhando só a primeira linha, fora de aspas.
  let delimiter = ",";
  {
    let inQuotes = false;
    const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
    for (const ch of text) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
      else if (!inQuotes && ch in counts) counts[ch]++;
    }
    delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [","])[0];
    if (counts[delimiter] === 0) delimiter = ",";
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  // Descarta linhas totalmente vazias (comuns no fim do arquivo).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** "12,90" | "12.90" | "R$ 1.234,56" | "1,234.56" → centavos. Retorna null se inválido. */
export function parseMoneyToCents(raw: string): number | null {
  let s = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (s === "") return null;
  if (!/^-?[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    // O último separador é o decimal; o outro é milhar.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    s = s.replace(/,/g, (m, offset) => (offset === lastComma ? "." : ""));
  } else if (lastDot !== -1) {
    const afterDot = s.length - lastDot - 1;
    const dots = (s.match(/\./g) ?? []).length;
    // "1.234" (3 dígitos depois do único ponto) é milhar; "12.5"/"12.50" é decimal.
    if (dots > 1 || afterDot === 3) s = s.replace(/\./g, "");
  }
  const value = Number(s);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** "10" | "10,0" | "1.500" → inteiro ≥ 0. Retorna null se inválido. */
export function parseIntLoose(raw: string): number | null {
  const s = raw.replace(/\s/g, "");
  if (s === "") return null;
  if (!/^[\d.,]+$/.test(s)) return null;
  const normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s.replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return null;
  return value;
}

export function catalogRowsFromCsv(text: string): CatalogCsvResult {
  const table = parseCsv(text);
  const result: CatalogCsvResult = { rows: [], issues: [], ignoredColumns: [], totalDataLines: 0 };
  if (table.length === 0) {
    result.issues.push({ line: 1, message: "Arquivo vazio." });
    return result;
  }

  const header = table[0];
  const columnField: (FieldKey | null)[] = header.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
  header.forEach((h, i) => { if (!columnField[i] && h.trim() !== "") result.ignoredColumns.push(h.trim()); });

  if (!columnField.includes("sku") || !columnField.includes("name")) {
    result.issues.push({ line: 1, message: 'O cabeçalho precisa ter as colunas "sku" e "nome".' });
    return result;
  }

  const seenSkus = new Map<string, number>();
  for (let r = 1; r < table.length; r++) {
    const line = r + 1;
    result.totalDataLines++;
    const record: Partial<Record<FieldKey, string>> = {};
    columnField.forEach((field, c) => {
      if (field && table[r][c] !== undefined) record[field] = table[r][c].trim();
    });

    const sku = (record.sku ?? "").trim();
    const name = (record.name ?? "").trim();
    if (!sku) { result.issues.push({ line, message: "SKU em branco." }); continue; }
    if (name.length < 2) { result.issues.push({ line, sku, message: "Nome em branco ou muito curto." }); continue; }
    if (sku.length > 100) { result.issues.push({ line, sku, message: "SKU passa de 100 caracteres." }); continue; }
    if (name.length > 255) { result.issues.push({ line, sku, message: "Nome passa de 255 caracteres." }); continue; }
    if ((record.description ?? "").length > 10000) { result.issues.push({ line, sku, message: "Descrição passa de 10.000 caracteres." }); continue; }
    if (seenSkus.has(sku)) { result.issues.push({ line, sku, message: `SKU repetido (já aparece na linha ${seenSkus.get(sku)}).` }); continue; }
    seenSkus.set(sku, line);

    const row: CatalogImportRow = { sku, name };
    let invalid = false;

    for (const [field, value] of Object.entries(record) as [FieldKey, string][]) {
      if (field === "sku" || field === "name" || value === "") continue;
      if (MONEY_FIELDS.includes(field)) {
        const cents = parseMoneyToCents(value);
        if (cents === null) { result.issues.push({ line, sku, message: `Valor inválido em "${field}": ${value}` }); invalid = true; break; }
        (row as Record<string, unknown>)[field] = cents;
      } else if (INT_FIELDS.includes(field)) {
        const n = parseIntLoose(value);
        if (n === null) { result.issues.push({ line, sku, message: `Número inválido em "${field}": ${value}` }); invalid = true; break; }
        (row as Record<string, unknown>)[field] = n;
      } else {
        (row as Record<string, unknown>)[field] = value;
      }
    }
    if (!invalid) result.rows.push(row);
  }
  return result;
}

/** Cabeçalho-modelo (sem linhas de exemplo, pra nada ser importado sem querer). */
export function catalogCsvTemplate(): string {
  return "\uFEFF" + CATALOG_CSV_HEADERS.join(";") + "\n";
}
