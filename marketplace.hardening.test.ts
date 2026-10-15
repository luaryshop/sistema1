import { describe, expect, it } from "vitest";
import { validatePublicationMedia } from "./services/mediaResolver";

describe("marketplace publication hardening", () => {
  it("blocks a publication without a ready image", () => {
    const result = validatePublicationMedia([{ kind: "video", url: "https://cdn.example/video.mp4" }]);
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("Cadastre pelo menos uma imagem pronta no catálogo");
  });

  it("separates images and videos while preserving order", () => {
    const result = validatePublicationMedia([
      { kind: "image", url: "https://cdn.example/cover.jpg" },
      { kind: "video", url: "https://cdn.example/demo.mp4" },
      { kind: "image", url: "https://cdn.example/detail.jpg" },
    ]);
    expect(result.ok).toBe(true);
    expect(result.images).toEqual(["https://cdn.example/cover.jpg", "https://cdn.example/detail.jpg"]);
    expect(result.videos).toEqual(["https://cdn.example/demo.mp4"]);
  });
});
