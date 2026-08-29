/** Display and normalize amounts as United States Dollars (USD). */

const FX_TO_USD: Record<string, number> = {
  USD: 1,
  US$: 1,
  ZAR: 1 / 18.5,
  R: 1 / 18.5,
  AED: 1 / 5.05,
  EUR: 1 / 20.0,
  GBP: 1 / 23.5,
};

export function normalizeCurrency(code?: string | null): string {
  if (!code) return "USD";
  const cleaned = String(code).trim().toUpperCase().replace(/[^A-Z$]/g, "");
  if (!cleaned) return "USD";
  if (cleaned === "US$" || cleaned === "$") return "USD";
  return cleaned;
}

export function toUsd(
  amount?: number | string | null,
  currency?: string | null
): number | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return null;
  const code = normalizeCurrency(currency);
  const rate = FX_TO_USD[code] ?? 1;
  return Math.round(value * rate * 100) / 100;
}

export function formatUsd(
  amount?: number | string | null,
  currency?: string | null
): string {
  const usd = toUsd(amount, currency);
  if (usd === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function currencyLabel(currency?: string | null): string {
  return "USD";
}
