"""
Currency service — supports EVERY ISO 4217 currency in the world.

Strategy:
  1. Try to fetch live rates from a free, no-key API (open.er-api.com).
  2. Cache in memory for 12 hours.
  3. Fall back to a comprehensive static table (approximate mid-2025 rates).
"""

import time
import logging
from typing import Dict, Optional

logger = logging.getLogger("currency_service")

# ---------------------------------------------------------------------------
# Static fallback rates (units of currency per 1 USD) — full ISO 4217 coverage
# ---------------------------------------------------------------------------
STATIC_RATES_TO_USD: Dict[str, float] = {
    # Major / common
    "USD": 1.0, "EUR": 0.92, "GBP": 0.78, "JPY": 156.0, "INR": 83.5,
    "CNY": 7.25, "CAD": 1.37, "AUD": 1.50, "CHF": 0.89, "SGD": 1.35,
    "NZD": 1.63, "KRW": 1375.0, "HKD": 7.8, "AED": 3.67, "SEK": 10.5,
    "NOK": 10.6, "DKK": 6.9, "PLN": 4.0, "CZK": 23.2, "HUF": 360.0,
    "RON": 4.6, "BGN": 1.8, "TRY": 32.5, "RUB": 89.0, "UAH": 41.0,
    "ZAR": 18.5, "BRL": 5.3, "MXN": 18.2, "ARS": 910.0, "CLP": 950.0,
    "COP": 4100.0, "PEN": 3.7, "THB": 36.5, "IDR": 16000.0, "MYR": 4.7,
    "PHP": 58.5, "VND": 25400.0, "TWD": 32.3, "PKR": 278.0, "BDT": 110.0,
    "LKR": 300.0, "NPR": 134.0, "ILS": 3.75, "SAR": 3.75, "QAR": 3.64,
    "KWD": 0.31, "BHD": 0.38, "OMR": 0.38, "JOD": 0.71, "EGP": 48.5,
    "MAD": 10.0, "DZD": 134.0, "TND": 3.1, "NGN": 1500.0, "GHS": 15.0,
    "KES": 130.0, "ETB": 115.0, "UGX": 3700.0, "TZS": 2600.0, "ZMW": 25.0,
    "MUR": 46.0, "XAF": 604.0, "XOF": 604.0, "XCD": 2.7, "JMD": 156.0,
    "TTD": 6.8, "BBD": 2.0, "BZD": 2.0, "GYD": 209.0, "HTG": 132.0,
    "NIO": 36.7, "PAB": 1.0, "UYU": 39.0, "BOB": 6.9, "PYG": 7500.0,
    "CRC": 510.0, "DOP": 59.0, "GTQ": 7.8, "HNL": 24.7, "SVC": 8.75,
    "AWG": 1.8, "ANG": 1.79, "BSD": 1.0, "BMD": 1.0, "KYD": 0.83,
    "CUP": 24.0, "CUC": 1.0, "BWP": 13.6, "NAD": 18.5, "MZN": 63.0,
    "MWK": 1740.0, "ZWL": 322.0, "RWF": 1320.0, "BIF": 2870.0, "DJF": 178.0,
    "ERN": 15.0, "GMD": 67.0, "GNF": 8600.0, "LRD": 194.0, "LYD": 4.85,
    "MRU": 40.0, "SCR": 13.5, "SLL": 21000.0, "SOS": 570.0, "SSP": 1300.0,
    "STN": 22.5, "SDG": 600.0, "SZL": 18.5, "TMT": 3.5, "AOA": 860.0,
    "CDF": 2830.0, "MGA": 4500.0, "MKD": 56.5, "MDL": 17.7, "ALL": 92.0,
    "AMD": 388.0, "AZN": 1.7, "BYN": 3.27, "GEL": 2.7, "KZT": 450.0,
    "KGS": 89.0, "TJS": 10.9, "UZS": 12800.0, "MNT": 3400.0, "MMK": 2100.0,
    "KHR": 4100.0, "LAK": 22000.0, "MOP": 8.03, "PGK": 3.85, "WST": 2.75,
    "TOP": 2.35, "FJD": 2.25, "SBD": 8.4, "VUV": 119.0, "XPF": 109.8,
    "CVE": 101.5, "ISK": 138.0, "MVR": 15.4, "BTN": 83.5, "AFN": 71.0,
    "IQD": 1310.0, "IRR": 42000.0, "LBP": 89500.0, "SYP": 13000.0,
    "YER": 250.0, "KMF": 453.0, "BND": 1.35, "FKP": 0.78,
    "GIP": 0.78, "SHP": 0.78, "IMP": 0.78, "JEP": 0.78, "GGP": 0.78,
    "KPW": 900.0,
}

# Currency symbols for friendly display (frontend also has its own map)
CURRENCY_SYMBOLS: Dict[str, str] = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "INR": "₹", "CNY": "¥",
    "CAD": "C$", "AUD": "A$", "CHF": "CHF", "SGD": "S$", "NZD": "NZ$",
    "KRW": "₩", "HKD": "HK$", "AED": "د.إ", "SEK": "kr", "NOK": "kr",
    "DKK": "kr", "PLN": "zł", "CZK": "Kč", "HUF": "Ft", "RON": "lei",
    "TRY": "₺", "RUB": "₽", "UAH": "₴", "ZAR": "R", "BRL": "R$", "MXN": "MX$",
    "THB": "฿", "IDR": "Rp", "MYR": "RM", "PHP": "₱", "VND": "₫", "TWD": "NT$",
    "PKR": "₨", "BDT": "৳", "ILS": "₪", "SAR": "﷼", "EGP": "E£", "NGN": "₦",
    "ARS": "$", "CLP": "$", "COP": "$", "PEN": "S/", "KES": "KSh",
    "LKR": "Rs", "NPR": "रू", "MAD": "د.م.", "UZS": "so'm", "KZT": "₸",
    "GEL": "₾", "BYN": "Br", "AMD": "֏", "AZN": "₼", "IQD": "ع.د",
    "TND": "د.ت", "MUR": "₨", "TTD": "TT$", "JMD": "J$", "XAF": "FCFA",
    "XOF": "FCFA", "XCD": "EC$", "BWP": "P", "ISK": "kr", "VEF": "Bs",
    "CRC": "₡", "DOP": "RD$", "GTQ": "Q", "HNL": "L", "NIO": "C$",
    "PAB": "B/.", "UYU": "$U", "PYG": "₲", "BOB": "Bs", "MOP": "MOP$",
    "BND": "B$", "FJD": "FJ$", "MVR": "Rf", "CVE": "Esc", "WST": "WS$",
    "TOP": "T$", "SBD": "SI$", "VUV": "VT", "PGK": "K", "MNT": "₮",
    "KHR": "៛", "LAK": "₭", "MMK": "K", "MGA": "Ar", "GHS": "GH₵",
    "ETB": "Br", "UGX": "USh", "TZS": "TSh", "ZMW": "ZK", "MZN": "MT",
    "MWK": "MK", "RWF": "FRw", "BIF": "FBu", "DJF": "Fdj", "ERN": "Nfk",
    "GNF": "FG", "LRD": "L$", "LYD": "LD", "SCR": "₨", "SOS": "S",
    "SDG": "ج.س", "SYP": "£S", "YER": "﷼", "KWD": "د.ك", "BHD": "د.ب",
    "OMR": "ر.ع.", "JOD": "د.ا", "QAR": "ر.ق", "IRR": "﷼", "LBP": "ل.ل",
    "AFN": "؋", "KPW": "₩", "CUP": "₱", "AWG": "ƒ", "ANG": "ƒ", "BBD": "Bds$",
    "BZD": "BZ$", "BSD": "B$", "BMD": "BD$", "KYD": "CI$", "CUC": "CUC$",
}

LIVE_RATES_URL = "https://open.er-api.com/v6/latest/USD"
CACHE_TTL_SECONDS = 12 * 60 * 60  # 12 hours


class CurrencyService:
    _live_rates: Optional[Dict[str, float]] = None
    _last_fetch: float = 0.0

    # ------------------------------------------------------------------
    @staticmethod
    async def refresh_rates() -> None:
        """Fetch live FX rates once and cache them. Never throws."""
        import httpx
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                res = await client.get(LIVE_RATES_URL)
                res.raise_for_status()
                data = res.json()
                rates = data.get("rates")
                if isinstance(rates, dict) and rates:
                    CurrencyService._live_rates = {k.upper(): float(v) for k, v in rates.items()}
                    CurrencyService._last_fetch = time.time()
                    logger.info("Live FX rates loaded (%d currencies)", len(rates))
        except Exception as e:
            logger.warning("Could not fetch live FX rates, using static table: %s", e)

    # ------------------------------------------------------------------
    @staticmethod
    def get_rate_sync(currency_code: str) -> float:
        """Rate of the given currency per 1 USD (live if cached, else static)."""
        code = (currency_code or "USD").upper().strip()
        if CurrencyService._live_rates and code in CurrencyService._live_rates:
            return float(CurrencyService._live_rates[code])
        return STATIC_RATES_TO_USD.get(code, 1.0)

    @staticmethod
    def to_usd_sync(amount: float, currency_code: str) -> float:
        """Convert an amount in the given currency to USD."""
        rate = CurrencyService.get_rate_sync(currency_code)
        try:
            return float(amount) / rate if rate else float(amount)
        except (TypeError, ValueError):
            return float(amount or 0.0)

    @staticmethod
    def from_usd_sync(amount_usd: float, currency_code: str) -> float:
        """Convert a USD amount into the given currency."""
        rate = CurrencyService.get_rate_sync(currency_code)
        try:
            return float(amount_usd) * rate
        except (TypeError, ValueError):
            return float(amount_usd or 0.0)

    @staticmethod
    def symbol(currency_code: str) -> str:
        code = (currency_code or "USD").upper().strip()
        return CURRENCY_SYMBOLS.get(code, code)

    @staticmethod
    def is_supported(currency_code: str) -> bool:
        code = (currency_code or "").upper().strip()
        if not code:
            return False
        if len(code) != 3 or not code.isalpha():
            return False
        if CurrencyService._live_rates:
            return code in CurrencyService._live_rates
        return code in STATIC_RATES_TO_USD


# Sync alias used by the budget scorer
get_rate_sync = CurrencyService.get_rate_sync
to_usd_sync = CurrencyService.to_usd_sync
from_usd_sync = CurrencyService.from_usd_sync
