"""
Convert invoice amounts into United States Dollars (USD) after OCR extraction.
Rates are approximate and configurable via environment variables.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.config import settings


# Units of foreign currency → USD (USD per one unit of source currency).
# Rates are deliberately configurable, not live market quotes.
DEFAULT_FX_TO_USD = {
    "USD": 1.0,
    "ZAR": 1 / 18.50,
    "R": 1 / 18.50,
    "RAND": 1 / 18.50,
    "AED": 1 / 5.05,
    "EUR": 1 / 20.00,
    "GBP": 1 / 23.50,
    "SAR": 1 / 4.93,
}


def _fx_table() -> Dict[str, float]:
    table = dict(DEFAULT_FX_TO_USD)
    # Optional overrides: FX_TO_USD_AED=0.198 etc.
    for key, value in DEFAULT_FX_TO_USD.items():
        env_key = f"FX_TO_USD_{key}"
        raw = getattr(settings, env_key, None)
        if raw is None:
            continue
        try:
            table[key] = float(raw)
        except (TypeError, ValueError):
            table[key] = value
    return table


def normalize_currency_code(currency: Optional[str]) -> str:
    code = (currency or "USD").strip().upper()
    if code in {"R", "RAND", "ZAR"}:
        return "ZAR"
    return code or "USD"


def rate_to_usd(currency: Optional[str]) -> float:
    code = normalize_currency_code(currency)
    table = _fx_table()
    return float(table.get(code, table["USD"]))


def to_usd(amount: Any, currency: Optional[str]) -> float:
    try:
        value = float(amount or 0)
    except (TypeError, ValueError):
        value = 0.0
    return round(value * rate_to_usd(currency), 2)


def convert_invoice_amounts_to_usd(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a copy of invoice_data with monetary fields converted to USD
    and currency forced to USD.
    """
    data = dict(invoice_data or {})
    source_currency = normalize_currency_code(data.get("currency"))

    data["original_currency"] = source_currency
    data["subtotal"] = to_usd(data.get("subtotal", 0), source_currency)
    data["tax"] = to_usd(data.get("tax", 0), source_currency)
    data["total_amount"] = to_usd(data.get("total_amount", 0), source_currency)
    data["currency"] = "USD"

    line_items = []
    for item in data.get("line_items") or []:
        line = dict(item or {})
        line["unit_price"] = to_usd(line.get("unit_price", 0), source_currency)
        line["amount"] = to_usd(line.get("amount", 0), source_currency)
        line_items.append(line)
    data["line_items"] = line_items
    return data
