"""
Convert invoice amounts into United States Dollars (USD).

Exchange rates are configurable through environment variables
and loaded through application settings.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.config import settings


def _fx_table() -> Dict[str, float]:
    """
    Return the configured foreign-currency-to-USD conversion rates.

    Values are loaded from application settings, which reads
    them from the .env file.
    """

    return {
        "USD": float(settings.FX_TO_USD_USD),
        "ZAR": float(settings.FX_TO_USD_ZAR),
        "AED": float(settings.FX_TO_USD_AED),
        "EUR": float(settings.FX_TO_USD_EUR),
        "GBP": float(settings.FX_TO_USD_GBP),
        "SAR": float(settings.FX_TO_USD_SAR),
    }


def normalize_currency_code(currency: Optional[str]) -> str:
    """
    Normalize currency names/codes to a supported currency code.
    """

    code = (
        currency or settings.DEFAULT_CURRENCY
    ).strip().upper()

    if code in {"R", "RAND", "ZAR"}:
        return "ZAR"

    return code or settings.DEFAULT_CURRENCY


def rate_to_usd(currency: Optional[str]) -> float:
    """
    Get the configured conversion rate for one unit
    of the source currency into USD.
    """

    code = normalize_currency_code(currency)

    table = _fx_table()

    return float(
        table.get(
            code,
            table["USD"]
        )
    )


def to_usd(
    amount: Any,
    currency: Optional[str]
) -> float:
    """
    Convert an amount from the source currency to USD.
    """

    try:
        value = float(amount or 0)
    except (TypeError, ValueError):
        value = 0.0

    return round(
        value * rate_to_usd(currency),
        2
    )


def convert_invoice_amounts_to_usd(
    invoice_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Return a copy of invoice_data with monetary fields
    converted to USD.
    """

    data = dict(invoice_data or {})

    source_currency = normalize_currency_code(
        data.get("currency")
    )

    data["original_currency"] = source_currency

    data["subtotal"] = to_usd(
        data.get("subtotal", 0),
        source_currency
    )

    data["tax"] = to_usd(
        data.get("tax", 0),
        source_currency
    )

    data["total_amount"] = to_usd(
        data.get("total_amount", 0),
        source_currency
    )

    data["currency"] = settings.DEFAULT_CURRENCY

    line_items = []

    for item in data.get("line_items") or []:

        line = dict(item or {})

        line["unit_price"] = to_usd(
            line.get("unit_price", 0),
            source_currency
        )

        line["amount"] = to_usd(
            line.get("amount", 0),
            source_currency
        )

        line_items.append(line)

    data["line_items"] = line_items

    return data