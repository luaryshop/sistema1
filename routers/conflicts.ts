import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { syncConflicts } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { writeAudit } from "../services/auditService";

export const conflictsRouter = router({
  list: protectedProcedure.input(z.object({ status: z.enum(["open", "resolved", "ignored"]).default("open") })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.select().from(syncConflicts).where(and(eq(syncConflicts.userId, ctx.user.id), eq(syncConflicts.status, input.status))).orderBy(desc(syncConflicts.createdAt)).limit(200);
  }),
  resolve: protectedProcedure.input(z.object({ id: z.number().int().positive(), resolution: z.enum(["use_luary", "use_marketplace", "keep_both", "manual", "ignore"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const current = await db.select().from(syncConflicts).where(and(eq(syncConflicts.id, input.id), eq(syncConflicts.userId, ctx.user.id), eq(syncConflicts.status, "open"))).limit(1);
    if (!current.length) throw new TRPCError({ code: "NOT_FOUND", message: "Conflito não encontrado" });
    await db.update(syncConflicts).set({ status: input.resolution === "ignore" ? "ignored" : "resolved", resolution: input.resolution, resolvedBy: ctx.user.id, resolvedAt: new Date(), updatedAt: new Date() }).where(and(eq(syncConflicts.id, input.id), eq(syncConflicts.userId, ctx.user.id)));
    await writeAudit({ userId: ctx.user.id, action: "resolve_conflict", entity: "sync_conflict", entityId: input.id, before: current[0], after: { status: input.resolution === "ignore" ? "ignored" : "resolved", resolution: input.resolution }, origin: "admin" });
    return { success: true };
  }),
});
