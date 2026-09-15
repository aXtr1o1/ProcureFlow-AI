const FALLBACK_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "ZAR",
  "AED",
  "SAR",
  "JPY",
  "CNY",
  "CAD",
  "AUD",
  "CHF",
  "SGD",
  "HKD",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "MXN",
  "BRL",
  "KRW",
  "TRY",
  "PLN",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
] as const;

function loadCurrencyCodes(): string[] {
  try {
    if (
      typeof Intl !== "undefined" &&
      "supportedValuesOf" in Intl &&
      typeof Intl.supportedValuesOf === "function"
    ) {
      return [...Intl.supportedValuesOf("currency")].sort();
    }
  } catch {
    // ignore and use fallback
  }
  return [...FALLBACK_CURRENCIES];
}

/** ISO currency codes for BN (and other) currency dropdowns. */
export const CURRENCY_OPTIONS: string[] = loadCurrencyCodes();
