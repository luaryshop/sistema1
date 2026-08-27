import "dotenv/config";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { SyncJobService } from "./services/syncJobService";

const intervalMs = Math.max(5_000, Number(process.env.WORKER_INTERVAL_MS || 15_000));
const batchSize = Math.max(1, Math.min(50, Number(process.env.WORKER_BATCH_SIZE || 10)));
let stopping = false;

async function tick() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const activeUsers = await db.select({ id: users.id }).from(users);
  for (const user of activeUsers) {
    if (stopping) break;
    await SyncJobService.processPending(user.id, batchSize);
  }
}

async function run() {
  console.log(`[luary-worker] iniciado; intervalo=${intervalMs}ms lote=${batchSize}`);
  while (!stopping) {
    try {
      await tick();
    } catch (error) {
      console.error("[luary-worker] falha no ciclo", error);
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.log("[luary-worker] encerrado");
}

const stop = () => { stopping = true; };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
void run();
