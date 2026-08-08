import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List
from ...ai.ollamaclient import OllamaClient
from ...ai.promptregistry import PROMPTS
from ...services.routeoptimizer.optimizer import RouteOptimizer
from ...services.maps.geocoding import GeocodingService
from ...services.currency import to_usd_sync, from_usd_sync
from ...services.budget.budgetscorer import BudgetScorer
from ...api.osm_service import load_local_fallback_spots
from ...services.recommendation import load_curated_spots

_COMMON_CURRENCIES = {"USD", "EUR", "GBP", "INR", "JPY", "CNY", "AUD", "CAD", "CHF",
                      "SGD", "NZD", "KRW", "THB", "AED", "MYR", "IDR", "PHP", "VND",
                      "HKD", "BRL", "MXN", "ZAR", "TRY", "RUB", "SAR", "QAR", "PKR",
                      "BDT", "LKR", "NPR", "EGP", "KES", "NGN"}


class ItineraryEditor:
    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------
    @staticmethod
    def _rule_based_parse(message: str) -> Dict[str, Any]:
        """Deterministic fallback so common edits work even if the local LLM is unavailable."""
        msg = message.lower().strip()
        op: Dict[str, Any] = {}

        # Destination change: "change destination to X", "move the trip to X"
        m = re.search(r"(?:change|switch|move)\s+(?:the\s+)?(?:destination|location|trip|place)\s+(?:to|and go to)\s+(.+)", msg)
        if m:
            target = m.group(1).strip(" .!,?")
            if target and not re.search(r"\d{4}-\d{2}-\d{2}", target) and len(target) > 2:
                return {"operation": "updatedestination", "destination": target.title()}

        # Budget change: "budget to 5000", "increase the budget", "raise the budget to X"
        m = re.search(r"(?:budget|amount|spend).{0,14}?(\d[\d,]*)", msg)
        if m:
            return {"operation": "updatebudget", "budget": float(m.group(1).replace(",", ""))}

        # Currency change: "change the currency to usd"
        m = re.search(r"currency.{0,14}?([a-z]{3})", msg)
        if m and m.group(1).upper() in _COMMON_CURRENCIES:
            return {"operation": "updatecurrency", "currency": m.group(1).upper()}

        # Dates: "2026-09-10 to 2026-09-14" or a single explicit date
        dates = re.findall(r"\d{4}-\d{2}-\d{2}", message)
        if dates:
            op = {"operation": "updatedates"}
            if len(dates) >= 2:
                op["startdate"] = dates[0]
                op["enddate"] = dates[1]
            else:
                op["startdate"] = dates[0]
            return op

        # Duration: "make the trip 8 days", "change the duration to 7 days", "8 days"
        m = re.search(
            r"(?:change|make|set|extend|reduce|increase|decrease)?\s*(?:the\s+)?(?:trip|duration|length)\s*(?:to|of|=)?\s*(\d+)\s*days?\b"
            r"|(\d+)\s*days?\b",
            msg
        )
        if m and not re.search(r"\bday\s*\d+\b", msg):
            count = int(m.group(1) or m.group(2))
            if 1 <= count <= 60:
                return {"operation": "updatedates", "days": count}

        # Travelers: "3 travelers", "4 people", "for 5", "make it 4"
        m = re.search(
            r"(?:travelers?|travellers?|passengers?|people|pax|guests?)\D{0,10}?(\d+)"
            r"|(\d+)\s*(?:travelers?|travellers?|passengers?|people|pax|guests?)",
            msg
        )
        if m:
            count = int(m.group(1) or m.group(2))
            if count > 0:
                return {"operation": "updatetravelers", "travelercount": count}

        # Remove a day: "remove day 3"
        m = re.search(r"(?:remove|delete|drop|skip)\s+day\s+(\d+)", msg)
        if m:
            return {"operation": "removeday", "day": int(m.group(1))}

        # Remove an activity by name: "remove the fort aguada", "delete the museum"
        m = re.search(r"(?:remove|delete|drop|skip|take out)\s+(?:the\s+|a\s+|an\s+)?(.+)", msg)
        if m:
            target = m.group(1).strip(" .!,?")
            if target and len(target) > 2 and not re.match(r"^(day\s*\d+|this|that|it)$", target):
                return {"operation": "removeactivity", "target": target}

        return {}

    @staticmethod
    async def parse_edit_query(message: str) -> Dict[str, Any]:
        prompt = PROMPTS["chateditparse"].format(message=message)
        try:
            res = OllamaClient.call_ollama(prompt)
        except Exception:
            res = ""
        if res:
            try:
                m = re.search(r"\{.*\}", res, re.S)
                if m:
                    parsed = json.loads(m.group(0))
                    if parsed.get("operation"):
                        return parsed
            except Exception:
                pass
        return ItineraryEditor._rule_based_parse(message)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _get_budget(itinerary: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize the budget slot to a dict with totalbudget + currency."""
        b = itinerary.get("budget")
        if isinstance(b, dict):
            total = b.get("totalbudget") or b.get("budget") or 0.0
            currency = b.get("currency") or itinerary.get("currency") or "USD"
            return {"totalbudget": float(total), "currency": str(currency).upper()}
        return {"totalbudget": float(b or 0.0), "currency": str(itinerary.get("currency") or "USD").upper()}

    @staticmethod
    def _rescore(itinerary: Dict[str, Any]) -> Dict[str, Any]:
        budget = ItineraryEditor._get_budget(itinerary)
        return BudgetScorer.score(
            budget=budget["totalbudget"],
            currency=budget["currency"],
            days=len(itinerary.get("days", [])),
            travelers=int(itinerary.get("travelercount") or 1),
            destination=itinerary.get("destination") or ""
        )

    @staticmethod
    async def _geocode_or_fallback(name: str, dest: str) -> Dict[str, float]:
        """Geocode a place; if it fails, fall back to the destination center so
        the stop stays on the map and a route can still be computed (instead of
        a 0,0 point in the ocean that breaks the whole day's route)."""
        geo = await GeocodingService.geocode(f"{name} in {dest}")
        if geo:
            return {"lat": geo["lat"], "lng": geo["lng"]}
        if dest:
            try:
                dgeo = await GeocodingService.geocode(dest)
                if dgeo:
                    return {"lat": dgeo["lat"], "lng": dgeo["lng"]}
            except Exception:
                pass
        return {"lat": 0.0, "lng": 0.0}

    @staticmethod
    def _build_activity(name: str, dest: str, itinerary: Dict[str, Any],
                        geo: Dict[str, float], timeslot: str) -> Dict[str, Any]:
        return {
            "name": name,
            "category": "attraction",
            "description": f"Visit the iconic {name}.",
            "coordinates": {"lat": geo.get("lat", 0.0), "lng": geo.get("lng", 0.0)},
            "estimateddurationminutes": 90,
            "estimatedcost": 15.00,
            "currency": ItineraryEditor._get_budget(itinerary)["currency"],
            "openinghours": None,
            "bookingnotes": None,
            "timeslot": timeslot
        }

    @staticmethod
    async def _refresh_day(day: Dict[str, Any]) -> Dict[str, Any]:
        """Re-optimize a day's stops and re-route on real roads."""
        day["activities"] = RouteOptimizer.optimize(day.get("activities", []))
        day["route"] = [{"lat": a["coordinates"]["lat"], "lng": a["coordinates"]["lng"], "label": a["name"]} for a in day["activities"]]
        day["estimatedcost"] = round(sum([float(a.get("estimatedcost", 0.0)) for a in day["activities"]]), 2)
        try:
            from ..services.maps.routing import RoutingService
            day = await RoutingService.enrich_day_route(day)
        except Exception:
            pass
        return day

    @staticmethod
    async def _add_missing_days(days: List[Dict[str, Any]], new_start, target_count: int,
                                destination: str, interests: List[str], budget: float,
                                currency: str) -> int:
        """Build brand-new days (with real, non-fabricated activities) so the trip
        matches a longer date span requested through the chat editor."""
        # Pool of real places, built once — exact-coordinate curated spots first,
        # then local fallback spots (geocoded), mirroring the generator.
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
                try:
                    geo = await GeocodingService.geocode(f"{name}, {destination}")
                except Exception:
                    geo = None
                if geo:
                    pool.append({
                        "name": name,
                        "coordinates": {"lat": geo["lat"], "lng": geo["lng"]},
                        "category": "attraction",
                        "openinghours": None,
                        "description": f"A popular spot in {destination}."
                    })
        if not pool:
            try:
                base = await GeocodingService.geocode(destination)
            except Exception:
                base = None
            if base:
                pool.append({
                    "name": f"{destination} City Center",
                    "coordinates": {"lat": base["lat"], "lng": base["lng"]},
                    "category": "attraction",
                    "openinghours": None,
                    "description": f"Spend the day exploring {destination}."
                })

        existing_names = {
            act.get("name", "").strip().lower()
            for day in days
            for act in day.get("activities", [])
        }
        fillers = [p for p in pool if p["name"].strip().lower() not in existing_names] or pool
        slots = ["morning", "afternoon", "evening"]
        added = 0
        for i in range(len(days), target_count):
            day_date = (new_start + timedelta(days=i)).isoformat()
            acts = []
            for slot_idx in range(3):
                src = fillers[(i * 3 + slot_idx) % len(fillers)]
                name = src["name"].strip()
                acts.append({
                    "name": name,
                    "category": src.get("category", "attraction"),
                    "description": src.get("description", f"Explore {name} in {destination}."),
                    "coordinates": src.get("coordinates", {}),
                    "estimateddurationminutes": 90,
                    "estimatedcost": round(budget / max(target_count, 1) * 0.07, 2),
                    "currency": currency,
                    "openinghours": src.get("openinghours"),
                    "timeslot": slots[slot_idx % len(slots)]
                })
            days.append({
                "day": i + 1,
                "date": day_date,
                "theme": f"Discovering {destination} Day {i + 1}",
                "activities": acts,
                "estimatedcost": round(sum([float(a.get("estimatedcost", 0.0)) for a in acts]), 2)
            })
            added += 1
        return added

    @staticmethod
    def _find_day(days: List[Dict[str, Any]], day_num) -> Dict[str, Any]:
        try:
            idx = int(day_num) - 1
        except (TypeError, ValueError):
            return None
        if 0 <= idx < len(days):
            return days[idx]
        return None

    # ------------------------------------------------------------------
    # Applying edits
    # ------------------------------------------------------------------
    @staticmethod
    async def apply_edit(itinerary: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
        op = operation or {}
        op_type = op.get("operation")
        summary: List[str] = []
        days = itinerary.get("days", [])
        dest = itinerary.get("destination") or ""

        # ----- Activity add / replace -----
        if op_type in ("addactivity", "replaceactivity"):
            target_day = ItineraryEditor._find_day(days, op.get("day"))
            target = op.get("target")
            timeslot = op.get("timeslot", "morning")
            if target_day and target:
                geo = await ItineraryEditor._geocode_or_fallback(target, dest)
                new_act = ItineraryEditor._build_activity(target, dest, itinerary, geo, timeslot)
                acts = target_day.get("activities", [])
                if op_type == "replaceactivity":
                    replaced = False
                    for i, act in enumerate(acts):
                        if act.get("timeslot") == timeslot:
                            acts[i] = new_act
                            replaced = True
                            break
                    if not replaced:
                        acts.append(new_act)
                    summary.append(f"Replaced Day {op.get('day')} {timeslot} with {target}.")
                else:
                    acts.append(new_act)
                    summary.append(f"Added {target} to Day {op.get('day')} ({timeslot}).")
                target_day["activities"] = acts
                await ItineraryEditor._refresh_day(target_day)
            elif not target:
                summary.append("Which place would you like to add or swap in?")
            else:
                summary.append(f"Day {op.get('day')} wasn't found — the trip has {len(days)} day(s).")

        # ----- Remove an activity (by name, or by time slot) -----
        elif op_type == "removeactivity":
            target_day = ItineraryEditor._find_day(days, op.get("day"))
            target = op.get("target")
            timeslot = op.get("timeslot")
            if target_day:
                acts = target_day.get("activities", [])
                removed = []
                if target:
                    tl = target.lower()
                    kept = [a for a in acts if tl not in str(a.get("name", "")).lower()]
                    removed = [a for a in acts if tl in str(a.get("name", "")).lower()]
                    if not removed and timeslot:
                        removed = [a for a in acts if a.get("timeslot") == timeslot]
                        kept = [a for a in acts if a.get("timeslot") != timeslot]
                    target_day["activities"] = kept
                elif timeslot:
                    removed = [a for a in acts if a.get("timeslot") == timeslot]
                    target_day["activities"] = [a for a in acts if a.get("timeslot") != timeslot]
                if removed:
                    names = ", ".join(a.get("name", "stop") for a in removed)
                    summary.append(f"Removed {names} from Day {op.get('day')}.")
                    await ItineraryEditor._refresh_day(target_day)
                else:
                    summary.append(f"Couldn't find that stop on Day {op.get('day')} — nothing was removed.")
            else:
                summary.append(f"Day {op.get('day')} wasn't found.")

        # ----- Move an activity between days / slots -----
        elif op_type == "moveactivity":
            from_day = ItineraryEditor._find_day(days, op.get("fromday") or op.get("day"))
            to_day = ItineraryEditor._find_day(days, op.get("day") or op.get("fromday"))
            target = op.get("target")
            from_ts = op.get("fromtimeslot")
            to_ts = op.get("timeslot", "morning")
            if from_day is not None and to_day is not None:
                acts = from_day.get("activities", [])
                moved = None
                if target:
                    tl = target.lower()
                    moved = next((a for a in acts if tl in str(a.get("name", "")).lower()), None)
                if moved is None and from_ts:
                    moved = next((a for a in acts if a.get("timeslot") == from_ts), None)
                if moved:
                    from_day["activities"] = [a for a in acts if a is not moved]
                    moved["timeslot"] = to_ts
                    to_acts = to_day.setdefault("activities", [])
                    position = op.get("position")
                    if position is not None and 0 <= int(position) < len(to_acts):
                        to_acts.insert(int(position), moved)
                    else:
                        to_acts.append(moved)
                    await ItineraryEditor._refresh_day(from_day)
                    if from_day is not to_day:
                        await ItineraryEditor._refresh_day(to_day)
                    summary.append(f"Moved {moved['name']} to Day {to_day.get('day')} ({to_ts}).")
                else:
                    summary.append("Couldn't find the activity to move.")
            else:
                summary.append("Couldn't find the days for that move.")

        # ----- Remove an entire day -----
        elif op_type == "removeday":
            target_day = ItineraryEditor._find_day(days, op.get("day"))
            if target_day is not None:
                removed_label = target_day.get("theme") or "full day"
                days.remove(target_day)
                for i, d in enumerate(days):
                    d["day"] = i + 1
                itinerary["budget"] = ItineraryEditor._rescore(itinerary)
                summary.append(f"Removed Day {op.get('day')} ({removed_label}). The trip now has {len(days)} day(s).")
            else:
                summary.append(f"Day {op.get('day')} wasn't found — nothing was removed.")

        # ----- Budget change -----
        elif op_type == "updatebudget":
            budget_val = op.get("budget")
            if budget_val is not None:
                try:
                    budget = ItineraryEditor._get_budget(itinerary)
                    budget["totalbudget"] = round(float(budget_val), 2)
                    itinerary["budget"] = budget
                    itinerary["budget"] = ItineraryEditor._rescore(itinerary)
                    summary.append(f"Budget updated to {budget['currency']} {budget['totalbudget']:,.2f} for the whole trip.")
                except (TypeError, ValueError):
                    summary.append("Couldn't read the new budget amount.")
            else:
                summary.append("How much would you like the budget to be?")

        # ----- Currency change (convert every price) -----
        elif op_type == "updatecurrency":
            new_cur = str(op.get("currency") or "").upper().strip()
            if new_cur and len(new_cur) == 3 and new_cur.isalpha():
                budget = ItineraryEditor._get_budget(itinerary)
                old_cur = budget["currency"]
                if old_cur != new_cur:
                    for day in days:
                        for act in day.get("activities", []):
                            cost = act.get("estimatedcost")
                            if cost:
                                usd = to_usd_sync(float(cost), old_cur)
                                act["estimatedcost"] = round(from_usd_sync(usd, new_cur), 2)
                            act["currency"] = new_cur
                        day["estimatedcost"] = round(sum([float(a.get("estimatedcost", 0.0)) for a in day.get("activities", [])]), 2)
                    new_total = round(from_usd_sync(to_usd_sync(budget["totalbudget"], old_cur), new_cur), 2)
                    budget["totalbudget"] = new_total
                    budget["currency"] = new_cur
                    itinerary["budget"] = budget
                    itinerary["budget"] = ItineraryEditor._rescore(itinerary)
                    summary.append(f"Converted all prices and the budget from {old_cur} to {new_cur}.")
                else:
                    summary.append(f"The trip is already in {new_cur}.")
            else:
                summary.append("Couldn't read the new currency code (e.g. USD, INR, EUR).")

        # ----- Dates change (resizes the trip to match the new span) -----
        elif op_type == "updatedates":
            start = op.get("startdate")
            end = op.get("enddate")
            days_count = op.get("days")
            current_start = None
            try:
                current_start = datetime.strptime(str(itinerary.get("startdate"))[:10], "%Y-%m-%d").date()
            except Exception:
                pass

            new_start = None
            new_end = None
            if start:
                try:
                    new_start = datetime.strptime(str(start)[:10], "%Y-%m-%d").date()
                except ValueError:
                    summary.append("Couldn't parse the new start date (use YYYY-MM-DD).")
            elif current_start:
                new_start = current_start
            if end:
                try:
                    new_end = datetime.strptime(str(end)[:10], "%Y-%m-%d").date()
                except ValueError:
                    summary.append("Couldn't parse the new end date (use YYYY-MM-DD).")
            # "8 days" style requests → derive the end date from the start
            if new_start and days_count:
                try:
                    new_end = new_start + timedelta(days=max(1, int(days_count)) - 1)
                except (TypeError, ValueError):
                    pass
            if new_start and new_end and new_end < new_start:
                new_end = new_start

            if new_start:
                itinerary["startdate"] = new_start.isoformat()
                summary.append(f"Trip now starts {new_start.isoformat()}.")
            if new_end:
                itinerary["enddate"] = new_end.isoformat()
                summary.append(f"Trip now ends {new_end.isoformat()}.")

            if new_start and new_end:
                target_count = (new_end - new_start).days + 1
                # Shorter trip → trim days from the end
                if len(days) > target_count:
                    removed = len(days) - target_count
                    del days[target_count:]
                    summary.append(f"Removed {removed} day(s) to fit the new dates.")
                # Longer trip → add brand-new days with real activities
                if len(days) < target_count:
                    budget_meta = ItineraryEditor._get_budget(itinerary)
                    added = await ItineraryEditor._add_missing_days(
                        days=days,
                        new_start=new_start,
                        target_count=target_count,
                        destination=dest,
                        interests=itinerary.get("interests") or [],
                        budget=budget_meta["totalbudget"],
                        currency=budget_meta["currency"]
                    )
                    if added:
                        summary.append(f"Added {added} new day(s) to the trip.")
                # Re-number + re-date every day, then re-score the budget
                for i, day in enumerate(days):
                    day["day"] = i + 1
                    day["date"] = (new_start + timedelta(days=i)).isoformat()
                itinerary["budget"] = ItineraryEditor._rescore(itinerary)
            elif not start and not end and not days_count:
                summary.append("Which dates would you like? (e.g. change the dates to 2026-09-10 to 2026-09-14)")

        # ----- Travelers change -----
        elif op_type == "updatetravelers":
            tc = op.get("travelercount")
            if tc is not None:
                try:
                    tc_int = int(tc)
                    if tc_int > 0:
                        itinerary["travelercount"] = tc_int
                        itinerary["budget"] = ItineraryEditor._rescore(itinerary)
                        summary.append(f"Travelers updated to {tc_int} — the budget was re-scored.")
                    else:
                        summary.append("Traveler count must be at least 1.")
                except (TypeError, ValueError):
                    summary.append("Couldn't read the new traveler count.")
            else:
                summary.append("How many travelers should the trip be for?")

        # ----- Destination change is handled by re-planning in the router -----
        elif op_type == "updatedestination":
            summary.append("Changing the destination means planning a brand-new trip — I'll re-plan it for you.")

        else:
            summary.append("I didn't recognize that edit — try 'increase the budget to 5000', 'remove day 3', or 'add X to day 2'.")

        itinerary["total_estimated_cost"] = round(sum([d.get("estimatedcost", 0.0) for d in days]), 2)
        itinerary["_edit_summary"] = summary
        return itinerary
