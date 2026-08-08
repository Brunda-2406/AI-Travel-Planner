from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Config & Logging
from .config import settings
from .loggingconfig import setup_logging
setup_logging()

# Database
from .database.base import Base
from .database.session import engine
from . import models
Base.metadata.create_all(bind=engine)

# Routers
from .routers import auth_router, trip_router, generate_router
from .routes import suggestions, hotels

from pydantic import BaseModel
from fastapi import HTTPException

# Legacy helpers
from .nlp.nlp_parser import parse_user_query
from .itinerary.itinerary_generator import generate_itinerary
from .api.weather_service import get_weather_forecast

app = FastAPI(title="AI Travel Assistant - Production Platform", debug=settings.DEBUG)

import asyncio
from .services.currency import CurrencyService


@app.on_event("startup")
async def _warm_currency_rates():
    """Fetch live exchange rates in the background so any world currency works."""
    asyncio.create_task(CurrencyService.refresh_rates())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",  # any local dev port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(trip_router, prefix="/api")
app.include_router(generate_router, prefix="/api")

# Legacy routes
app.include_router(suggestions.router, prefix="/api")
app.include_router(hotels.router, prefix="/api")

class ParseReq(BaseModel):
    message: str

class PlanReq(BaseModel):
    message: str

@app.post("/api/parse")
def parse(req: ParseReq):
    if not req.message:
        raise HTTPException(400, "Missing message")
    return parse_user_query(req.message)

@app.post("/api/plan")
def plan_trip(req: PlanReq):
    parsed = parse_user_query(req.message)

    if not parsed.get("destination"):
        raise HTTPException(422, "Destination not detected")

    itinerary = generate_itinerary(
        destination=parsed["destination"],
        start_date=parsed["start_date"],
        end_date=parsed["end_date"],
        interests=parsed.get("interests", []),
        budget=parsed.get("budget", 1000),
    )

    return {
        "parsed_query": parsed,
        "generated_itinerary": itinerary,
        "hotels": [],
    }

@app.get("/api/weather/{city}")
def get_weather(city: str):
    return {"city": city, "forecast": get_weather_forecast(city)}

@app.get("/")
def read_root():
    return {"message": "AI Travel Assistant API is fully operational"}
