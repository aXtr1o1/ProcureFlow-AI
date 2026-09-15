"""
Convert amounts to USD using a live USD-base FX feed.

Any ISO currency returned by the feed is supported.
Optional FX_TO_USD_* env values override specific rates
(USD per 1 unit of that currency).
"""

from __future__ import annotations

import json
import logging
import time
import urllib.request
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_cache: Dict[str, Any] = {
    "fetched_at": 0.0,
    # USD-base: 1 USD = N units of currency (lowercase keys)
    "usd_base": {"usd": 1.0},
}


def normalize_currency_code(currency: Optional[str]) -> str:
    """
    Normalize currency names/codes to a supported currency code.
    """

    code = (
        currency or settings.DEFAULT_CURRENCY
    ).strip().upper()

    if code in {"R", "RAND"}:
        return "ZAR"

    if code in {"US$", "$"}:
        return "USD"

    return code or settings.DEFAULT_CURRENCY


def _env_overrides_to_usd() -> Dict[str, float]:
    """
    Optional FX_TO_USD_* = USD per 1 unit of that currency.
    """

    mapping = {
        "USD": getattr(settings, "FX_TO_USD_USD", 1.0),
        "ZAR": getattr(settings, "FX_TO_USD_ZAR", None),
        "AED": getattr(settings, "FX_TO_USD_AED", None),
        "EUR": getattr(settings, "FX_TO_USD_EUR", None),
        "GBP": getattr(settings, "FX_TO_USD_GBP", None),
        "SAR": getattr(settings, "FX_TO_USD_SAR", None),
    }

    overrides: Dict[str, float] = {}

    for code, rate in mapping.items():
        if rate is None:
            continue
        try:
            overrides[code] = float(rate)
        except (TypeError, ValueError):
            continue

    overrides.setdefault("USD", 1.0)
    return overrides


def _fetch_usd_base_rates() -> Dict[str, float]:
    req = urllib.request.Request(
        settings.FX_RATES_URL,
        headers={"User-Agent": "ProcureFlow-AI/1.0"},
    )

    with urllib.request.urlopen(req, timeout=10) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    # Shape: { "date": "...", "usd": { "eur": 0.92, "inr": 83.1, ... } }
    raw = payload.get("usd") or payload
    rates: Dict[str, float] = {"usd": 1.0}

    for key, value in (raw or {}).items():
        try:
            rates[str(key).lower()] = float(value)
        except (TypeError, ValueError):
            continue

    rates["usd"] = 1.0
    return rates


def _usd_base_table() -> Dict[str, float]:
    now = time.time()
    ttl = float(getattr(settings, "FX_CACHE_TTL_SECONDS", 21600) or 21600)

    if (
        _cache["usd_base"]
        and len(_cache["usd_base"]) > 1
        and (now - float(_cache["fetched_at"] or 0)) < ttl
    ):
        return _cache["usd_base"]

    try:
        rates = _fetch_usd_base_rates()
        _cache["usd_base"] = rates
        _cache["fetched_at"] = now
        return rates
    except Exception as exc:
        logger.warning(
            "FX fetch failed, using cache/fallback: %s",
            exc,
        )
        if _cache["usd_base"] and len(_cache["usd_base"]) > 1:
            return _cache["usd_base"]
        return {"usd": 1.0}


def rate_to_usd(currency: Optional[str]) -> float:
    """
    USD per 1 unit of source currency.
    Uses env override if set; else 1 / (USD-base rate).
    """

    code = normalize_currency_code(currency)

    if code == "USD":
        return 1.0

    overrides = _env_overrides_to_usd()
    if code in overrides and code != "USD":
        return float(overrides[code])

    usd_base = _usd_base_table()
    units_per_usd = usd_base.get(code.lower())

    if not units_per_usd or float(units_per_usd) <= 0:
        raise ValueError(
            f"No FX rate available for currency '{code}'. "
            "Cannot convert to USD."
        )

    return 1.0 / float(units_per_usd)


def to_usd(
    amount: Any,
    currency: Optional[str],
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
        2,
    )


def convert_invoice_amounts_to_usd(
    invoice_data: Dict[str, Any],
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
        source_currency,
    )

    data["tax"] = to_usd(
        data.get("tax", 0),
        source_currency,
    )

    data["total_amount"] = to_usd(
        data.get("total_amount", 0),
        source_currency,
    )

    data["currency"] = settings.DEFAULT_CURRENCY

    line_items = []

    for item in data.get("line_items") or []:
        line = dict(item or {})

        line["unit_price"] = to_usd(
            line.get("unit_price", 0),
            source_currency,
        )

        line["amount"] = to_usd(
            line.get("amount", 0),
            source_currency,
        )

        line_items.append(line)

    data["line_items"] = line_items

    return data
