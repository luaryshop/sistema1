import { auditLogs } from "../../drizzle/schema";
import { getDb } from "../db";

export async function writeAudit(input: { userId: number; action: string; entity: string; entityId?: number; before?: unknown; after?: unknown; origin?: string; ip?: string; result?: string }) {
  if (process.env.NODE_ENV === "test") return;
  const db = await getDb(); if (!db) return;
  await db.insert(auditLogs).values({ userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, before: input.before === undefined ? null : JSON.stringify(input.before), after: input.after === undefined ? null : JSON.stringify(input.after), origin: input.origin || "system", ip: input.ip, result: input.result || "success" });
}
