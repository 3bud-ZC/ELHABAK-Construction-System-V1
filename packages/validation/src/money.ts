import { z } from "zod";
import { decimalToMinorUnits, MONEY_DECIMALS, MONEY_PATTERN, QUANTITY_DECIMALS, QUANTITY_PATTERN } from "./money-core";

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
 *
 * The pure conversion/computation helpers live in money-core.ts so the web client can
 * reuse the identical integer arithmetic for previews without bundling zod.
 */
export * from "./money-core";

function normalizeDecimalInput(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
}

export const moneyAmountSchema = z.preprocess(
  normalizeDecimalInput,
  z.string().regex(MONEY_PATTERN, "Enter a valid amount (up to 2 decimal places).")
).transform((decimal) => decimalToMinorUnits(decimal, MONEY_DECIMALS));

export const quantitySchema = z.preprocess(
  normalizeDecimalInput,
  z.string().regex(QUANTITY_PATTERN, "Enter a valid quantity (up to 3 decimal places).")
).transform((decimal) => decimalToMinorUnits(decimal, QUANTITY_DECIMALS));
