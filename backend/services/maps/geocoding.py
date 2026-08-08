import httpx
import logging
from ...config import settings
from ...cache.redisclient import RedisCache
from ...utils.retry import with_retry

logger = logging.getLogger("geocoding_service")

# In-memory cache fallback when Redis is unavailable
_MEMORY_CACHE = {}

CITY_TO_COUNTRY = {
    "tokyo": "Japan", "osaka": "Japan", "kyoto": "Japan", "paris": "France", "nice": "France",
    "london": "United Kingdom", "manchester": "United Kingdom", "new york": "United States",
    "nyc": "United States", "san francisco": "United States", "los angeles": "United States",
    "chicago": "United States", "miami": "United States", "las vegas": "United States",
    "bali": "Indonesia", "jakarta": "Indonesia", "rome": "Italy", "milan": "Italy",
    "venice": "Italy", "florence": "Italy", "barcelona": "Spain", "madrid": "Spain",
    "seville": "Spain", "amsterdam": "Netherlands", "berlin": "Germany", "munich": "Germany",
    "vienna": "Austria", "lisbon": "Portugal", "athens": "Greece", "zurich": "Switzerland",
    "geneva": "Switzerland", "dubai": "United Arab Emirates", "abu dhabi": "United Arab Emirates",
    "singapore": "Singapore", "bangkok": "Thailand", "phuket": "Thailand", "goa": "India",
    "delhi": "India", "mumbai": "India", "jaipur": "India", "agra": "India", "bengaluru": "India",
    "sydney": "Australia", "melbourne": "Australia", "auckland": "New Zealand",
    "seoul": "South Korea", "busan": "South Korea", "hong kong": "Hong Kong", "taipei": "Taiwan",
    "kuala lumpur": "Malaysia", "manila": "Philippines", "ho chi minh": "Vietnam", "hanoi": "Vietnam",
    "prague": "Czechia", "budapest": "Hungary", "warsaw": "Poland", "copenhagen": "Denmark",
    "stockholm": "Sweden", "oslo": "Norway", "helsinki": "Finland", "reykjavik": "Iceland",
    "cairo": "Egypt", "marrakech": "Morocco", "casablanca": "Morocco", "cape town": "South Africa",
    "johannesburg": "South Africa", "nairobi": "Kenya", "lagos": "Nigeria", "istanbul": "Turkey",
    "santorini": "Greece", "maldives": "Maldives", "mauritius": "Mauritius", "fiji": "Fiji",
    "cancun": "Mexico", "mexico city": "Mexico", "rio de janeiro": "Brazil", "sao paulo": "Brazil",
    "buenos aires": "Argentina", "lima": "Peru", "santiago": "Chile", "bogota": "Colombia",
}

class GeocodingService:
    @staticmethod
    async def infer_country(destination: str) -> str:
        """Best-effort country from a destination city name — used by the guided
        trip wizard so users never have to type the country separately."""
        if not destination:
            return ""
        key = destination.strip().lower()
        if key in CITY_TO_COUNTRY:
            return CITY_TO_COUNTRY[key]
        # Try geocoding — the formatted address usually ends with the country
        try:
            geo = await GeocodingService.geocode(destination)
            if geo:
                if geo.get("country"):
                    return geo["country"]
                addr = geo.get("formattedaddress") or ""
                parts = [p.strip() for p in addr.split(",") if p.strip()]
                if len(parts) >= 2:
                    return parts[-1]
        except Exception:
            pass
        return destination.strip().title()

    @staticmethod
    @with_retry(max_attempts=3, backoff_factor=2.0)
    async def geocode(place_name: str) -> dict:
        if not place_name:
            return {}

        cache_key = f"geocode:{place_name.lower().strip()}"
        cached = _MEMORY_CACHE.get(cache_key) or await RedisCache.get(cache_key)
        if cached:
            _MEMORY_CACHE[cache_key] = cached
            return cached

        result = {}

        # 1) Geoapify (if configured)
        if settings.GEOAPIFY_API_KEY:
            try:
                url = "https://api.geoapify.com/v1/geocode/search"
                params = {
                    "text": place_name,
                    "apiKey": settings.GEOAPIFY_API_KEY,
                    "limit": 1
                }
                async with httpx.AsyncClient() as client:
                    res = await client.get(url, params=params, timeout=10)
                    res.raise_for_status()
                    data = res.json()

                features = data.get("features", [])
                if features:
                    prop = features[0]["properties"]
                    geom = features[0]["geometry"]["coordinates"]
                    result = {
                        "lat": geom[1],
                        "lng": geom[0],
                        "formattedaddress": prop.get("formatted"),
                        "country": prop.get("country")
                    }
            except Exception as e:
                logger.warning(f"Geoapify geocode failed for '{place_name}': {e}")

        # 2) Nominatim (free fallback — no API key required)
        if not result:
            try:
                url = "https://nominatim.openstreetmap.org/search"
                params = {"q": place_name, "format": "json", "limit": 1}
                headers = {"User-Agent": "AI-Travel-Planner/1.0"}
                async with httpx.AsyncClient() as client:
                    res = await client.get(url, params=params, headers=headers, timeout=12)
                    res.raise_for_status()
                    data = res.json()

                if data:
                    result = {
                        "lat": float(data[0]["lat"]),
                        "lng": float(data[0]["lon"]),
                        "formattedaddress": data[0].get("display_name"),
                        "country": None
                    }
            except Exception as e:
                logger.warning(f"Nominatim geocode failed for '{place_name}': {e}")

        if result:
            await RedisCache.set(cache_key, result, ttl=604800)  # 7 days
            _MEMORY_CACHE[cache_key] = result

        return result
