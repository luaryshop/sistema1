import { describe, expect, it } from "vitest";
import { catalogCsvTemplate, catalogRowsFromCsv, parseCsv, parseIntLoose, parseMoneyToCents } from "../shared/catalogCsv";
import { definedOnly, importRowSchema } from "./services/catalogImportRules";

describe("parseMoneyToCents", () => {
  it("entende formatos brasileiros e internacionais", () => {
    expect(parseMoneyToCents("12,90")).toBe(1290);
    expect(parseMoneyToCents("12.90")).toBe(1290);
    expect(parseMoneyToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("1.234")).toBe(123400);
    expect(parseMoneyToCents("0,5")).toBe(50);
    expect(parseMoneyToCents("7")).toBe(700);
  });
  it("rejeita lixo e negativos", () => {
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("-3,00")).toBeNull();
    expect(parseMoneyToCents("")).toBeNull();
  });
});

describe("parseIntLoose", () => {
  it("aceita inteiros e milhar com ponto", () => {
    expect(parseIntLoose("10")).toBe(10);
    expect(parseIntLoose("10,0")).toBe(10);
    expect(parseIntLoose("1.500")).toBe(1500);
  });
  it("rejeita decimais e texto", () => {
    expect(parseIntLoose("2,5")).toBeNull();
    expect(parseIntLoose("dez")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("lê separador ';' com BOM e quebra de linha dentro de aspas", () => {
    const text = '\uFEFFsku;nome;descricao\r\nA1;Colar;"linha 1\nlinha 2; com ponto e vírgula"\r\nA2;Brinco;"diz ""oi"""\r\n';
    const table = parseCsv(text);
    expect(table).toHaveLength(3);
    expect(table[1][2]).toBe("linha 1\nlinha 2; com ponto e vírgula");
    expect(table[2][2]).toBe('diz "oi"');
  });
  it("detecta vírgula como separador", () => {
    expect(parseCsv("sku,nome\nA1,Colar\n")[1]).toEqual(["A1", "Colar"]);
  });
});

describe("catalogRowsFromCsv", () => {
  it("converte linhas, apelidos de coluna e dinheiro em centavos", () => {
    const csv = "SKU;Nome;Categoria;Custo (R$);Preço de venda (R$);Estoque;Coluna Estranha\nX-1;Chaveiro Touro;Chaveiros;3,50;19,90;12;ignorar\n";
    const result = catalogRowsFromCsv(csv);
    expect(result.issues).toEqual([]);
    expect(result.ignoredColumns).toEqual(["Coluna Estranha"]);
    expect(result.rows[0]).toEqual({ sku: "X-1", name: "Chaveiro Touro", category: "Chaveiros", costBase: 350, basePrice: 1990, stock: 12 });
  });

  it("deixa em branco o que não veio (não vira zero)", () => {
    const result = catalogRowsFromCsv("sku;nome;estoque;custo_rs\nX-1;Chaveiro;;\n");
    expect(result.rows[0]).toEqual({ sku: "X-1", name: "Chaveiro" });
  });

  it("aponta linha e motivo de cada problema sem derrubar as linhas boas", () => {
    const csv = "sku;nome;estoque\nOK-1;Produto bom;3\n;Sem sku;1\nOK-1;Repetido;2\nBAD;Estoque ruim;abc\nOK-2;Outro bom;5\n";
    const result = catalogRowsFromCsv(csv);
    expect(result.rows.map((r) => r.sku)).toEqual(["OK-1", "OK-2"]);
    expect(result.issues.map((i) => i.line)).toEqual([3, 4, 5]);
    expect(result.issues[1].message).toContain("repetido");
  });

  it("exige colunas sku e nome", () => {
    const result = catalogRowsFromCsv("codigo_interno;titulo_x\nA;B\n");
    expect(result.rows).toEqual([]);
    expect(result.issues[0].message).toContain('"sku" e "nome"');
  });

  it("o arquivo-modelo é só o cabeçalho e é lido sem erro", () => {
    const result = catalogRowsFromCsv(catalogCsvTemplate());
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.ignoredColumns).toEqual([]);
  });
});

describe("regras de importação no servidor", () => {
  it("aceita linha só com sku e nome, sem inventar zeros", () => {
    const parsed = importRowSchema.parse({ sku: "A", name: "Produto" });
    expect(parsed).toEqual({ sku: "A", name: "Produto" });
    expect(definedOnly(parsed)).toEqual({ sku: "A", name: "Produto" });
  });
  it("definedOnly não deixa campo omitido sobrescrever dado existente", () => {
    const update = definedOnly({ sku: "A", name: "Novo nome", stock: undefined, costBase: 500 });
    expect(update).toEqual({ sku: "A", name: "Novo nome", costBase: 500 });
    expect("stock" in update).toBe(false);
  });
  it("rejeita valores negativos e fracionados", () => {
    expect(importRowSchema.safeParse({ sku: "A", name: "Produto", stock: -1 }).success).toBe(false);
    expect(importRowSchema.safeParse({ sku: "A", name: "Produto", costBase: 1.5 }).success).toBe(false);
  });
});
