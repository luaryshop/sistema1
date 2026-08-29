import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { ENV } from "./_core/env";

/**
 * Applies committed Drizzle migrations before production traffic is accepted.
 * Railway supplies DATABASE_URL at runtime; no database secret is stored here.
 */
export async function runDatabaseMigrations(): Promise<void> {
  if (!ENV.databaseUrl) {
    throw new Error("DATABASE_URL is required before starting the production server");
  }

  const database = drizzle(ENV.databaseUrl);
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await migrate(database, { migrationsFolder });
  console.log(`[Database] Migrations applied from ${migrationsFolder}`);
}
