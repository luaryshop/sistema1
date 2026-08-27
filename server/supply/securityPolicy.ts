import { TRPCError } from "@trpc/server";

export function assertVariantOwnership(input: { variantExists: boolean; ownerMatches: boolean; productMatches: boolean }) {
  if (!input.variantExists || !input.ownerMatches || !input.productMatches) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A variante não pertence ao usuário e ao Produto Mestre selecionado" });
  }
  return true;
}

export function shouldAutoApproveExact(enabled: string | undefined) {
  return String(enabled ?? "false").toLowerCase() === "true";
}
