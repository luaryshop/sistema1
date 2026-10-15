import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.DATABASE_URL = "mysql://test-only.invalid/luary";
  return {
    drizzle: vi.fn(() => ({ __testDatabase: true })),
    migrate: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: mocks.drizzle }));
vi.mock("drizzle-orm/mysql2/migrator", () => ({ migrate: mocks.migrate }));

const { runDatabaseMigrations } = await import("./dbMigrations");

describe("runDatabaseMigrations", () => {
  it("applies committed migrations using the runtime database URL", async () => {
    await expect(runDatabaseMigrations()).resolves.toBeUndefined();
    expect(mocks.drizzle).toHaveBeenCalledWith("mysql://test-only.invalid/luary");
    expect(mocks.migrate).toHaveBeenCalledWith(
      { __testDatabase: true },
      expect.objectContaining({ migrationsFolder: expect.stringMatching(/[\\/]drizzle$/) })
    );
  });
});
