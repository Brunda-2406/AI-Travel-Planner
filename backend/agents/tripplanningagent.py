import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("trip_planning_agent")
from ..ai.ollamaclient import OllamaClient
from ..ai.promptregistry import PROMPTS
from ..ai.structuredparser import merge_entities_safely
from ..services.itinerary.generator import generate_itinerary, ItineraryGenerator
from ..services.routeoptimizer.optimizer import RouteOptimizer
from ..services.budget.budgetscorer import BudgetScorer
from ..services.weather.weatherservice import WeatherService
from ..services.maps.routing import RoutingService

REQUIREDTRIPFIELDS = [
    "destination",
    "country",
    "startdate",
    "enddate",
    "travelercount",
    "travelertype",
    "budget",
    "currency",
    "interests"
]

FRIENDLY_FIELD_LABELS = {
    "destination": "the destination (e.g. Paris)",
    "country": "the country (e.g. France)",
    "startdate": "the start date (YYYY-MM-DD)",
    "enddate": "the end date (YYYY-MM-DD)",
    "travelercount": "how many travelers (e.g. 2)",
    "travelertype": "the trip type (solo, couple, family, group)",
    "budget": "your budget (e.g. 2000)",
    "currency": "the currency (USD, EUR, GBP, INR...)",
    "interests": "your interests (e.g. food, art, nature, history)"
}

class TripPlanningAgent:
    @staticmethod
    def get_missing_fields(entities: Dict[str, Any]) -> List[str]:
        missing = []
        for field in REQUIREDTRIPFIELDS:
            val = entities.get(field)
            if val is None or val == "" or val == []:
                missing.append(field)
        return missing

    @staticmethod
    def _build_single_shot_question(missing: List[str], entities: Dict[str, Any]) -> str:
        """Deterministic question asking for ALL missing details in one message."""
        known = {k: v for k, v in entities.items() if v not in (None, "", [])}
        known_str = ", ".join([f"{k}: {v}" for k, v in known.items()]) or "nothing yet"
        lines = "\n".join([f"• {FRIENDLY_FIELD_LABELS.get(f, f)} -- currently missing" for f in missing])
        return (
            f"Awesome, I have {known_str}. To craft your perfect itinerary I just need a few more "
            f"details — please share them all in one message:\n\n{lines}\n\n"
            f"Tip: reply like this — '2 travelers, couple, 2000 USD, from 2026-09-01 to 2026-09-05, "
            f"love food and art'. 😊"
        )

    @staticmethod
    async def handle_conversation(session_state: Dict[str, Any], new_entities: Dict[str, Any], message: str) -> Dict[str, Any]:
        if "entities" not in session_state:
            session_state["entities"] = {f: None for f in REQUIREDTRIPFIELDS}
            session_state["entities"]["interests"] = []

        # Merge and support corrections — but NEVER clobber a field the user did
        # not mention this turn. This is what keeps a chosen currency locked
        # (e.g. INR) instead of silently falling back to the parser's USD default.
        session_state["entities"] = merge_entities_safely(
            session_state["entities"],
            new_entities,
            message
        )

        # Missing required details
        missing = TripPlanningAgent.get_missing_fields(session_state["entities"])
        
        if missing:
            question = TripPlanningAgent._build_single_shot_question(missing, session_state["entities"])
            return {
                "status": "needsmoreinfo",
                "missingfields": missing,
                "question": question,
                "planningstate": session_state
            }
        else:
            trip_data = await TripPlanningAgent.generate_trip(session_state["entities"])
            return {
                "status": "success",
                "trip": trip_data["itinerary"],
                "budget": trip_data["budget_info"],
                "routesummary": trip_data["route_summary"]
            }

    @staticmethod
    async def generate_trip(entities: Dict[str, Any]) -> Dict[str, Any]:
        destination = entities.get("destination")
        country = entities.get("country")
        start_date = entities.get("startdate")
        end_date = entities.get("enddate")
        interests = entities.get("interests", [])
        budget = float(entities.get("budget", 1000.0))
        currency = entities.get("currency", "USD")
        travelers = int(entities.get("travelercount", 1))
        traveler_type = entities.get("travelertype", "solo")

        # 1. Generate Itinerary
        raw_itinerary = await generate_itinerary(
            destination=destination,
            country=country,
            start_date=start_date,
            end_date=end_date,
            interests=interests,
            budget=budget,
            currency=currency,
            travelers=travelers,
            traveler_type=traveler_type
        )

        # 2. Heuristically Optimize Routes per day (real coordinates)
        for day in raw_itinerary.get("days", []):
            activities = day.get("activities", [])
            day["activities"] = RouteOptimizer.optimize(activities)
            day["route"] = [{"lat": act["coordinates"]["lat"], "lng": act["coordinates"]["lng"], "label": act["name"]} for act in day["activities"]]
            total_distance = sum([float(act.get("traveltonext", {}).get("distancekm", 0.0) or 0.0) for act in day["activities"]])
            day["route_distance_km"] = round(total_distance, 2)
            # 2b. Real road routing (Google-Maps-style) — road geometry + accurate legs
            try:
                day = await RoutingService.enrich_day_route(day)
            except Exception as e:
                logger.warning(f"OSRM enrichment failed for day {day.get('day')}: {e}")

        # 3. Budget Scoring
        days_count = len(raw_itinerary.get("days", []))
        budget_info = BudgetScorer.score(
            budget=budget,
            currency=currency,
            days=days_count,
            travelers=travelers,
            destination=destination
        )

        # 4. Attach Weather using REAL destination coordinates
        lat, lng = await ItineraryGenerator._get_destination_coords(destination)
        if lat is None:
            lat, lng = 0.0, 0.0
        for day in raw_itinerary.get("days", []):
            day_date = day.get("date")
            day["weather"] = await WeatherService.get_weather_for_date(destination, lat, lng, day_date)

        route_summary = {
            "total_distance_km": round(sum([day.get("route_distance_km", 0.0) for day in raw_itinerary.get("days", [])]), 2),
            "optimized": True,
            "routing_method": "Heuristic nearest-neighbor with time windows"
        }

        return {
            "itinerary": raw_itinerary,
            "budget_info": budget_info,
            "route_summary": route_summary
        }
