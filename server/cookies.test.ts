import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

describe("getSessionCookieOptions", () => {
  it("uses a browser-compatible cookie for local HTTP", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: {},
    } as Request);

    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
  });

  it("keeps cross-site secure cookies for public HTTPS behind a proxy", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    } as Request);

    expect(options.sameSite).toBe("none");
    expect(options.secure).toBe(true);
  });
});
