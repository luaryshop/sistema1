import { describe, expect, it } from "vitest";
import { toSafeSupplierIntegration } from "./supplierConnectionService";

describe("supplier connection response security", () => {
  it("never exposes encrypted credentials or secret-shaped fields", () => {
    const source = {
      id: 1,
      supplierId: 7,
      type: "csv",
      status: "pending",
      lastSyncAt: null,
      lastError: null,
      createdAt: new Date("2026-08-27T00:00:00.000Z"),
      updatedAt: new Date("2026-08-27T00:00:00.000Z"),
      encryptedCredentials: "must-not-leak",
      credentials: { password: "must-not-leak" },
      apiKey: "must-not-leak",
      accessToken: "must-not-leak",
      refreshToken: "must-not-leak",
    } as any;

    const result = toSafeSupplierIntegration(source);
    const serialized = JSON.stringify(result);

    expect(result).not.toHaveProperty("encryptedCredentials");
    expect(result).not.toHaveProperty("credentials");
    expect(result).not.toHaveProperty("secret");
    expect(result).not.toHaveProperty("token");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("apiKey");
    expect(result).not.toHaveProperty("accessToken");
    expect(result).not.toHaveProperty("refreshToken");
    expect(serialized).not.toContain("must-not-leak");
  });

  it("preserves only the operational integration fields", () => {
    const result = toSafeSupplierIntegration({
      id: 2,
      supplierId: 8,
      type: "manual",
      status: "connected",
      lastSyncAt: null,
      lastError: null,
      createdAt: new Date("2026-08-27T00:00:00.000Z"),
      updatedAt: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(Object.keys(result).sort()).toEqual([
      "createdAt",
      "id",
      "lastError",
      "lastSyncAt",
      "status",
      "supplierId",
      "type",
      "updatedAt",
    ]);
  });
});
