/**
 * Display and normalize amounts as United States Dollars (USD).
 *
 * Currency conversion is handled by the backend.
 * The frontend only formats the USD values returned by the API.
 */

export function normalizeCurrency(
  code?: string | null
): string {
  if (!code) {
    return "USD";
  }

  const cleaned = String(code)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z$]/g, "");

  if (!cleaned) {
    return "USD";
  }

  if (
    cleaned === "US$" ||
    cleaned === "$"
  ) {
    return "USD";
  }

  if (
    cleaned === "R" ||
    cleaned === "RAND"
  ) {
    return "ZAR";
  }

  return cleaned;
}

/**
 * Format an amount that is already normalized to USD
 * by the backend.
 */
export function formatUsd(
  amount?: number | string | null,
  currency?: string | null
): string {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    return "—";
  }

  const value =
    typeof amount === "number"
      ? amount
      : Number(amount);

  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Display currency label.
 *
 * Backend-normalized monetary values are displayed as USD.
 */
export function currencyLabel(
  currency?: string | null
): string {
  return "USD";
}