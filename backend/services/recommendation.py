import os
import json
import random
from typing import Dict, Any, List
from ..services.maps.geocoding import GeocodingService
from ..services.maps.places import PlacesService
from ..api.osm_service import load_local_fallback_spots, search_pois
from .currency import from_usd_sync


def load_curated_spots(destination: str) -> List[Dict[str, Any]]:
    """Load real curated famous places for a destination (from curated_spots.json)."""
    try:
        path = os.path.join(os.path.dirname(__file__), "..", "api", "curated_spots.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get(destination, []) or []
    except Exception:
        return []

INTEREST_CATEGORY_MAP = {
    "food": ["food_experience", "restaurant"],
    "art": ["museum", "sightseeing"],
    "history": ["museum", "sightseeing"],
    "culture": ["museum", "sightseeing"],
    "nature": ["park", "sightseeing"],
    "shopping": ["shopping"],
    "relaxation": ["relaxation", "park"],
    "adventure": ["sightseeing"],
    "beaches": ["park", "relaxation"],
    "nightlife": ["food_experience"],
}

class RecommendationService:
    """Returns REAL, verifiable places near a destination — never fabricated names."""

    @staticmethod
    async def recommend(destination: str, interests: List[str] = None, count: int = 12, currency: str = "USD") -> List[Dict[str, Any]]:
        interests = interests or []
        geo = await GeocodingService.geocode(destination)
        if geo:
            base_lat, base_lng = geo["lat"], geo["lng"]

        places = []

        # 1) Geoapify places (real POIs with coordinates)
        if base_lat is not None:
            try:
                places = await PlacesService.search_places(base_lat, base_lng, interests, radius=8000)
            except Exception:
                places = []

        # 2) Curated real spots with exact coordinates (fast, no network)
        if not places:
            for s in load_curated_spots(destination):
                places.append({
                    "name": s.get("name"),
                    "coordinates": {"lat": s.get("lat"), "lng": s.get("lon")},
                    "category": s.get("category", "attraction"),
                    "openinghours": None,
                    "description": s.get("description", f"A famous spot in {destination}.")
                })

        # 3) Local curated fallback: real names from tourist_spots.json + geocoding
        if not places:
            categories = []
            for interest in interests:
                for cat in INTEREST_CATEGORY_MAP.get(interest.lower(), []):
                    if cat not in categories:
                        categories.append(cat)
            if not categories:
                categories = ["sightseeing", "food_experience"]

            seen = set()
            for category in categories:
                spots = load_local_fallback_spots(destination, category)
                for s in spots:
                    name = s.get("name")
                    if not name or name in seen:
                        continue
                    seen.add(name)
                    geo = await GeocodingService.geocode(f"{name}, {destination}")
                    if geo:
                        places.append({
                            "name": name,
                            "coordinates": {"lat": geo["lat"], "lng": geo["lng"]},
                            "category": category,
                            "openinghours": None,
                            "description": f"A popular {category.replace('_', ' ')} spot in {destination}."
                        })

        # 3) OSM fallback (real places, real coordinates)
        if not places and base_lat is not None:
            try:
                hints = ["attraction", "restaurant", "museum"]
                osm_pois = search_pois(base_lat, base_lng, hints, radius=5000, limit=20)
                for p in osm_pois:
                    if p.get("name"):
                        places.append({
                            "name": p["name"],
                            "coordinates": {"lat": p["lat"], "lng": p["lon"]},
                            "category": "attraction",
                            "openinghours": None,
                            "description": f"A notable spot in {destination}."
                        })
            except Exception:
                pass

        # Normalize + limit
        result = []
        for p in places[:count]:
            cost_usd = {
                "restaurant": 18.0,
                "food_experience": 15.0,
                "museum": 12.0,
                "shopping": 0.0,
                "park": 0.0,
                "relaxation": 25.0,
            }.get(str(p.get("category", "")).lower(), 10.0)
            result.append({
                "name": p.get("name"),
                "category": p.get("category", "attraction"),
                "coordinates": p.get("coordinates") or {"lat": base_lat or 0.0, "lng": base_lng or 0.0},
                "openinghours": p.get("openinghours"),
                "description": p.get("description") or f"A must-see place in {destination}.",
                "estimatedcost": round(from_usd_sync(cost_usd, currency), 2),
                "estimateddurationminutes": 90
            })

        # Deterministic shuffle so recommendations vary a little per request but stay real
        rng = random.Random(destination.lower())
        rng.shuffle(result)
        return result[:count]
