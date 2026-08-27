import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { inventoryReservations, syncJobs, syncLogs, webhookEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const operationsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const [jobs, recentJobs, logs, webhooks, reservations] = await Promise.all([
      db.select({ status: syncJobs.status, count: sql<number>`count(*)` }).from(syncJobs).where(eq(syncJobs.userId, ctx.user.id)).groupBy(syncJobs.status),
      db.select().from(syncJobs).where(eq(syncJobs.userId, ctx.user.id)).orderBy(desc(syncJobs.createdAt)).limit(50),
      db.select().from(syncLogs).where(eq(syncLogs.userId, ctx.user.id)).orderBy(desc(syncLogs.createdAt)).limit(30),
      db.select().from(webhookEvents).where(eq(webhookEvents.userId, ctx.user.id)).orderBy(desc(webhookEvents.createdAt)).limit(30),
      db.select({ status: inventoryReservations.status, quantity: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)` }).from(inventoryReservations).where(eq(inventoryReservations.userId, ctx.user.id)).groupBy(inventoryReservations.status),
    ]);
    return { jobs, recentJobs, logs, webhooks, reservations };
  }),
  retryJob: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const result = await db.update(syncJobs).set({ status: "pending", nextRunAt: new Date(), errorMessage: null, updatedAt: new Date() }).where(and(eq(syncJobs.id, input.jobId), eq(syncJobs.userId, ctx.user.id)));
    return { success: Number((result as any)[0]?.affectedRows ?? 0) > 0 };
  }),
});
