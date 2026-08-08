import datetime
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.generateschemas import GenerateRequest
from ..schemas.chatschemas import ChatEditRequest
from ..schemas.tripschemas import TripUpdateDayRequest
from ..ai.intentengine import TravelIntentEngine, REQUIREDTRIPFIELDS
from ..ai.structuredparser import clean_extracted_entities, merge_entities_safely
from ..agents.travelassistantagent import TravelAssistantAgent
from ..agents.tripplanningagent import TripPlanningAgent
from ..services.itinerary.editor import ItineraryEditor
from ..services.routeoptimizer.optimizer import RouteOptimizer
from ..services.recommendation import RecommendationService
from ..services.maps.geocoding import GeocodingService
from ..services.maps.routing import RoutingService
from ..dependencies import get_current_user
from ..models.trip import Trip
from ..models.tripday import TripDay
from ..models.activity import Activity
from ..models.budget import Budget

router = APIRouter(tags=["AI Generation & Editing"])

def _sync_trip_meta(trip: Trip, updated: Dict[str, Any], db: Session) -> None:
    """Persist trip-level fields (destination, dates, travelers, budget) after an edit."""
    if updated.get("destination"):
        trip.destination = updated["destination"]
    if updated.get("country"):
        trip.country = updated["country"]
    if updated.get("startdate"):
        try:
            trip.startdate = datetime.date.fromisoformat(str(updated["startdate"])[:10])
        except ValueError:
            pass
    if updated.get("enddate"):
        try:
            trip.enddate = datetime.date.fromisoformat(str(updated["enddate"])[:10])
        except ValueError:
            pass
    if updated.get("travelercount"):
        try:
            trip.travelercount = int(updated["travelercount"])
        except (TypeError, ValueError):
            pass
    if updated.get("travelertype"):
        trip.travelertype = updated["travelertype"]
    budget_data = updated.get("budget")
    if trip.budget_info and isinstance(budget_data, dict):
        trip.budget_info.totalbudget = float(budget_data.get("totalbudget") or trip.budget_info.totalbudget)
        trip.budget_info.currency = budget_data.get("currency") or trip.budget_info.currency
        trip.budget_info.total_score = budget_data.get("score", trip.budget_info.total_score)
        trip.budget_info.comfort_level = budget_data.get("comfortlevel", trip.budget_info.comfort_level)
        trip.budget_info.allocationjson = budget_data.get("allocation")
        trip.budget_info.warningsjson = budget_data.get("warnings", [])
    db.commit()


def _sync_trip_days(trip: Trip, updated: Dict[str, Any], db: Session) -> None:
    """Replace a trip's day rows to match the updated itinerary — used when a
    date change added or removed days so the saved trip matches what the map and
    budget now show."""
    for old_day in list(trip.days):
        db.delete(old_day)
    db.commit()

    for day in updated.get("days", []):
        route_payload = day.get("route")
        if day.get("route_geometry"):
            route_payload = {
                "points": day.get("route") or [],
                "geometry": day.get("route_geometry"),
                "alternative": day.get("route_alternative", []),
                "distance_km": day.get("route_distance_km"),
                "duration_min": day.get("route_duration_min")
            }
        new_day = TripDay(
            tripid=trip.id,
            day_number=day["day"],
            date=datetime.date.fromisoformat(str(day["date"])[:10]),
            theme=day.get("theme", ""),
            estimated_cost=day.get("estimatedcost", 0.0),
            weatherjson=day.get("weather"),
            routejson=route_payload
        )
        db.add(new_day)
        db.commit()
        db.refresh(new_day)
        for idx, act in enumerate(day.get("activities", [])):
            db.add(Activity(
                tripdayid=new_day.id,
                time_slot=act.get("timeslot", "morning"),
                name=act["name"],
                category=act.get("category", "attraction"),
                description=act.get("description", ""),
                latitude=act["coordinates"]["lat"],
                longitude=act["coordinates"]["lng"],
                durationminutes=act.get("estimateddurationminutes", 90),
                estimatedcost=act.get("estimatedcost", 0.0),
                openinghours=act.get("openinghours"),
                bookingnotes=act.get("bookingnotes"),
                sequenceorder=idx,
                traveltonextjson=act.get("traveltonext")
            ))
        db.commit()

class RecommendRequest(BaseModel):
    destination: str
    interests: Optional[List[str]] = []
    count: Optional[int] = 24
    currency: Optional[str] = "USD"

class AddPlaceRequest(BaseModel):
    tripid: Optional[int] = None
    itinerary: Optional[Dict[str, Any]] = None
    day: int
    place: Dict[str, Any]

@router.post("/recommend")
async def recommend_places(req: RecommendRequest):
    places = await RecommendationService.recommend(
        req.destination, req.interests or [], req.count or 24, currency=req.currency or "USD"
    )
    return {"status": "success", "places": places, "currency": req.currency or "USD"}

@router.post("/add-place")
async def add_place(req: AddPlaceRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Add a real place to a day of the itinerary and re-optimize the route."""
    itinerary = None
    trip = None

    if req.tripid:
        trip = db.query(Trip).filter(Trip.id == req.tripid).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.userid != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this trip.")
        from .triprouter import get_trip_details
        itinerary = get_trip_details(trip)
    elif req.itinerary:
        itinerary = req.itinerary
    else:
        raise HTTPException(status_code=400, detail="Provide tripid or itinerary")

    days = itinerary.get("days", [])
    if req.day < 1 or req.day > len(days):
        raise HTTPException(status_code=400, detail="Invalid day")

    day_data = days[req.day - 1]
    place = req.place
    name = place.get("name") or place.get("label")
    if not name:
        raise HTTPException(status_code=400, detail="Place name is required")

    coords = place.get("coordinates")
    if not coords or coords.get("lat") is None:
        from ..services.maps.geocoding import GeocodingService
        geo = await GeocodingService.geocode(f"{name}, {itinerary.get('destination', '')}")
        if geo:
            coords = {"lat": geo["lat"], "lng": geo["lng"]}
        elif itinerary.get("destination"):
            # Fall back to the destination center so the stop stays on the map
            # instead of landing at 0,0 and breaking the day's route.
            dgeo = await GeocodingService.geocode(itinerary["destination"])
            coords = {"lat": dgeo["lat"], "lng": dgeo["lng"]} if dgeo else {"lat": 0.0, "lng": 0.0}
        else:
            coords = {"lat": 0.0, "lng": 0.0}

    # Recalculate road routes for every day so the map instantly reflects the
    # new stop (and backfills any day that never got geometry).
    try:
        itinerary = await RoutingService.enrich_trip_days(itinerary)
    except Exception:
        pass

    budget_meta = itinerary.get("budget")
    trip_currency = budget_meta.get("currency") if isinstance(budget_meta, dict) else None

    trip_currency = trip_currency or "USD"
    new_activity = {
        "name": name,
        "category": place.get("category", "attraction"),
        "description": place.get("description", f"Added stop: {name}."),
        "coordinates": coords,
        "estimateddurationminutes": place.get("estimateddurationminutes", 90),
        # /recommend already returns costs in the trip currency
        "estimatedcost": round(float(place.get("estimatedcost") or 10.0), 2),
        "currency": trip_currency,
        "openinghours": place.get("openinghours"),
        "bookingnotes": place.get("bookingnotes"),
        "timeslot": place.get("timeslot") or "afternoon"
    }

    activities = day_data.get("activities", [])
    activities.append(new_activity)
    optimized = RouteOptimizer.optimize(activities)
    day_data["activities"] = optimized
    day_data["route"] = [{"lat": a["coordinates"]["lat"], "lng": a["coordinates"]["lng"], "label": a["name"]} for a in optimized]
    day_data["estimatedcost"] = round(sum([float(a.get("estimatedcost", 0.0)) for a in optimized]), 2)
    # Re-route on real roads so the map + guidance update instantly
    try:
        from ..services.maps.routing import RoutingService
        day_data = await RoutingService.enrich_day_route(day_data)
    except Exception:
        pass
    itinerary["total_estimated_cost"] = round(sum([d.get("estimatedcost", 0.0) for d in days]), 2)

    # Persist to DB when the trip is saved
    if trip:
        target_day = sorted(trip.days, key=lambda d: d.day_number)[req.day - 1]
        db.query(Activity).filter(Activity.tripdayid == target_day.id).delete()
        db.commit()
        target_day.estimated_cost = day_data["estimatedcost"]
        route_payload = day_data.get("route")
        if day_data.get("route_geometry"):
            route_payload = {
                "points": day_data.get("route") or [],
                "geometry": day_data.get("route_geometry"),
                "alternative": day_data.get("route_alternative", []),
                "distance_km": day_data.get("route_distance_km"),
                "duration_min": day_data.get("route_duration_min")
            }
        target_day.routejson = route_payload
        db.commit()

        for idx, act in enumerate(optimized):
            new_act = Activity(
                tripdayid=target_day.id,
                time_slot=act.get("timeslot", "morning"),
                name=act["name"],
                category=act.get("category", "attraction"),
                description=act.get("description", ""),
                latitude=act["coordinates"]["lat"],
                longitude=act["coordinates"]["lng"],
                durationminutes=act.get("estimateddurationminutes", 90),
                estimatedcost=act.get("estimatedcost", 0.0),
                openinghours=act.get("openinghours"),
                bookingnotes=act.get("bookingnotes"),
                sequenceorder=idx,
                traveltonextjson=act.get("traveltonext")
            )
            db.add(new_act)
        db.commit()

        from .triprouter import get_trip_details
        itinerary = get_trip_details(trip)

    return {
        "status": "success",
        "intent": "addplace",
        "trip": itinerary,
        "answer": f"Added {name} to Day {req.day}! 🎉 The route has been re-optimized."
    }

@router.post("/generate")
async def generate(req: GenerateRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session_id = req.sessionid or str(uuid.uuid4())
    planning_state = req.planningstate or {"entities": {}}
    if "entities" not in planning_state:
        planning_state["entities"] = {}

    # Currency is LOCKED once the user picks it in the UI — it must never fall
    # back to a parser default (e.g. USD) in the same session.
    if req.currency:
        locked_currency = str(req.currency).strip().upper()
        if len(locked_currency) == 3 and locked_currency.isalpha():
            planning_state["entities"]["currency"] = locked_currency

    analysis = TravelIntentEngine.analyze(req.message, planning_state)
    intent = analysis.get("intent", "travelquestion")
    extracted_entities = analysis.get("entities", {})

    # Guard: If there is an active itinerary, prevent misclassifying questions as new trip planning
    if req.itinerary and intent == "plantrip":
        curr_dest = req.itinerary.get("destination", "").lower()
        ext_dest = (extracted_entities.get("destination") or "").lower()
        if not ext_dest or ext_dest == curr_dest:
            intent = "travelquestion"

    cleaned_new_entities = clean_extracted_entities(extracted_entities, req.message)

    # Currency is LOCKED by the UI — drop any parser-extracted currency so it
    # can never override the user's choice (e.g. a "$" in the message).
    if req.currency and len(str(req.currency).strip()) == 3:
        cleaned_new_entities["currency"] = req.currency.strip().upper()
        if "entities" in planning_state:
            planning_state["entities"]["currency"] = req.currency.strip().upper()

    is_planning_session = False
    if planning_state.get("entities", {}).get("destination"):
        missing = []
        for field in REQUIREDTRIPFIELDS:
            if not planning_state["entities"].get(field):
                missing.append(field)
        if missing:
            is_planning_session = True

    if is_planning_session:
        has_new_fields = False
        for k, v in cleaned_new_entities.items():
            if v is not None and v != "" and v != []:
                if not planning_state["entities"].get(k):
                    has_new_fields = True
                    break
        if has_new_fields:
            intent = "plantrip"

    # --- Editor routing: with an active itinerary, imperative edit messages go to
    # the editor deterministically so they never fall through to a generic answer. ---
    if (req.itinerary or req.tripid) and intent not in ("modifytrip", "plantrip") and not is_planning_session:
        msg_lower = req.message.lower().strip()
        is_question = ("?" in msg_lower
                       or msg_lower.startswith(("what", "which", "how", "why", "where",
                                                "is ", "are ", "can ", "should ", "could ",
                                                "would ", "do ", "does ")))
        if not is_question:
            edit_markers = ("budget", "currency", "travelers", "travellers", "passengers",
                            "remove", "delete", "drop", "add ", "replace", "swap", "move ",
                            "increase", "decrease", "raise", "change ", "update ",
                            "day 1", "day 2", "day 3", "day 4", "day 5", "day 6", "day 7",
                            "the dates", "new dates")
            if any(m in msg_lower for m in edit_markers):
                intent = "modifytrip"

    if intent in ("non_travel", "nontravel"):
        ans = TravelAssistantAgent.answer(req.message, req.history or [], req.itinerary, intent="nontravel")
        return {
            "status": "success",
            "intent": "nontravel",
            "answer": ans
        }

    # --- Parse edit instructions once (LLM first, deterministic rules as fallback) ---
    edit_op = None
    if intent in ("modifytrip", "modify_trip"):
        edit_op = await ItineraryEditor.parse_edit_query(req.message)

    # "Change the destination / location" on an existing trip = full re-plan
    if (intent in ("modifytrip", "modify_trip")
            and edit_op and edit_op.get("operation") == "updatedestination"
            and edit_op.get("destination")):
        cleaned_new_entities["destination"] = edit_op["destination"]
        cleaned_new_entities["country"] = None
        # Clear the old destination/country so the re-plan regenerates fully and
        # re-infers the country for the NEW destination instead of keeping the old one.
        planning_state["entities"]["destination"] = edit_op["destination"]
        planning_state["entities"]["country"] = None
        intent = "plantrip"
        edit_op = None

    if intent in ("modifytrip", "modify_trip"):
        op = edit_op
        if not op or not op.get("operation"):
            # Editor couldn't parse it — answer honestly from the itinerary instead
            ans = TravelAssistantAgent.answer(req.message, req.history or [], req.itinerary, intent="travelquestion")
            return {
                "status": "success",
                "intent": "travelquestion",
                "answer": ans
            }

        itinerary_details = None
        trip = None
        trip_id_to_load = req.tripid
        if trip_id_to_load:
            trip = db.query(Trip).filter(Trip.id == trip_id_to_load).first()
            if trip:
                from .triprouter import get_trip_details
                itinerary_details = get_trip_details(trip)

        if not itinerary_details and req.itinerary:
            itinerary_details = req.itinerary

        if not itinerary_details:
            raise HTTPException(status_code=400, detail="No active itinerary found to modify.")

        updated_itinerary = await ItineraryEditor.apply_edit(itinerary_details, op)
        edit_summary = updated_itinerary.pop("_edit_summary", None)

        # Recalculate road routes for every day so the map instantly reflects the
        # edit (and any day that never got geometry — e.g. from old trips — gets it).
        try:
            updated_itinerary = await RoutingService.enrich_trip_days(updated_itinerary)
        except Exception:
            pass

        if trip:
            op_type = op.get("operation")
            trip_days = sorted(trip.days, key=lambda d: d.day_number)

            if op_type == "removeday":
                day_idx = int(op.get("day") or 1) - 1
                if 0 <= day_idx < len(trip_days):
                    db.delete(trip_days[day_idx])
                    db.commit()
                    for i, td in enumerate(sorted(trip.days, key=lambda d: d.day_number)):
                        td.day_number = i + 1
                    db.commit()
                _sync_trip_meta(trip, updated_itinerary, db)

            elif op_type in ("updatebudget", "updatecurrency", "updatedates", "updatetravelers"):
                _sync_trip_meta(trip, updated_itinerary, db)
                if op_type == "updatedates":
                    # date changes can add/remove days — resync the day rows too
                    _sync_trip_days(trip, updated_itinerary, db)

            else:  # day-scoped edits (add / replace / remove / move activity)
                day_idx = int(op.get("day") or 1) - 1
                updated_days = updated_itinerary.get("days", [])
                if 0 <= day_idx < len(trip_days) and 0 <= day_idx < len(updated_days):
                    target_day = trip_days[day_idx]

                    db.query(Activity).filter(Activity.tripdayid == target_day.id).delete()
                    db.commit()

                    updated_day_data = updated_days[day_idx]
                    target_day.estimated_cost = updated_day_data.get("estimatedcost", 0.0)
                    route_payload = updated_day_data.get("route")
                    if updated_day_data.get("route_geometry"):
                        route_payload = {
                            "points": updated_day_data.get("route") or [],
                            "geometry": updated_day_data.get("route_geometry"),
                            "alternative": updated_day_data.get("route_alternative", []),
                            "distance_km": updated_day_data.get("route_distance_km"),
                            "duration_min": updated_day_data.get("route_duration_min")
                        }
                    target_day.routejson = route_payload
                    db.commit()

                    for idx, act in enumerate(updated_day_data.get("activities", [])):
                        new_act = Activity(
                            tripdayid=target_day.id,
                            time_slot=act.get("timeslot", "morning"),
                            name=act["name"],
                            category=act.get("category", "attraction"),
                            description=act.get("description", ""),
                            latitude=act["coordinates"]["lat"],
                            longitude=act["coordinates"]["lng"],
                            durationminutes=act.get("estimateddurationminutes", 90),
                            estimatedcost=act.get("estimatedcost", 0.0),
                            openinghours=act.get("openinghours"),
                            bookingnotes=act.get("bookingnotes"),
                            sequenceorder=idx,
                            traveltonextjson=act.get("traveltonext")
                        )
                        db.add(new_act)
                    db.commit()

        # Persist every day's updated route geometry so the map stays accurate on reload
        if trip:
            updated_days = updated_itinerary.get("days", [])
            db_days = sorted(trip.days, key=lambda d: d.day_number)
            for ud in updated_days:
                td = next((x for x in db_days if x.day_number == ud.get("day")), None)
                if td is None:
                    continue
                route_payload = ud.get("route")
                if ud.get("route_geometry"):
                    route_payload = {
                        "points": ud.get("route") or [],
                        "geometry": ud.get("route_geometry"),
                        "alternative": ud.get("route_alternative", []),
                        "distance_km": ud.get("route_distance_km"),
                        "duration_min": ud.get("route_duration_min")
                    }
                td.routejson = route_payload
                if ud.get("estimatedcost") is not None:
                    td.estimated_cost = ud.get("estimatedcost")
            db.commit()

        answer = " ".join(edit_summary) if edit_summary else \
            "I couldn't find a matching change — try 'increase the budget to 5000', 'remove day 3', or 'add X to day 2'."
        return {
            "status": "success",
            "intent": "modifytrip",
            "trip": updated_itinerary,
            "answer": answer
        }

    if intent == "plantrip":
        planning_state["entities"] = merge_entities_safely(
            planning_state.get("entities", {}),
            cleaned_new_entities,
            req.message
        )

        # Guided wizard never asks for country — infer it from the destination
        dest_ent = planning_state["entities"].get("destination")
        if dest_ent and not planning_state["entities"].get("country"):
            try:
                planning_state["entities"]["country"] = await GeocodingService.infer_country(str(dest_ent))
            except Exception:
                planning_state["entities"]["country"] = str(dest_ent).strip().title()

        # The UI lock must ALWAYS win — even if this message mentioned "$" or
        # another currency symbol, the chosen currency stays locked.
        def _reapply_currency_lock():
            if req.currency and len(str(req.currency).strip()) == 3:
                planning_state["entities"]["currency"] = str(req.currency).strip().upper()

        _reapply_currency_lock()

        missing = TripPlanningAgent.get_missing_fields(planning_state["entities"])
        if missing:
            question_data = await TripPlanningAgent.handle_conversation(planning_state, cleaned_new_entities, req.message)
            # handle_conversation merges again — re-apply the lock so it survives
            _reapply_currency_lock()
            return {
                "status": "needsmoreinfo",
                "intent": "plantrip",
                "missingfields": missing,
                "question": question_data.get("question"),
                "planningstate": planning_state,
                "sessionid": session_id
            }
        else:
            trip_data = await TripPlanningAgent.generate_trip(planning_state["entities"])
            itinerary = trip_data["itinerary"]
            budget_info = trip_data["budget_info"]
            
            trip_id = None
            if current_user:
                new_trip = Trip(
                    userid=current_user.id,
                    destination=planning_state["entities"]["destination"],
                    country=planning_state["entities"]["country"],
                    startdate=datetime.date.fromisoformat(planning_state["entities"]["startdate"]),
                    enddate=datetime.date.fromisoformat(planning_state["entities"]["enddate"]),
                    travelercount=int(planning_state["entities"].get("travelercount", 1)),
                    travelertype=planning_state["entities"].get("travelertype", "solo"),
                    interests=planning_state["entities"]["interests"],
                    status="completed"
                )
                db.add(new_trip)
                db.commit()
                db.refresh(new_trip)
                trip_id = new_trip.id

                for day in itinerary.get("days", []):
                    route_payload = day.get("route")
                    if day.get("route_geometry"):
                        route_payload = {
                            "points": day.get("route") or [],
                            "geometry": day.get("route_geometry"),
                            "alternative": day.get("route_alternative", []),
                            "distance_km": day.get("route_distance_km"),
                            "duration_min": day.get("route_duration_min")
                        }
                    new_day = TripDay(
                        tripid=new_trip.id,
                        day_number=day["day"],
                        date=datetime.date.fromisoformat(day["date"]),
                        theme=day.get("theme", ""),
                        estimated_cost=day.get("estimatedcost", 0.0),
                        weatherjson=day.get("weather"),
                        routejson=route_payload
                    )
                    db.add(new_day)
                    db.commit()
                    db.refresh(new_day)

                    for idx, act in enumerate(day.get("activities", [])):
                        new_act = Activity(
                            tripdayid=new_day.id,
                            time_slot=act.get("timeslot", "morning"),
                            name=act["name"],
                            category=act.get("category", "attraction"),
                            description=act.get("description", ""),
                            latitude=act["coordinates"]["lat"],
                            longitude=act["coordinates"]["lng"],
                            durationminutes=act.get("estimateddurationminutes", 90),
                            estimatedcost=act.get("estimatedcost", 0.0),
                            openinghours=act.get("openinghours"),
                            bookingnotes=act.get("bookingnotes"),
                            sequenceorder=idx,
                            traveltonextjson=act.get("traveltonext")
                        )
                        db.add(new_act)
                    db.commit()

                new_budget = Budget(
                    tripid=new_trip.id,
                    totalbudget=float(planning_state["entities"]["budget"]),
                    currency=planning_state["entities"]["currency"],
                    total_score=budget_info["score"],
                    comfort_level=budget_info["comfortlevel"],
                    allocationjson=budget_info["allocation"],
                    warningsjson=budget_info["warnings"]
                )
                db.add(new_budget)
                db.commit()

                # Prune older trips
                from .triprouter import prune_old_trips
                prune_old_trips(current_user.id, db)

            return {
                "status": "success",
                "intent": "plantrip",
                "tripid": trip_id,
                "trip": itinerary,
                "budget": budget_info,
                "routesummary": trip_data["route_summary"]
            }

    # Default fallback for travel questions and other unhandled intents
    ans = TravelAssistantAgent.answer(req.message, req.history or [], req.itinerary, intent=intent)
    return {
        "status": "success",
        "intent": "travelquestion",
        "answer": ans
    }

@router.post("/chat-edit")
async def chat_edit(req: ChatEditRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == req.tripid).first()
    if not trip or trip.userid != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this trip.")

    from .triprouter import get_trip_details
    itinerary_details = get_trip_details(trip)

    op = await ItineraryEditor.parse_edit_query(req.message)
    if not op or not op.get("operation"):
        raise HTTPException(status_code=422, detail="Could not parse editing instruction.")

    updated_itinerary = await ItineraryEditor.apply_edit(itinerary_details, op)
    edit_summary = updated_itinerary.pop("_edit_summary", None)

    # Recalculate road routes for every day so the map instantly reflects the edit.
    try:
        updated_itinerary = await RoutingService.enrich_trip_days(updated_itinerary)
    except Exception:
        pass

    op_type = op.get("operation")
    trip_days = sorted(trip.days, key=lambda d: d.day_number)

    if op_type == "removeday":
        day_idx = int(op.get("day") or 1) - 1
        if 0 <= day_idx < len(trip_days):
            db.delete(trip_days[day_idx])
            db.commit()
            for i, td in enumerate(sorted(trip.days, key=lambda d: d.day_number)):
                td.day_number = i + 1
            db.commit()
        _sync_trip_meta(trip, updated_itinerary, db)

    elif op_type in ("updatebudget", "updatecurrency", "updatedates", "updatetravelers"):
        _sync_trip_meta(trip, updated_itinerary, db)
        if op_type == "updatedates":
            # date changes can add/remove days — resync the day rows too
            _sync_trip_days(trip, updated_itinerary, db)

    else:  # day-scoped edits (add / replace / remove / move activity)
        day_idx = int(op.get("day") or 1) - 1
        updated_days = updated_itinerary.get("days", [])
        if 0 <= day_idx < len(trip_days) and 0 <= day_idx < len(updated_days):
            target_day = trip_days[day_idx]

            db.query(Activity).filter(Activity.tripdayid == target_day.id).delete()
            db.commit()

            updated_day_data = updated_days[day_idx]
            target_day.estimated_cost = updated_day_data.get("estimatedcost", 0.0)
            route_payload = updated_day_data.get("route")
            if updated_day_data.get("route_geometry"):
                route_payload = {
                    "points": updated_day_data.get("route") or [],
                    "geometry": updated_day_data.get("route_geometry"),
                    "alternative": updated_day_data.get("route_alternative", []),
                    "distance_km": updated_day_data.get("route_distance_km"),
                    "duration_min": updated_day_data.get("route_duration_min")
                }
            target_day.routejson = route_payload
            db.commit()

            for idx, act in enumerate(updated_day_data.get("activities", [])):
                new_act = Activity(
                    tripdayid=target_day.id,
                    time_slot=act.get("timeslot", "morning"),
                    name=act["name"],
                    category=act.get("category", "attraction"),
                    description=act.get("description", ""),
                    latitude=act["coordinates"]["lat"],
                    longitude=act["coordinates"]["lng"],
                    durationminutes=act.get("estimateddurationminutes", 90),
                    estimatedcost=act.get("estimatedcost", 0.0),
                    openinghours=act.get("openinghours"),
                    bookingnotes=act.get("bookingnotes"),
                    sequenceorder=idx,
                    traveltonextjson=act.get("traveltonext")
                )
                db.add(new_act)
            db.commit()

    # Persist every day's updated route geometry so the map stays accurate on reload
    updated_days = updated_itinerary.get("days", [])
    for ud in updated_days:
        td = next((x for x in sorted(trip.days, key=lambda d: d.day_number) if x.day_number == ud.get("day")), None)
        if td is None:
            continue
        route_payload = ud.get("route")
        if ud.get("route_geometry"):
            route_payload = {
                "points": ud.get("route") or [],
                "geometry": ud.get("route_geometry"),
                "alternative": ud.get("route_alternative", []),
                "distance_km": ud.get("route_distance_km"),
                "duration_min": ud.get("route_duration_min")
            }
        td.routejson = route_payload
        if ud.get("estimatedcost") is not None:
            td.estimated_cost = ud.get("estimatedcost")
    db.commit()




    return {
        "status": "success",
        "operation": op,
        "trip": updated_itinerary,
        "answer": " ".join(edit_summary) if edit_summary else "Itinerary updated."
    }

@router.post("/update-day")
async def update_day(req: TripUpdateDayRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == req.tripid).first()
    if not trip or trip.userid != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this trip.")

    trip_days = sorted(trip.days, key=lambda d: d.day_number)
    day_idx = req.day - 1
    if day_idx < 0 or day_idx >= len(trip_days):
        raise HTTPException(status_code=404, detail="Day not found.")

    target_day = trip_days[day_idx]

    activities_dict = []
    for act in req.activities:
        activities_dict.append(act.dict())

    optimized_activities = RouteOptimizer.optimize(activities_dict)

    db.query(Activity).filter(Activity.tripdayid == target_day.id).delete()
    db.commit()

    target_day.routejson = [{"lat": act["coordinates"]["lat"], "lng": act["coordinates"]["lng"], "label": act["name"]} for act in optimized_activities]
    target_day.estimated_cost = round(sum([float(act.get("estimatedcost", 0.0)) for act in optimized_activities]), 2)
    db.commit()

    # Real road routing for the updated day
    day_dict = {"activities": optimized_activities}
    try:
        from ..services.maps.routing import RoutingService
        day_dict = await RoutingService.enrich_day_route(day_dict)
        if day_dict.get("route_geometry"):
            target_day.routejson = {
                "points": [{"lat": a["coordinates"]["lat"], "lng": a["coordinates"]["lng"], "label": a["name"]} for a in day_dict["activities"]],
                "geometry": day_dict["route_geometry"],
                "alternative": day_dict.get("route_alternative", [])
            }
            db.commit()
    except Exception:
        pass

    for idx, act in enumerate(optimized_activities):
        new_act = Activity(
            tripdayid=target_day.id,
            time_slot=act.get("timeslot", "morning"),
            name=act["name"],
            category=act.get("category", "attraction"),
            description=act.get("description", ""),
            latitude=act["coordinates"]["lat"],
            longitude=act["coordinates"]["lng"],
            durationminutes=act.get("estimateddurationminutes", 90),
            estimatedcost=act.get("estimatedcost", 0.0),
            openinghours=act.get("openinghours"),
            bookingnotes=act.get("bookingnotes"),
            sequenceorder=idx,
            traveltonextjson=act.get("traveltonext")
        )
        db.add(new_act)
    db.commit()

    total_cost = sum([d.estimated_cost for d in trip.days])
    if trip.budget_info:
        from ..services.budget.budgetscorer import BudgetScorer
        new_score = BudgetScorer.score(trip.budget, trip.currency, len(trip.days), trip.travelercount, trip.destination)
        trip.budget_info.total_score = new_score["score"]
        trip.budget_info.comfort_level = new_score["comfortlevel"]
        trip.budget_info.allocationjson = new_score["allocation"]
        trip.budget_info.warningsjson = new_score["warnings"]
    db.commit()

    from .triprouter import get_trip_details
    return {
        "status": "success",
        "trip": get_trip_details(trip)
    }
