/** Display and normalize amounts as South African Rand (ZAR). */

const FX_TO_ZAR: Record<string, number> = {
  ZAR: 1,
  R: 1,
  USD: 18.5,
  US$: 18.5,
  AED: 5.05,
  EUR: 20.0,
  GBP: 23.5,
};

export function normalizeCurrency(code?: string | null): string {
  if (!code) return "ZAR";
  const cleaned = String(code).trim().toUpperCase().replace(/[^A-Z$]/g, "");
  if (!cleaned || cleaned === "R" || cleaned === "ZAR") return "ZAR";
  if (cleaned === "US$" || cleaned === "$") return "USD";
  return cleaned;
}

export function toZar(
  amount?: number | string | null,
  currency?: string | null
): number | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return null;
  const code = normalizeCurrency(currency);
  const rate = FX_TO_ZAR[code] ?? 1;
  return Math.round(value * rate * 100) / 100;
}

export function formatRand(
  amount?: number | string | null,
  currency?: string | null
): string {
  const zar = toZar(amount, currency);
  if (zar === null) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(zar);
}

export function currencyLabel(currency?: string | null): string {
  return "ZAR";
}
