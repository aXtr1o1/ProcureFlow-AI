"""
Convert invoice amounts into South African Rand (ZAR) after OCR extraction.
Rates are approximate and configurable via environment variables.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.config import settings


# Units of foreign currency → ZAR (how many Rand per 1 unit of source currency)
DEFAULT_FX_TO_ZAR = {
    "ZAR": 1.0,
    "R": 1.0,
    "RAND": 1.0,
    "USD": 18.50,
    "AED": 5.05,
    "EUR": 20.00,
    "GBP": 23.50,
    "SAR": 4.93,
}


def _fx_table() -> Dict[str, float]:
    table = dict(DEFAULT_FX_TO_ZAR)
    # Optional overrides: FX_TO_ZAR_USD=18.5 etc.
    for key, value in DEFAULT_FX_TO_ZAR.items():
        env_key = f"FX_TO_ZAR_{key}"
        raw = getattr(settings, env_key, None)
        if raw is None:
            continue
        try:
            table[key] = float(raw)
        except (TypeError, ValueError):
            table[key] = value
    return table


def normalize_currency_code(currency: Optional[str]) -> str:
    code = (currency or "ZAR").strip().upper()
    if code in {"R", "RAND", "ZAR"}:
        return "ZAR"
    return code or "ZAR"


def rate_to_zar(currency: Optional[str]) -> float:
    code = normalize_currency_code(currency)
    table = _fx_table()
    return float(table.get(code, table.get("USD", 18.5)))


def to_zar(amount: Any, currency: Optional[str]) -> float:
    try:
        value = float(amount or 0)
    except (TypeError, ValueError):
        value = 0.0
    return round(value * rate_to_zar(currency), 2)


def convert_invoice_amounts_to_zar(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a copy of invoice_data with monetary fields converted to ZAR
    and currency forced to ZAR.
    """
    data = dict(invoice_data or {})
    source_currency = normalize_currency_code(data.get("currency"))

    data["original_currency"] = source_currency
    data["subtotal"] = to_zar(data.get("subtotal", 0), source_currency)
    data["tax"] = to_zar(data.get("tax", 0), source_currency)
    data["total_amount"] = to_zar(data.get("total_amount", 0), source_currency)
    data["currency"] = "ZAR"

    line_items = []
    for item in data.get("line_items") or []:
        line = dict(item or {})
        line["unit_price"] = to_zar(line.get("unit_price", 0), source_currency)
        line["amount"] = to_zar(line.get("amount", 0), source_currency)
        line_items.append(line)
    data["line_items"] = line_items
    return data
