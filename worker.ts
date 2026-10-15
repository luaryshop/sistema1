import "dotenv/config";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { SyncJobService } from "./services/syncJobService";

const intervalMs = Math.max(5_000, Number(process.env.WORKER_INTERVAL_MS || 15_000));
const batchSize = Math.max(1, Math.min(50, Number(process.env.WORKER_BATCH_SIZE || 10)));
// "loop" (padrão) = processo contínuo, precisa de host sempre ligado (Railway, VM, etc.)
// "once"          = processa um lote e encerra — compatível com job agendado
//                    (Cloud Run Jobs + Cloud Scheduler, GitHub Actions cron, etc.),
//                    que só cobra pelo tempo de execução, não por ficar ocioso.
const mode = (process.env.WORKER_MODE || "loop").toLowerCase();
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

async function runLoop() {
  console.log(`[luary-worker] modo=loop iniciado; intervalo=${intervalMs}ms lote=${batchSize}`);
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

async function runOnce() {
  console.log(`[luary-worker] modo=once; lote=${batchSize}`);
  try {
    await tick();
    console.log("[luary-worker] lote processado com sucesso, encerrando");
    process.exit(0);
  } catch (error) {
    console.error("[luary-worker] falha no lote", error);
    process.exit(1);
  }
}

const stop = () => { stopping = true; };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

if (mode === "once") {
  void runOnce();
} else {
  void runLoop();
}
