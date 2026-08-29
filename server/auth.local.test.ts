import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  process.env.ADMIN_PASSWORD = "local-test-password-keep-private";
  process.env.JWT_SECRET = "local-test-jwt-secret-with-more-than-32-chars";
  process.env.OWNER_OPEN_ID = "railway-local-owner";
  process.env.OWNER_NAME = "Luary Admin";
  process.env.OAUTH_SERVER_URL = "";
  return { upsertUser: vi.fn(), getUserByOpenId: vi.fn() };
});

vi.mock("./db", () => ({
  upsertUser: mocks.upsertUser,
  getUserByOpenId: mocks.getUserByOpenId,
}));

const { appRouter } = await import("./routers");
const { sdk } = await import("./_core/sdk");

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function response(cookies: CookieCall[]) {
  return { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) } as TrpcContext["res"];
}

function user() {
  const now = new Date();
  return { id: 1, openId: "railway-local-owner", name: "Luary Admin", email: null, loginMethod: "password", role: "admin" as const, createdAt: now, updatedAt: now, lastSignedIn: now };
}

describe("local Railway authentication", () => {
  it("logs in with ADMIN_PASSWORD and creates a local session", async () => {
    mocks.upsertUser.mockResolvedValue(undefined);
    const cookies: CookieCall[] = [];
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: response(cookies) });

    await expect(caller.auth.login({ password: "local-test-password-keep-private" })).resolves.toEqual({ success: true });
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "railway-local-owner", loginMethod: "password", role: "admin" }));
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).toBeTruthy();
  });

  it("authenticates the local session from the database without OAuth", async () => {
    mocks.getUserByOpenId.mockResolvedValue(user());
    mocks.upsertUser.mockResolvedValue(undefined);
    const token = await sdk.createSessionToken("railway-local-owner", { name: "Luary Admin" });
    const authenticated = await sdk.authenticateRequest({ protocol: "https", headers: { cookie: `${COOKIE_NAME}=${token}` } } as TrpcContext["req"]);

    expect(authenticated.openId).toBe("railway-local-owner");
    expect(authenticated.loginMethod).toBe("password");
  });

  it("fails locally without attempting OAuth when the session user is missing", async () => {
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    const token = await sdk.createSessionToken("missing-local-owner", { name: "Luary Admin" });

    await expect(sdk.authenticateRequest({ protocol: "https", headers: { cookie: `${COOKIE_NAME}=${token}` } } as TrpcContext["req"]))
      .rejects.toMatchObject({ message: "Usuário da sessão não encontrado no banco" });
  });
});
