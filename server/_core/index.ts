import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { WebhookService } from "../services/webhookService";
import { PublicStoreService } from "../services/publicStoreService";
import { runDatabaseMigrations } from "../dbMigrations";

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    await runDatabaseMigrations();
  }

  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.get("/sitemap.xml", async (_req, res) => {
    res.type("application/xml").send(await PublicStoreService.sitemap());
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(`User-agent: *\nAllow: /produtos/\nSitemap: ${process.env.PUBLIC_STORE_URL || "http://localhost:3000"}/sitemap.xml\n`);
  });
  app.get("/api/public/products/:slug", async (req, res) => {
    const record = await PublicStoreService.getBySlug(req.params.slug);
    if (!record) return res.status(404).json({ error: "Produto não encontrado" });
    return res.json({ ...record, jsonLd: JSON.parse(PublicStoreService.jsonLd(record)) });
  });
  app.get("/produtos/:slug", async (req, res, next) => {
    if (process.env.NODE_ENV === "development") return next();
    const record = await PublicStoreService.getBySlug(req.params.slug);
    if (!record) return next();
    return res.type("html").send(PublicStoreService.renderHtml(record));
  });
  app.post("/api/webhooks/:marketplace/:connectionId", async (req, res) => {
    const marketplace = req.params.marketplace as "mercadolivre" | "shopee";
    const connectionId = Number(req.params.connectionId);
    if (!["mercadolivre", "shopee"].includes(marketplace) || !Number.isInteger(connectionId) || connectionId <= 0) {
      return res.status(400).json({ error: "Webhook inválido" });
    }
    try {
      const result = await WebhookService.ingest(connectionId, marketplace, req.body, req.header("x-marketplace-signature") ?? req.header("x-signature"));
      return res.status(202).json(result);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : "Falha ao receber webhook" });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
