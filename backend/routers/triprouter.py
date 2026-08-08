import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..models.trip import Trip
from ..dependencies import get_current_user
from ..auth.guards import check_trip_ownership
from ..services.export.pdf_exporter import PdfExporter
from ..services.budget.budgetscorer import BudgetScorer
from ..config import settings

import datetime
from ..models.tripday import TripDay
from ..models.activity import Activity
from ..models.budget import Budget

router = APIRouter(prefix="/trips", tags=["Trips"])

def prune_old_trips(userid: int, db: Session):
    trips = db.query(Trip).filter(Trip.userid == userid).order_by(Trip.createdat.desc()).all()
    if len(trips) > 5:
        trips_to_delete = trips[5:]
        for t in trips_to_delete:
            db.delete(t)
        db.commit()

@router.post("", status_code=status.HTTP_201_CREATED)
def save_trip(trip_data: dict, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create the Trip object
    new_trip = Trip(
        userid=current_user.id,
        destination=trip_data.get("destination"),
        country=trip_data.get("country"),
        startdate=datetime.date.fromisoformat(trip_data.get("startdate")),
        enddate=datetime.date.fromisoformat(trip_data.get("enddate")),
        travelercount=trip_data.get("travelercount", 1),
        travelertype=trip_data.get("travelertype", "solo"),
        interests=trip_data.get("interests", []),
        status="completed"
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    for day in trip_data.get("days", []):
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
            day_number=day.get("day"),
            date=datetime.date.fromisoformat(day.get("date")),
            theme=day.get("theme", ""),
            estimated_cost=day.get("estimatedcost", 0.0),
            weatherjson=day.get("weather"),
            routejson=route_payload
        )
        db.add(new_day)
        db.commit()
        db.refresh(new_day)

        for idx, act in enumerate(day.get("activities", [])):
            coords = act.get("coordinates", {}) or {}
            new_act = Activity(
                tripdayid=new_day.id,
                time_slot=act.get("timeslot", "morning"),
                name=act.get("name"),
                category=act.get("category", "attraction"),
                description=act.get("description", ""),
                latitude=coords.get("lat", 0.0),
                longitude=coords.get("lng", 0.0),
                durationminutes=act.get("estimateddurationminutes", 90),
                estimatedcost=act.get("estimatedcost", 0.0),
                openinghours=act.get("openinghours"),
                bookingnotes=act.get("bookingnotes"),
                sequenceorder=idx,
                traveltonextjson=act.get("traveltonext")
            )
            db.add(new_act)
        db.commit()

    # Budget info
    budget_meta = trip_data.get("budget", {})
    if budget_meta and isinstance(budget_meta, dict):
        # Calculate total budget from daily budget * number of days if totalbudget is not explicitly provided
        daily = budget_meta.get("dailybudget") or 0.0
        days_count = len(trip_data.get("days", []))
        derived_total = float(daily) * max(1, days_count)
        
        new_budget = Budget(
            tripid=new_trip.id,
            totalbudget=float(budget_meta.get("totalbudget") or derived_total or 1000.0),
            currency=budget_meta.get("currency", "USD"),
            total_score=budget_meta.get("score", 5.0),
            comfort_level=budget_meta.get("comfortlevel", "Moderate"),
            allocationjson=budget_meta.get("allocation"),
            warningsjson=budget_meta.get("warnings", [])
        )
        db.add(new_budget)
        db.commit()

    # Prune older trips
    prune_old_trips(current_user.id, db)

    return {"id": new_trip.id, "message": "Trip saved successfully"}

@router.get("")
def list_trips(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    trips = db.query(Trip).filter(Trip.userid == current_user.id).order_by(Trip.createdat.desc()).limit(5).all()
    return [
        {
            "id": t.id,
            "destination": t.destination,
            "country": t.country,
            "startdate": t.startdate,
            "enddate": t.enddate,
            "budget": t.budget_info.totalbudget if t.budget_info else None,
            "currency": t.budget_info.currency if t.budget_info else "USD",
            "status": t.status
        }
        for t in trips
    ]

def get_trip_details(trip: Trip) -> dict:
    days_data = []
    # Sort days chronologically
    sorted_days = sorted(trip.days, key=lambda d: d.day_number)
    for day in sorted_days:
        activities = []
        for act in sorted(day.activities, key=lambda a: a.sequenceorder or 0):
            activities.append({
                "name": act.name,
                "category": act.category,
                "description": act.description,
                "coordinates": {"lat": act.latitude, "lng": act.longitude},
                "estimateddurationminutes": act.durationminutes,
                "estimatedcost": act.estimatedcost,
                "timeslot": act.time_slot,
                "traveltonext": act.traveltonextjson
            })

        route_payload = day.routejson
        route_geometry = []
        route_alternative = []
        route_points = route_payload
        route_distance_km = None
        route_duration_min = None
        if isinstance(route_payload, dict):
            route_points = route_payload.get("points")
            route_geometry = route_payload.get("geometry") or []
            route_alternative = route_payload.get("alternative") or []
            route_distance_km = route_payload.get("distance_km")
            route_duration_min = route_payload.get("duration_min")

        days_data.append({
            "day": day.day_number,
            "date": str(day.date),
            "theme": day.theme,
            "estimatedcost": day.estimated_cost,
            "weather": day.weatherjson,
            "route": route_points,
            "route_geometry": route_geometry,
            "route_alternative": route_alternative,
            "route_distance_km": route_distance_km,
            "route_duration_min": route_duration_min,
            "activities": activities
        })

    budget_data = {}
    if trip.budget_info:
        days_count = max(1, len(trip.days))
        travelers_count = max(1, trip.travelercount or 1)
        daily_budget = round(trip.budget_info.totalbudget / days_count, 2) if len(trip.days) > 0 else 0
        suggestion = BudgetScorer.suggest(trip.destination, len(trip.days), trip.travelercount or 1, trip.budget_info.currency)
        budget_data = {
            "score": trip.budget_info.total_score,
            "comfortlevel": trip.budget_info.comfort_level,
            "totalbudget": trip.budget_info.totalbudget,
            "dailybudget": daily_budget,
            "dailybudgetperperson": round(daily_budget / travelers_count, 2) if len(trip.days) > 0 else 0,
            "currency": trip.budget_info.currency,
            "allocation": trip.budget_info.allocationjson,
            "warnings": trip.budget_info.warningsjson or [],
            "destinationcostestimate": suggestion["destinationcostestimate"],
            "suggesteddailybudget": suggestion["suggesteddailybudget"],
            "suggestedtotalbudget": suggestion["suggestedtotalbudget"]
        }

    return {
        "tripid": trip.id,
        "destination": trip.destination,
        "country": trip.country,
        "startdate": str(trip.startdate),
        "enddate": str(trip.enddate),
        "travelercount": trip.travelercount,
        "travelertype": trip.travelertype,
        "interests": trip.interests,
        "days": days_data,
        "budget": budget_data
    }

@router.get("/{tripid}")
async def get_trip(trip = Depends(check_trip_ownership)):
    """Load a saved trip — days that never got road geometry (e.g. from older
    generations where every stop collapsed to one point) get re-routed here so
    the map always shows a real route per day."""
    from ..services.maps.routing import RoutingService
    details = get_trip_details(trip)
    try:
        details = await RoutingService.enrich_trip_days(details)
    except Exception:
        pass
    return details

@router.delete("/{tripid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip = Depends(check_trip_ownership), db: Session = Depends(get_db)):
    db.delete(trip)
    db.commit()
    return None

@router.get("/{tripid}/export/pdf")
def export_trip_pdf(trip = Depends(check_trip_ownership)):
    trip_details = get_trip_details(trip)
    
    pdf_filename = f"trip_export_{trip.id}_{trip.destination.replace(' ', '_')}.pdf"
    pdf_path = os.path.abspath(os.path.join(settings.PDF_EXPORT_DIR, pdf_filename))
    
    exporter = PdfExporter()
    exporter.export(trip_details, pdf_path)
    
    return FileResponse(
        path=pdf_path,
        filename=pdf_filename,
        media_type="application/pdf"
    )
