import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { productMedia } from "../../drizzle/schema";

export type ResolvedMedia = { kind: "image" | "video"; url: string; altText?: string; variantId?: number | null };

export async function resolveProductMedia(userId: number, productId: number, variantId?: number): Promise<ResolvedMedia[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(productMedia).where(and(
    eq(productMedia.userId, userId),
    eq(productMedia.productId, productId),
    eq(productMedia.status, "ready"),
    ...(variantId ? [eq(productMedia.variantId, variantId)] : []),
  )).orderBy(productMedia.sortOrder);
  return rows
    .filter((row) => row.url.trim().length > 0 && (row.kind === "image" || row.kind === "video"))
    .map((row) => ({ kind: row.kind as "image" | "video", url: row.url, altText: row.altText ?? undefined, variantId: row.variantId }));
}

export function validatePublicationMedia(media: ResolvedMedia[]): { ok: boolean; issues: string[]; images: string[]; videos: string[] } {
  const images = media.filter((item) => item.kind === "image").map((item) => item.url);
  const videos = media.filter((item) => item.kind === "video").map((item) => item.url);
  const issues: string[] = [];
  if (images.length === 0) issues.push("Cadastre pelo menos uma imagem pronta no catálogo");
  if (images.length > 20) issues.push("O catálogo excede o limite interno de 20 imagens por oferta");
  return { ok: issues.length === 0, issues, images, videos };
}
