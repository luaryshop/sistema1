import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_IMAGE_BYTES, validateProductImageBase64 } from "./services/productImageValidation";

const base64 = (bytes: number[]) => Buffer.from(bytes).toString("base64");

describe("validateProductImageBase64", () => {
  it("accepts JPEG, PNG and WebP based on their file signatures", () => {
    expect(validateProductImageBase64(base64([0xff, 0xd8, 0xff, 0x00]))).toMatchObject({ extension: "jpg", byteLength: 4 });
    expect(validateProductImageBase64(base64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toMatchObject({ extension: "png", byteLength: 8 });
    expect(validateProductImageBase64(base64([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]))).toMatchObject({ extension: "webp", byteLength: 12 });
  });

  it("rejects empty, malformed, unsupported, and oversized files", () => {
    expect(() => validateProductImageBase64("")).toThrow("vazia");
    expect(() => validateProductImageBase64("not-base64!?")).toThrow("Base64 válida");
    expect(() => validateProductImageBase64(base64(Buffer.from("not an image")))).toThrow("JPG, PNG ou WebP");
    const oversized = Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1);
    oversized.set([0xff, 0xd8, 0xff]);
    expect(() => validateProductImageBase64(oversized.toString("base64"))).toThrow("5 MB");
  });
});
