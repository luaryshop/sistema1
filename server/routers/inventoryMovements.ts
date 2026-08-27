import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { InventoryMovementService } from "../services/inventoryMovementService";

export const inventoryMovementsRouter = router({
  applyMovement: protectedProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), orderId: z.number().int().positive().optional(), type: z.enum(["in", "out", "sale", "cancel", "return", "adjustment", "transfer"]), quantity: z.number().int().positive(), reason: z.string().max(255).optional(), reference: z.string().max(255).optional(), allowNegative: z.boolean().default(false) })).mutation(({ ctx, input }) => InventoryMovementService.apply({ userId: ctx.user.id, ...input })),
});
