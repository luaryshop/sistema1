import { z } from "zod";

const optionalInt = z.number().int().min(0).optional();

/**
 * Linha aceita pela importação em massa do cadastro mestre.
 * Todos os campos numéricos são OPCIONAIS e sem valor padrão: o que não vier
 * na planilha não é alterado em produtos já existentes (antes, estoque e
 * custo omitidos eram gravados como 0 por cima dos valores reais).
 */
export const importRowSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(2).max(255),
  description: z.string().max(10000).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  stock: optionalInt,
  minStock: optionalInt,
  costBase: optionalInt,
  basePrice: optionalInt,
  weightBase: optionalInt,
  height: optionalInt,
  width: optionalInt,
  length: optionalInt,
  ncm: z.string().max(20).optional(),
  cest: z.string().max(20).optional(),
  origin: z.string().max(30).optional(),
  mpn: z.string().max(100).optional(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

/** Remove chaves indefinidas para que o UPDATE só toque no que veio na planilha. */
export function definedOnly<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)) as Partial<T>;
}
