import json
import re
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from ...ai.ollamaclient import OllamaClient
from ...ai.promptregistry import PROMPTS
from ...services.maps.geocoding import GeocodingService
from ...services.maps.places import PlacesService
from ...api.osm_service import load_local_fallback_spots, search_pois
from ...services.recommendation import load_curated_spots

class ItineraryGenerator:
    @staticmethod
    async def generate_itinerary(
        destination: str,
        country: str,
        start_date: str,
        end_date: str,
        interests: List[str],
        budget: float,
        currency: str,
        travelers: int,
        traveler_type: str
    ) -> Dict[str, Any]:
        
        prompt = PROMPTS["itinerarygeneration"].format(
            destination=destination,
            country=country,
            startdate=start_date,
            enddate=end_date,
            interests=interests,
            budget=budget,
            currency=currency,
            travelercount=travelers,
            travelertype=traveler_type
        )
        
        raw_res = OllamaClient.call_ollama(prompt)
        parsed = {}
        
        try:
            m = re.search(r"\{.*\}", raw_res, re.S)
            if m:
                parsed = json.loads(m.group(0))
        except Exception:
            pass

        days_list = parsed.get("days", [])
        if not days_list:
            days_list = await ItineraryGenerator._generate_fallback_days(
                destination=destination,
                start_date=start_date,
                end_date=end_date,
                interests=interests,
                budget=budget,
                currency=currency
            )
        else:
            base_lat, base_lng = await ItineraryGenerator._get_destination_coords(destination)
            for day in days_list:
                for act in day.get("activities", []):
                    coords = act.get("coordinates")
                    missing = (
                        not coords
                        or coords.get("lat") is None
                        or coords.get("lng") is None
                        or coords.get("lat") == 0.0
                        or coords.get("lng") == 0.0
                    )
                    if missing:
                        geo = await ItineraryGenerator._geocode_activity(act, destination)
                        if geo:
                            act["coordinates"] = {"lat": geo["lat"], "lng": geo["lng"]}
                        elif base_lat is not None:
                            act["coordinates"] = {"lat": base_lat, "lng": base_lng}
                        else:
                            act["coordinates"] = {"lat": base_lat or 0.0, "lng": base_lng or 0.0}
                    if act.get("estimatedcost") is None:
                        act["estimatedcost"] = 10.0
                    if act.get("currency") is None:
                        act["currency"] = currency
                    if act.get("estimateddurationminutes") is None:
                        act["estimateddurationminutes"] = 90

            # The model often returns one guessed coordinate set for every activity
            # (e.g. the city center). Detect that and geocode each place for real.
            days_list = await ItineraryGenerator._geocode_suspect_coords(days_list, destination, base_lat, base_lng)

            # Every day needs MORE than one place — top up thin days with real spots
            days_list = await ItineraryGenerator._top_up_thin_days(
                days_list, destination, interests, budget, currency
            )

        # No place should repeat anywhere in the trip (unless the same day revisits
        # it) — drop cross-day duplicates so the map and plan stay clean.
        days_list = ItineraryGenerator._dedupe_places(days_list)

        for day in days_list:
            day_cost = sum([float(act.get("estimatedcost") or 0.0) for act in day.get("activities", [])])
            day["estimatedcost"] = round(day_cost, 2)

        return {
            "tripid": None,
            "destination": destination,
            "country": country,
            "startdate": start_date,
            "enddate": end_date,
            "travelercount": travelers,
            "travelertype": traveler_type,
            "interests": interests,
            "days": days_list
        }

    @staticmethod
    async def _get_destination_coords(destination: str) -> tuple:
        geo = await GeocodingService.geocode(destination)
        if geo:
            return geo["lat"], geo["lng"]
        return None, None

    @staticmethod
    async def _geocode_activity(act: Dict[str, Any], destination: str):
        """Geocode an activity with relaxed name fallbacks so compound names
        like 'Colosseum and Roman Forum' still resolve to a real position."""
        name = act.get("name", "")
        candidates = [name]
        # Split compound names: "A and B" -> try "A" first
        split = re.split(r"\s+(?:and|&|plus)\s+", name, flags=re.I)
        if len(split) > 1:
            candidates.append(split[0].strip())
        for cand in candidates:
            if not cand:
                continue
            geo = await GeocodingService.geocode(f"{cand}, {destination}")
            if geo:
                return geo
        return None

    @staticmethod
    async def _geocode_suspect_coords(
        days_list: List[Dict[str, Any]],
        destination: str,
        base_lat: float,
        base_lng: float
    ) -> List[Dict[str, Any]]:
        """When every activity shares the exact same coordinates (a common LLM
        shortcut), geocode each real place individually so the map shows true
        positions instead of one dot for everything."""
        for day in days_list:
            acts = day.get("activities", [])
            unique = {
                (round(a.get("coordinates", {}).get("lat", 0), 4), round(a.get("coordinates", {}).get("lng", 0), 4))
                for a in acts if a.get("coordinates")
            }
            if len(unique) <= 1 and len(acts) > 1:
                for act in acts:
                    geo = await ItineraryGenerator._geocode_activity(act, destination)
                    if geo:
                        act["coordinates"] = {"lat": geo["lat"], "lng": geo["lng"]}
                    elif base_lat is not None:
                        act["coordinates"] = {"lat": base_lat, "lng": base_lng}
        return days_list

    @staticmethod
    def _dedupe_places(days_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove repeated places across different days of the trip. A place may
        appear multiple times within the SAME day (e.g. a morning + evening visit),
        but never again on a later day. Every day keeps at least 2 activities so it
        never becomes empty."""
        seen = set()
        for day in days_list:
            acts = day.get("activities", []) or []
            kept: List[Dict[str, Any]] = []
            day_names: set = set()
            for act in acts:
                name = (act.get("name") or "").strip().lower()
                if not name:
                    kept.append(act)
                    continue
                if name in day_names:
                    kept.append(act)  # same-day repeat is allowed (intentional)
                elif name in seen:
                    continue  # already visited on an earlier day — drop
                else:
                    kept.append(act)
                    day_names.add(name)
            # Never leave a day with fewer than 2 stops: re-admit dropped
            # duplicates (in order) only when strictly needed.
            if len(kept) < 2:
                for act in acts:
                    if len(kept) >= 2:
                        break
                    if act not in kept:
                        kept.append(act)
            day["activities"] = kept
            # Everything seen this day (including same-day repeats) is off-limits
            # for every later day.
            seen.update(day_names)
        return days_list

    @staticmethod
    async def _top_up_thin_days(
        days_list: List[Dict[str, Any]],
        destination: str,
        interests: List[str],
        budget: float,
        currency: str
    ) -> List[Dict[str, Any]]:
        """Guarantee every day has at least 3 activities by appending real,
        verified places from curated data — never fabricated names."""
        if not days_list:
            return days_list

        # Build a pool of real extra places once
        pool = []
        for s in load_curated_spots(destination):
            pool.append({
                "name": s.get("name"),
                "coordinates": {"lat": s.get("lat"), "lng": s.get("lon")},
                "category": "attraction",
                "openinghours": None,
                "description": s.get("description", f"A must-see spot in {destination}.")
            })
        if not pool:
            for s in load_local_fallback_spots(destination, "sightseeing"):
                name = s.get("name")
                if not name:
                    continue
                geo = await GeocodingService.geocode(f"{name}, {destination}")
                if geo:
                    pool.append({
                        "name": name,
                        "coordinates": {"lat": geo["lat"], "lng": geo["lng"]},
                        "category": "attraction",
                        "openinghours": None,
                        "description": f"A popular spot in {destination}."
                    })
        if not pool:
            return days_list

        existing_names = {
            act.get("name", "").strip().lower()
            for day in days_list
            for act in day.get("activities", [])
        }
        slot_pool = ["morning", "afternoon", "evening"]
        fillers = [p for p in pool if p["name"].strip().lower() not in existing_names]
        fill_idx = 0

        for day in days_list:
            acts = day.get("activities", [])
            need = max(0, 3 - len(acts))
            if need <= 0:
                continue
            slot_idx = min(len(acts), len(slot_pool) - 1)
            for _ in range(need):
                if fill_idx >= len(fillers):
                    break  # never repeat a place already used elsewhere in the trip
                src = fillers[fill_idx]
                fill_idx += 1
                existing_names.add(src["name"].strip().lower())
                slot = slot_pool[slot_idx % len(slot_pool)]
                slot_idx += 1
                acts.append({
                    "name": src["name"],
                    "category": src.get("category", "attraction"),
                    "description": src.get("description", f"Explore {src['name']} in {destination}."),
                    "coordinates": src.get("coordinates", {}),
                    "estimateddurationminutes": 90,
                    "estimatedcost": round(budget / max(len(days_list), 1) * 0.07, 2),
                    "currency": currency,
                    "openinghours": src.get("openinghours"),
                    "timeslot": slot
                })
            day["activities"] = acts

        return days_list

    @staticmethod
    async def _generate_fallback_days(
        destination: str,
        start_date: str,
        end_date: str,
        interests: List[str],
        budget: float,
        currency: str
    ) -> List[Dict[str, Any]]:
        
        try:
            sd = datetime.fromisoformat(start_date).date()
            ed = datetime.fromisoformat(end_date).date()
            days_count = max(1, (ed - sd).days + 1)
        except:
            sd = datetime.utcnow().date()
            days_count = 3

        base_lat, base_lng = await ItineraryGenerator._get_destination_coords(destination)

        # --- Gather REAL places (never fabricate names) ---
        places = []
        try:
            if base_lat is not None:
                places = await PlacesService.search_places(base_lat, base_lng, interests)
        except Exception:
            places = []

        if not places:
            # Curated famous spots with exact coordinates (fast, no network)
            for s in load_curated_spots(destination):
                places.append({
                    "name": s.get("name"),
                    "coordinates": {"lat": s.get("lat"), "lng": s.get("lon")},
                    "category": "tourism.attraction",
                    "openinghours": None
                })

        if not places:
            # Local curated fallback: real names from tourist_spots.json
            categories = ["sightseeing", "food_experience", "relaxation"]
            if interests:
                for interest in interests:
                    mapping = {
                        "food": "food_experience",
                        "art": "museum",
                        "history": "museum",
                        "culture": "museum",
                        "nature": "park",
                        "shopping": "shopping",
                        "relaxation": "relaxation",
                        "adventure": "sightseeing",
                        "beaches": "park"
                    }
                    cat = mapping.get(interest.lower())
                    if cat and cat not in categories:
                        categories.append(cat)

            for category in categories:
                spots = load_local_fallback_spots(destination, category)
                for s in spots:
                    name = s.get("name")
                    if not name:
                        continue
                    geo = await GeocodingService.geocode(f"{name}, {destination}")
                    if geo:
                        places.append({
                                "name": name,
                                "coordinates": {"lat": geo["lat"], "lng": geo["lng"]},
                                "category": "tourism.attraction",
                                "openinghours": None
                            })

        if not places and base_lat is not None:
            # OSM fallback with real coordinates
            try:
                hint_categories = ["attraction", "restaurant"]
                for interest in interests:
                    mapping = {"food": "restaurant", "art": "museum", "history": "historic", "nature": "park", "shopping": "shop"}
                    if mapping.get(interest.lower()) not in hint_categories:
                        hint_categories.append(mapping.get(interest.lower()))
                osm_pois = search_pois(base_lat, base_lng, [h for h in hint_categories if h])
                for p in osm_pois[:12]:
                    if p.get("name"):
                        places.append({
                            "name": p["name"],
                            "coordinates": {"lat": p["lat"], "lng": p["lon"]},
                            "category": "tourism.attraction",
                            "openinghours": None
                        })
            except Exception:
                pass

        # Last resort: anchor at destination center with honest labels (no fake landmarks)
        if not places and base_lat is not None:
            places = [
                {
                    "name": f"{destination} City Center",
                    "coordinates": {"lat": base_lat, "lng": base_lng},
                    "category": "tourism.attraction",
                    "openinghours": None
                }
            ]

        days = []
        place_idx = 0
        
        for i in range(days_count):
            day_date = (sd + timedelta(days=i)).isoformat()
            day_activities = []
            
            if not places:
                # Extreme fallback: destination anchor, honest label
                day_activities.append({
                    "name": f"Explore {destination}",
                    "category": "attraction",
                    "description": f"Spend the day discovering {destination}.",
                    "coordinates": {"lat": base_lat or 0.0, "lng": base_lng or 0.0},
                    "estimateddurationminutes": 180,
                    "estimatedcost": round(budget / max(days_count, 1) * 0.12, 2),
                    "currency": currency,
                    "openinghours": None,
                    "bookingnotes": None
                })
            else:
                p_morning = places[place_idx % len(places)]
                day_activities.append({
                    "name": p_morning["name"],
                    "category": "attraction",
                    "description": f"Explore the beautiful {p_morning['name']}.",
                    "coordinates": p_morning["coordinates"],
                    "estimateddurationminutes": 120,
                    "estimatedcost": round(budget / max(days_count, 1) * 0.08, 2),
                    "currency": currency,
                    "openinghours": p_morning.get("openinghours"),
                    "bookingnotes": None
                })
                place_idx += 1

                p_lunch = places[place_idx % len(places)]
                day_activities.append({
                    "name": f"Lunch near {p_lunch['name']}",
                    "category": "restaurant",
                    "description": "Stop by a local dining spot for lunch.",
                    "coordinates": p_lunch["coordinates"],
                    "estimateddurationminutes": 60,
                    "estimatedcost": round(budget / max(days_count, 1) * 0.1, 2),
                    "currency": currency,
                    "openinghours": None,
                    "bookingnotes": None
                })
                place_idx += 1

                p_afternoon = places[place_idx % len(places)]
                day_activities.append({
                    "name": p_afternoon["name"],
                    "category": "attraction",
                    "description": f"Visit {p_afternoon['name']}.",
                    "coordinates": p_afternoon["coordinates"],
                    "estimateddurationminutes": 120,
                    "estimatedcost": round(budget / max(days_count, 1) * 0.08, 2),
                    "currency": currency,
                    "openinghours": p_afternoon.get("openinghours"),
                    "bookingnotes": None
                })
                place_idx += 1

            days.append({
                "day": i + 1,
                "date": day_date,
                "theme": f"Discovering {destination} Day {i + 1}",
                "activities": day_activities
            })

        return days

generate_itinerary = ItineraryGenerator.generate_itinerary

