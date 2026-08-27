const MAX_MONEY_CENTS = 10_000_000_000;

/** Parses common Brazilian/international money formats into integer cents. */
export function parseMoneyToCents(value: string | number | undefined | null): number {
  if (value === undefined || value === null || String(value).trim() === "") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error("Valor monetário inválido");
    const cents = Math.round(value * 100);
    if (cents > MAX_MONEY_CENTS) throw new Error("Valor monetário excede o limite permitido");
    return cents;
  }
  let raw = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!raw || raw.startsWith("-") || raw.includes("-")) throw new Error("Valor monetário negativo ou inválido");
  raw = raw.replace(/[^0-9.,]/g, "");
  if (!raw || !/[0-9]/.test(raw)) throw new Error("Valor monetário inválido");

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let integerPart = raw;
  let fractionPart = "";
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot);
    integerPart = raw.slice(0, decimalIndex).replace(/[.,]/g, "");
    fractionPart = raw.slice(decimalIndex + 1);
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? "," : ".";
    const parts = raw.split(separator);
    const candidateFraction = parts[parts.length - 1];
    if (parts.length === 2 && candidateFraction.length <= 2) {
      integerPart = parts[0]; fractionPart = candidateFraction;
    } else if (candidateFraction.length === 2 && parts.length > 2) {
      integerPart = parts.slice(0, -1).join("").replace(/[.,]/g, ""); fractionPart = candidateFraction;
    } else {
      integerPart = raw.replace(/[.,]/g, "");
    }
  }
  integerPart = integerPart.replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(fractionPart)) throw new Error("Formato monetário inválido");
  const cents = Number(integerPart) * 100 + Number((fractionPart + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > MAX_MONEY_CENTS) throw new Error("Valor monetário excede o limite permitido");
  return cents;
}
