import { z } from "zod";

/**
 * ELHABAK money model (Milestone 06).
 *
 * All monetary amounts are persisted as INTEGER MINOR UNITS (1 EGP = 100 minor units,
 * i.e. piastres) and all quantities as INTEGER MILLI-UNITS (1 unit = 1000 milli-units,
 * i.e. up to 3 decimal places). This keeps every stored value and every derived total
 * (line totals, balances, KPI sums) an exact integer computation - no JavaScript
 * floating-point arithmetic is ever used for a financial calculation.
 *
 * Wire format: amounts/quantities travel as decimal strings (e.g. "1250.50") in API
 * requests and responses. Conversion to/from minor units is done with string/BigInt
 * arithmetic only (see decimalToMinorUnits / minorUnitsToDecimal / computeLineTotalMinor).
 * The frontend never parses a formatted display string back into one of these values;
 * it only ever re-sends the exact decimal string the user typed or the API returned.
 *
 * V1 uses a single project currency, EGP, with no FX conversion.
 */
export const CURRENCY = "EGP" as const;

const MONEY_DECIMALS = 2;
const QUANTITY_DECIMALS = 3;

const MONEY_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^\d{1,12}(\.\d{1,3})?$/;

function normalizeDecimalInput(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
}

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

export const moneyAmountSchema = z.preprocess(
  normalizeDecimalInput,
  z.string().regex(MONEY_PATTERN, "Enter a valid amount (up to 2 decimal places).")
).transform((decimal) => decimalToMinorUnits(decimal, MONEY_DECIMALS));

export const quantitySchema = z.preprocess(
  normalizeDecimalInput,
  z.string().regex(QUANTITY_PATTERN, "Enter a valid quantity (up to 3 decimal places).")
).transform((decimal) => decimalToMinorUnits(decimal, QUANTITY_DECIMALS));

export function formatMoneyMajor(minorUnits: number): string {
  return minorUnitsToDecimal(minorUnits, MONEY_DECIMALS);
}

export function formatQuantityMajor(milliUnits: number): string {
  return minorUnitsToDecimal(milliUnits, QUANTITY_DECIMALS);
}
