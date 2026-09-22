/**
 * Pure exact-money helpers — no schema/validation dependencies.
 *
 * Shared by the API (authoritative calculations) and the web client
 * (display + preview only). Importable in the browser bundle via
 * `@elhabak/validation/money-core` without pulling in zod.
 *
 * Money: integer minor units (1 EGP = 100). Quantities: integer
 * milli-units (1 unit = 1000). Never use floating point here.
 */
export const CURRENCY = "EGP" as const;

export const MONEY_DECIMALS = 2;
export const QUANTITY_DECIMALS = 3;

export const MONEY_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;
export const QUANTITY_PATTERN = /^\d{1,12}(\.\d{1,3})?$/;

export function decimalToMinorUnits(decimal: string, fractionDigits: number): number {
  const [integerPartRaw = "0", fractionPartRaw = ""] = decimal.split(".");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "");
  const fractionPart = fractionPartRaw.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  const combined = `${integerPart}${fractionPart}`.replace(/^0+(?=\d)/, "");
  const value = Number.parseInt(combined || "0", 10);
  if (!Number.isSafeInteger(value)) {
    throw new Error("Amount is out of range.");
  }
  return value;
}

export function minorUnitsToDecimal(minorUnits: number, fractionDigits: number): string {
  const negative = minorUnits < 0;
  const digits = Math.abs(Math.trunc(minorUnits)).toString().padStart(fractionDigits + 1, "0");
  const integerPart = digits.slice(0, digits.length - fractionDigits);
  const fractionPart = digits.slice(digits.length - fractionDigits);
  const sign = negative ? "-" : "";
  return fractionDigits > 0 ? `${sign}${integerPart}.${fractionPart}` : `${sign}${integerPart}`;
}

/**
 * quantityMilli (thousandths of a unit) x unitRateMinor (minor currency units) needs a
 * product far larger than either factor, so the multiply/round step uses BigInt to stay
 * exact regardless of magnitude, then narrows back to a safe integer for storage.
 */
export function computeLineTotalMinor(quantityMilli: number, unitRateMinor: number): number {
  const product = BigInt(quantityMilli) * BigInt(unitRateMinor);
  const divisor = 1000n;
  const half = divisor / 2n;
  const rounded = product >= 0n ? (product + half) / divisor : (product - half) / divisor;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) {
    throw new Error("Line total is out of range.");
  }
  return result;
}

export function formatMoneyMajor(minorUnits: number): string {
  return minorUnitsToDecimal(minorUnits, MONEY_DECIMALS);
}

export function formatQuantityMajor(milliUnits: number): string {
  return minorUnitsToDecimal(milliUnits, QUANTITY_DECIMALS);
}
