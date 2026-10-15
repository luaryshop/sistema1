import { describe, expect, it } from "vitest";
import { canLinkMatch } from "./services/matchingPolicy";

describe("Matching 2.0 — política comercial", () => {
  it("permite apenas match exato sem revisão adicional", () => {
    expect(canLinkMatch({ matchClass: "exact", stagingStatus: "pending" })).toEqual({ allowed: true });
  });

  it("exige revisão humana para match provável", () => {
    expect(canLinkMatch({ matchClass: "probable", stagingStatus: "pending" }).allowed).toBe(false);
    expect(canLinkMatch({ matchClass: "probable", stagingStatus: "reviewed" }).allowed).toBe(true);
  });

  it("bloqueia conflito e ausência de correspondência", () => {
    expect(canLinkMatch({ matchClass: "conflict", stagingStatus: "reviewed" }).allowed).toBe(false);
    expect(canLinkMatch({ matchClass: "unmatched", stagingStatus: "reviewed" }).allowed).toBe(false);
  });

  it("não aceita classes desconhecidas", () => {
    expect(canLinkMatch({ matchClass: "unknown", stagingStatus: "reviewed" }).allowed).toBe(false);
  });
});
