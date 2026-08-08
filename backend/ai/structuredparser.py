import re
import json
import datetime
from typing import Dict, Any

def parse_json_safely(raw: str) -> Dict[str, Any]:
    try:
        m = re.search(r"\{.*\}", raw, re.S)
        if m:
            return json.loads(m.group(0))
    except Exception:
        pass
    return {}


def _plausible_date(date_str: str, raw_query: str) -> bool:
    """Reject hallucinated dates (e.g. reading a budget '2000' as a year)."""
    try:
        d = datetime.date.fromisoformat(str(date_str))
    except (ValueError, TypeError):
        return False

    today = datetime.date.today()
    # Dates must be within ~[today-1yr, today+3yrs] to be credible for trip planning
    if d < today - datetime.timedelta(days=365):
        return False
    if d > today + datetime.timedelta(days=365 * 3):
        return False

    # If a plausible year (near current) is mentioned, trust it; otherwise require
    # current/next year. This prevents reading a budget like "2000" as a year.
    year_in_query = re.search(r"\b(20\d{2}|19\d{2})\b", raw_query)
    if year_in_query:
        mentioned_year = int(year_in_query.group(1))
        if today.year - 1 <= mentioned_year <= today.year + 3:
            return True
    return d.year in (today.year, today.year + 1)


def _field_mentioned_in_query(field: str, raw_query: str) -> bool:
    """Return True only if the raw message clearly mentions this entity field.
    Prevents stale/hallucinated re-extractions from clobbering known trip state."""
    q = raw_query.lower()
    if field in ("startdate", "enddate"):
        has_month = re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b", q)
        has_year = re.search(r"\b\d{4}\b", q)
        has_rel = re.search(r"\b(?:today|tomorrow|tonight|next week|next weekend|this week|weekend)\b", q)
        has_range = re.search(r"\b(?:from|between)\b.*\b(?:to|and)\b|\b(?:from|between)\b", q)
        return bool(has_month or has_year or has_rel or has_range)
    if field == "budget":
        return bool(re.search(r"\$|€|£|₹|\b(?:budget|under|around|about|approx|cost|price|spend)\b|[\d,]+\s*k?\b", q))
    if field == "currency":
        return bool(re.search(
            r"\$|€|£|₹|¥|₩|₺|₽|₴|₱|₫|₦|฿|\b(?:usd|eur|gbp|inr|jpy|aud|cad|sgd|chf|cny|krw|hkd|aed|sar|qar|zar|brl|mxn|try|rub|thb|idr|myr|php|vnd|twd|sek|nok|dkk|pln|czk|huf|egp|ngn|kes|ils|dollar|euro|pound|rupee|yen|won|baht|peso|rand|rial|dirham)\b", q
        ))
    if field == "travelercount":
        return bool(re.search(r"\b\d+\s*(?:people|persons|travelers|travellers|friends|adults|kids|of us)\b|\b(?:solo|couple)\b", q))
    if field == "travelertype":
        return bool(re.search(r"\b(?:solo|couple|family|group|honeymoon|business|backpacking)\b", q))
    if field == "interests":
        return bool(re.search(r"\b(?:love|enjoy|like|interested|prefer|want to|food|art|nature|history|culture|shopping|adventure|relaxation|beach|trekking|museum)\b", q))
    if field in ("destination", "country"):
        return bool(re.search(r"\b(?:trip|travel|visit|go|fly|tour|vacation|holiday|destination|to)\b", q))
    return True


def merge_entities_safely(current: Dict[str, Any], extracted: Dict[str, Any], raw_query: str) -> Dict[str, Any]:
    """Merge newly extracted entities into current state without clobbering known values.
    A field is only updated when the raw message actually mentions it."""
    merged = dict(current)
    for k, v in (extracted or {}).items():
        if v is None or v == "" or v == []:
            continue
        # Always allow filling empty fields; for populated fields require explicit mention
        current_val = merged.get(k)
        if current_val in (None, "", []):
            merged[k] = v
        elif _field_mentioned_in_query(k, raw_query):
            merged[k] = v
    return merged


def clean_extracted_entities(entities: Dict[str, Any], raw_query: str) -> Dict[str, Any]:
    cleaned = entities.copy()

    # Destination cleanup
    if not cleaned.get("destination"):
        match = re.search(r"\b(?:to|in|for|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b", raw_query)
        if match:
            cleaned["destination"] = match.group(1)

    # Budget cleanup
    budget_val = cleaned.get("budget")
    if budget_val is None:
        budget_match = re.search(
            r"\b(?:budget|around|under|about|approx\.?|cost|price|of|spend|with|~)\s*(?:is|of|around|about|under|for)?\s*\$?\s?([\d,]+(?:\.\d+)?)(k)?\b",
            raw_query.lower()
        )
        if budget_match:
            try:
                num = float(budget_match.group(1).replace(",", ""))
                if budget_match.group(2):
                    num *= 1000
                cleaned["budget"] = int(num)
            except ValueError:
                pass
    else:
        try:
            if isinstance(budget_val, str):
                budget_val = budget_val.lower().replace(",", "").replace("$", "")
                if "k" in budget_val:
                    cleaned["budget"] = int(float(budget_val.replace("k", "")) * 1000)
                else:
                    cleaned["budget"] = int(float(budget_val))
            else:
                cleaned["budget"] = int(budget_val)
        except:
            cleaned["budget"] = None

    # Dates format + plausibility validation (anti-hallucination)
    for date_field in ("startdate", "enddate"):
        val = cleaned.get(date_field)
        if val:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(val)):
                cleaned[date_field] = None
            elif not _plausible_date(val, raw_query):
                cleaned[date_field] = None

    # Traveler Count cleanup
    count = cleaned.get("travelercount")
    if count is None:
        match = re.search(r"\b(\d+)\s*(?:people|persons|travelers|friends)\b", raw_query.lower())
        if match:
            cleaned["travelercount"] = int(match.group(1))
    else:
        try:
            cleaned["travelercount"] = int(count)
        except:
            cleaned["travelercount"] = 1

    # Traveler Type cleanup
    t_type = cleaned.get("travelertype")
    if not t_type:
        for p in ("solo", "couple", "family", "group"):
            if p in raw_query.lower():
                cleaned["travelertype"] = p
                break
    
    if cleaned.get("travelertype") not in ("solo", "couple", "family", "group"):
        cleaned["travelertype"] = "solo"

    # Currency extraction and normalization (ANY ISO 4217 code accepted)
    curr_raw = cleaned.get("currency")
    CURRENCY_SYMBOL_MAP = {
        "$": "USD", "€": "EUR", "£": "GBP", "₹": "INR", "¥": "JPY",
        "₩": "KRW", "₺": "TRY", "₽": "RUB", "₴": "UAH", "₱": "PHP",
        "₫": "VND", "₦": "NGN", "฿": "THB", "﷼": "SAR", "₪": "ILS",
        "zł": "PLN", "₸": "KZT", "₾": "GEL", "₼": "AZN", "R": "ZAR",
        "kr": "SEK", "Kč": "CZK", "Ft": "HUF", "lei": "RON",
    }
    if curr_raw:
        curr_upper = str(curr_raw).upper().strip()
        curr_symbol = str(curr_raw).strip()
        if curr_symbol in CURRENCY_SYMBOL_MAP:
            cleaned["currency"] = CURRENCY_SYMBOL_MAP[curr_symbol]
        elif curr_upper in ("DOLLAR", "DOLLARS"):
            cleaned["currency"] = "USD"
        elif curr_upper in ("EURO", "EUROS"):
            cleaned["currency"] = "EUR"
        elif curr_upper in ("POUND", "POUNDS"):
            cleaned["currency"] = "GBP"
        elif curr_upper in ("RUPEE", "RUPEES"):
            cleaned["currency"] = "INR"
        elif curr_upper in ("YEN"):
            cleaned["currency"] = "JPY"
        elif len(curr_upper) == 3 and curr_upper.isalpha():
            cleaned["currency"] = curr_upper
        else:
            cleaned["currency"] = "USD"
    else:
        # Check raw query for symbols/names — ANY world currency
        q_lower = raw_query.lower()
        CURRENCY_ALIASES = {
            "usd": "USD", "eur": "EUR", "gbp": "GBP", "inr": "INR",
            "jpy": "JPY", "aud": "AUD", "cad": "CAD", "sgd": "SGD",
            "chf": "CHF", "cny": "CNY", "krw": "KRW", "hkd": "HKD",
            "aed": "AED", "sar": "SAR", "qar": "QAR", "zar": "ZAR",
            "brl": "BRL", "mxn": "MXN", "try": "TRY", "rub": "RUB",
            "thb": "THB", "idr": "IDR", "myr": "MYR", "php": "PHP",
            "vnd": "VND", "twd": "TWD", "sek": "SEK", "nok": "NOK",
            "dkk": "DKK", "pln": "PLN", "czk": "CZK", "huf": "HUF",
            "egp": "EGP", "ngn": "NGN", "kes": "KES", "ils": "ILS",
            "nzd": "NZD", "bdt": "BDT", "pkr": "PKR", "lkr": "LKR",
            "npr": "NPR", "uah": "UAH", "ron": "RON", "bgn": "BGN",
            "isk": "ISK", "kwd": "KWD", "bhd": "BHD", "omr": "OMR",
            "jod": "JOD", "mad": "MAD", "tnd": "TND", "dzd": "DZD",
        }
        SYMBOL_ALIASES = {
            "$": "USD", "€": "EUR", "£": "GBP", "₹": "INR", "¥": "JPY",
            "₩": "KRW", "₺": "TRY", "₽": "RUB", "₴": "UAH", "₱": "PHP",
            "₫": "VND", "₦": "NGN", "฿": "THB", "₪": "ILS", "﷼": "SAR",
        }
        NAME_ALIASES = {
            "dollar": "USD", "euro": "EUR", "pound": "GBP", "rupee": "INR",
            "yen": "JPY", "won": "KRW", "baht": "THB", "peso": "MXN",
            "rand": "ZAR", "rial": "SAR", "dirham": "AED", "lira": "TRY",
            "rubel": "RUB", "real": "BRL", "ringgit": "MYR", "rupiah": "IDR",
            "dong": "VND", "krona": "SEK", "krone": "NOK", "forint": "HUF",
            "zloty": "PLN", "koruna": "CZK", "shekel": "ILS", "leu": "RON",
            "dinar": "KWD", "franc": "CHF", "yuan": "CNY", "renminbi": "CNY",
        }
        detected = None
        for sym, code in SYMBOL_ALIASES.items():
            if sym in raw_query:
                detected = code
                break
        if not detected:
            for name, code in NAME_ALIASES.items():
                if name in q_lower:
                    detected = code
                    break
        if not detected:
            for code_str, code in CURRENCY_ALIASES.items():
                if re.search(rf"\b{code_str}\b", q_lower):
                    detected = code
                    break
        if detected:
            cleaned["currency"] = detected
        else:
            # Only fall back to USD when the user actually talks about money
            # (a budget number, a currency word/symbol). Never invent a currency
            # from an unrelated 3-letter word — that used to clobber the user's
            # chosen currency (e.g. picking INR then being reset to USD).
            if re.search(r"\b(?:budget|spend|cost|price|worth|around|under|about)\b|\d|\$|€|£|₹|¥|₩", raw_query.lower()):
                cleaned["currency"] = "USD"
            else:
                cleaned["currency"] = None

    return cleaned
