export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_BASE64_LENGTH = Math.ceil(MAX_PRODUCT_IMAGE_BYTES / 3) * 4;

export type ProductImageExtension = "jpg" | "png" | "webp";

/** Validates base64 strictly, enforces the byte limit, and detects file format by signature. */
export function validateProductImageBase64(fileBase64: string): {
  byteLength: number;
  extension: ProductImageExtension;
} {
  if (!fileBase64 || fileBase64.length > MAX_PRODUCT_IMAGE_BASE64_LENGTH) {
    throw new Error("A imagem está vazia ou excede o limite de 5 MB.");
  }
  const paddingLength = fileBase64.endsWith("==") ? 2 : fileBase64.endsWith("=") ? 1 : 0;
  const encodedContent = paddingLength ? fileBase64.slice(0, -paddingLength) : fileBase64;
  const hasValidPadding = paddingLength === 0
    ? encodedContent.length % 4 === 0
    : paddingLength === 1
      ? encodedContent.length % 4 === 3
      : encodedContent.length % 4 === 2;
  if (!hasValidPadding || !/^[A-Za-z0-9+/]*$/.test(encodedContent)) {
    throw new Error("O conteúdo enviado não é uma imagem Base64 válida.");
  }

  const bytes = Buffer.from(fileBase64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("A imagem está vazia ou excede o limite de 5 MB.");
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { byteLength: bytes.length, extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { byteLength: bytes.length, extension: "png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { byteLength: bytes.length, extension: "webp" };
  }
  throw new Error("Formato não reconhecido. Envie uma imagem JPG, PNG ou WebP.");
}
