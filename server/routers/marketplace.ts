import { router, protectedProcedure } from "../_core/trpc";
import { and, eq } from "drizzle-orm";
import { listingImportStaging, marketplaceListings, productVariants, products } from "../../drizzle/schema";
import { getDb } from "../db";
import { z } from "zod";
import { MarketplaceService } from "../services/marketplaceService";
import { AdapterFactory } from "../adapters/AdapterFactory";
import { TRPCError } from "@trpc/server";
import { ListingImportService } from "../services/listingImportService";
import { MatchingService } from "../services/matchingService";
import { canLinkMatch } from "../services/matchingPolicy";
import { getMarketplaceOAuthConfig } from "../services/marketplaceOAuthConfig";

// Guarda o "state" gerado em getAuthorizationUrl para validar no callback
// (proteção CSRF do fluxo OAuth). Em memória: suficiente para uma instância
// única do servidor (é o cenário normal de deploy deste ERP).
const pendingOAuthStates = new Map<string, { userId: number; createdAt: number }>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos para completar o login

function cleanupExpiredStates() {
  const now = Date.now();
  pendingOAuthStates.forEach((entry, state) => {
    if (now - entry.createdAt > OAUTH_STATE_TTL_MS) {
      pendingOAuthStates.delete(state);
    }
  });
}

export const marketplaceRouter = router({
  /**
   * Get all marketplace connections for the current user
   */
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connections = await MarketplaceService.getUserConnections(ctx.user.id);

      // Don't return encrypted tokens to frontend
      return connections.map((conn) => ({
        id: conn.id,
        marketplaceType: conn.marketplaceType,
        isConnected: conn.isConnected === 1,
        sellerName: conn.sellerName,
        lastSyncAt: conn.lastSyncAt,
        lastErrorAt: conn.lastErrorAt,
        lastErrorMessage: conn.lastErrorMessage,
        syncStatus: conn.syncStatus,
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch connections",
      });
    }
  }),

  /**
   * Get OAuth authorization URL for a marketplace
   */
  getAuthorizationUrl: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
      })
    )
    .mutation(({ input, ctx }) => {
      try {
        if (!AdapterFactory.isSupported(input.marketplaceType)) {
          throw new Error(`Unsupported marketplace: ${input.marketplaceType}`);
        }

        // Generate a random state for CSRF protection.
        // O tipo de marketplace vai embutido no próprio state (prefixo "tipo::"),
        // porque o marketplace só devolve os parâmetros "code" e "state" no
        // redirect — não devolve nenhum parâmetro extra que a gente mande.
        const state = `${input.marketplaceType}::${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;

        cleanupExpiredStates();
        pendingOAuthStates.set(state, { userId: ctx.user.id, createdAt: Date.now() });

        const credentials = getMarketplaceOAuthConfig(input.marketplaceType);

        const adapter = AdapterFactory.createAdapter(input.marketplaceType, credentials);
        const authUrl = adapter.getAuthorizationUrl(state);

        return { authUrl, state };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate authorization URL",
        });
      }
    }),

  /**
   * Handle OAuth callback and save connection
   */
  handleOAuthCallback: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
        code: z.string(),
        state: z.string(),
        shopId: z.string().optional(),
        mainAccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!AdapterFactory.isSupported(input.marketplaceType)) {
          throw new Error(`Unsupported marketplace: ${input.marketplaceType}`);
        }

        // Valida o "state" (proteção CSRF) antes de prosseguir
        const pending = pendingOAuthStates.get(input.state);
        if (!pending || pending.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "State inválido ou expirado. Tente conectar novamente.",
          });
        }
        pendingOAuthStates.delete(input.state); // uso único

        const credentials = getMarketplaceOAuthConfig(input.marketplaceType);

        const adapter = AdapterFactory.createAdapter(input.marketplaceType, credentials);

        // Exchange code for tokens
        const accountId = input.marketplaceType === "shopee" ? input.shopId : undefined;
        if (input.marketplaceType === "shopee" && !accountId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: input.mainAccountId ? "A homologação inicial aceita uma loja Shopee individual; use shop_id em vez de main_account_id" : "A Shopee não retornou shop_id" });
        }

        const tokens = await adapter.exchangeCodeForTokens(input.code, accountId);

        // Get seller info
        const sellerInfo = await adapter.validateAndGetSellerInfo(tokens.accessToken, accountId);

        // Save connection
        await MarketplaceService.upsertConnection(ctx.user.id, input.marketplaceType, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          sellerId: sellerInfo.sellerId,
          sellerName: sellerInfo.sellerName,
          isConnected: 1,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
        });

        return {
          success: true,
          message: `Connected to ${input.marketplaceType}`,
          sellerName: sellerInfo.sellerName,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to connect marketplace",
        });
      }
    }),

  /**
   * Preview existing listings before linking them to the master catalog.
   */
  stageListings: protectedProcedure
    .input(z.object({ marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]), status: z.string().max(30).default("all"), limit: z.number().int().min(1).max(200).default(100) }))
    .mutation(async ({ ctx, input }) => {
      try { return await ListingImportService.stageListings(ctx.user.id, input.marketplaceType, input.status, input.limit); }
      catch (error) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Falha ao gravar staging" }); }
    }),

  analyzeStagedMatch: protectedProcedure
    .input(z.object({ stagingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try { return await MatchingService.analyzeStaging(ctx.user.id, input.stagingId); }
      catch (error) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Falha no matching" }); }
    }),

  listStagedListings: protectedProcedure
    .input(z.object({ status: z.enum(["all", "pending", "reviewed", "linked", "ignored"]).default("pending") }))
    .query(({ ctx, input }) => ListingImportService.listStaged(ctx.user.id, input.status)),

  reviewStagedListing: protectedProcedure
    .input(z.object({ stagingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const result = await db.update(listingImportStaging).set({ status: "reviewed", reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id)));
      return { success: true, result };
    }),

  ignoreStagedListing: protectedProcedure
    .input(z.object({ stagingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const result = await db.update(listingImportStaging).set({ status: "ignored", reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id)));
      return { success: true, result };
    }),

  linkStagedListing: protectedProcedure
    .input(z.object({ stagingId: z.number().int().positive(), productId: z.number().int().positive(), variantId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const staged = await db.select().from(listingImportStaging).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id))).limit(1);
      if (!staged.length) throw new TRPCError({ code: "NOT_FOUND", message: "Anúncio em staging não encontrado" });
      const matchingPolicy = canLinkMatch({ matchClass: staged[0].matchClass, stagingStatus: staged[0].status });
      if (!matchingPolicy.allowed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: matchingPolicy.reason });
      const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
      if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto mestre não encontrado" });
      if (input.variantId) {
        const variant = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(productVariants.userId, ctx.user.id))).limit(1);
        if (!variant.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Variante inválida para este Produto Mestre" });
      }
      const connection = await db.select({ id: listingImportStaging.marketplaceConnectionId }).from(listingImportStaging).where(eq(listingImportStaging.id, input.stagingId)).limit(1);
      const listing = JSON.parse(staged[0].payload) as { listingId: string; title?: string; description?: string; price?: number; stock?: number; status?: string; listingUrl?: string };
      const existing = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).where(and(eq(marketplaceListings.marketplaceConnectionId, connection[0].id), eq(marketplaceListings.marketplaceListingId, listing.listingId))).limit(1);
      const values = { marketplaceConnectionId: connection[0].id, productId: input.productId, variantId: input.variantId, marketplaceListingId: listing.listingId, title: listing.title, description: listing.description, price: listing.price, stock: listing.stock, status: listing.status || "paused", listingUrl: listing.listingUrl, lastSyncedAt: new Date() };
      if (existing.length) await db.update(marketplaceListings).set(values).where(eq(marketplaceListings.id, existing[0].id));
      else await db.insert(marketplaceListings).values(values);
      await db.update(listingImportStaging).set({ suggestedProductId: input.productId, status: "linked", reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(listingImportStaging.id, input.stagingId), eq(listingImportStaging.userId, ctx.user.id)));
      return { success: true, action: existing.length ? "updated" as const : "linked" as const };
    }),

  previewListings: protectedProcedure
    .input(z.object({
      marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
      status: z.string().max(30).default("all"),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      try {
        return await ListingImportService.previewListings(ctx.user.id, input.marketplaceType, input.status, input.limit);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Falha ao consultar anúncios",
        });
      }
    }),

  /**
   * Confirm and link an imported external listing to a master product.
   * This never creates a new marketplace listing.
   */
  linkListing: protectedProcedure
    .input(z.object({
      marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
      listingId: z.string().min(1).max(255),
      productId: z.number().int().positive(),
      title: z.string().max(500).optional(),
      description: z.string().optional(),
      price: z.number().int().min(0).optional(),
      stock: z.number().int().min(0).optional(),
      status: z.enum(["active", "paused", "inactive", "sold_out"]).default("paused"),
      listingUrl: z.string().url().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const connection = await MarketplaceService.getConnection(ctx.user.id, input.marketplaceType);
      if (!connection || connection.isConnected !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Conexão do marketplace não encontrada" });
      const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id))).limit(1);
      if (!product.length) throw new TRPCError({ code: "NOT_FOUND", message: "Produto mestre não encontrado" });

      const existing = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).where(and(
        eq(marketplaceListings.marketplaceConnectionId, connection.id),
        eq(marketplaceListings.marketplaceListingId, input.listingId),
      )).limit(1);
      const values = {
        marketplaceConnectionId: connection.id,
        productId: input.productId,
        marketplaceListingId: input.listingId,
        title: input.title,
        description: input.description,
        price: input.price,
        stock: input.stock,
        status: input.status,
        listingUrl: input.listingUrl,
        lastSyncedAt: new Date(),
      };
      if (existing.length) {
        await db.update(marketplaceListings).set(values).where(eq(marketplaceListings.id, existing[0].id));
        return { id: existing[0].id, action: "updated" as const };
      }
      const result = await db.insert(marketplaceListings).values(values);
      return { id: Number((result as any)[0]?.insertId ?? 0), action: "linked" as const };
    }),

  /**
   * Disconnect a marketplace
   */
  disconnect: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok", "magalu"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await MarketplaceService.disconnect(ctx.user.id, input.marketplaceType);

        return {
          success: true,
          message: `Disconnected from ${input.marketplaceType}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to disconnect marketplace",
        });
      }
    }),

  /**
   * Get supported marketplaces
   */
  getSupportedMarketplaces: protectedProcedure.query(() => {
    return AdapterFactory.getSupportedMarketplaces().map((type) => ({
      type,
      name: {
        mercadolivre: "Mercado Livre",
        shopee: "Shopee",
        amazon: "Amazon",
        tiktok: "TikTok Shop",
        magalu: "Magalu",
      }[type],
    }));
  }),
});
