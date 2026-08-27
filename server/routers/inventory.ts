import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { InventoryService } from "../services/inventoryService";

export const inventoryRouter = router({
  available: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional() })).query(({ ctx, input }) => InventoryService.available(ctx.user.id, input.productId, input.variantId)),
  reserve: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), orderId: z.number().int().positive().optional(), quantity: z.number().int().positive(), expiresAt: z.coerce.date().optional() })).mutation(({ ctx, input }) => InventoryService.reserve({ userId: ctx.user.id, ...input })),
  release: protectedProcedure.input(z.object({ reservationId: z.number().int().positive(), status: z.enum(["released", "expired"]) })).mutation(({ ctx, input }) => InventoryService.changeStatus(ctx.user.id, input.reservationId, input.status)),
  confirm: protectedProcedure.input(z.object({ reservationId: z.number().int().positive() })).mutation(({ ctx, input }) => InventoryService.changeStatus(ctx.user.id, input.reservationId, "confirmed")),
  releaseExpired: protectedProcedure.mutation(({ ctx }) => InventoryService.releaseExpired(ctx.user.id)),
});
