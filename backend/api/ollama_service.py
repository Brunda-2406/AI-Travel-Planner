# backend/api/ollama_service.py

import requests
from typing import Dict, Any, List
from datetime import date
import json
import re

# -------------------------------
# OLLAMA CONFIG
# -------------------------------

OLLAMA_URL = "http://localhost:11434/api/generate"
# Default to a Qwen3 model; can be overridden with env var OLLAMA_MODEL
import os
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
USE_OLLAMA = os.getenv("USE_OLLAMA", "0").lower() in {"1", "true", "yes"}

# -------------------------------
# CORE AI CALL
# -------------------------------

def _call_ollama(prompt: str) -> str:
    """
    Sends a prompt to the local Ollama server and returns the response text.
    """
    if not USE_OLLAMA:
        return ""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "think": False,  # qwen3 outputs thinking tokens by default; disable for clean JSON
            },
            timeout=120
        )

        response.raise_for_status()
        data = response.json()

        return data.get("response", "").strip()

    except Exception:
        return ""


# -------------------------------
# TRAVEL ITINERARY GENERATOR
# -------------------------------

def generate_travel_itinerary(
    destination: str,
    start_date: str,
    end_date: str,
    interests: List[str],
    budget: str,
    weather_info: Dict[str, Any] = None
) -> str:
    """
    Generates a travel itinerary using a local LLM via Ollama.
    """

    today = date.today().isoformat()

    interests_text = ", ".join(interests) if interests else "general sightseeing"

    weather_text = ""
    if weather_info:
        weather_text = f"""
Expected Weather:
- Temperature: {weather_info.get('temperature', 'N/A')}
- Condition: {weather_info.get('description', 'N/A')}
"""

    prompt = f"""
You are an expert travel planner AI.

Today's date: {today}

Create a detailed, well-structured travel itinerary.

Destination: {destination}
Travel Dates: {start_date} to {end_date}
Budget Level: {budget}
Traveler Interests: {interests_text}

{weather_text}

Instructions:
- Break itinerary by day.
- Include morning, afternoon, and evening plans.
- Suggest food options.
- Suggest transportation tips.
- Keep it practical and realistic.
- Format clearly using headings.
"""

    return _call_ollama(prompt)


# -------------------------------
# GENERIC CHAT FUNCTION (OPTIONAL)
# -------------------------------

def generate_response(prompt: str) -> str:
    """
    General-purpose AI call if needed elsewhere.
    """
    return _call_ollama(prompt)


def generate_chat_from_messages(messages: List[Dict[str, str]], system_prompt: str = None) -> str:
    """
    Convert a structured message list (each item: {role, content}) into a single
    prompt for the Ollama model and return the model's reply text.
    """
    parts = []
    if system_prompt:
        parts.append(f"SYSTEM:\n{system_prompt}\n---\n")

    for m in messages:
        role = m.get("role", "user")
        content = m.get("content") or m.get("text") or ""
        parts.append(f"{role.upper()}: {content}\n")

    prompt = "\n".join(parts)
    return _call_ollama(prompt)


def generate_travel_itinerary_json(destination: str, start_date: str, end_date: str, interests: List[str], budget: str) -> dict:
        """
        Ask the Ollama model to produce a structured JSON itinerary.
        The model is instructed to ONLY output a single JSON object with this shape:
        {
            "destination": "...",
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD",
            "days": [
                {"day": 1, "date": "YYYY-MM-DD", "morning": "Place name", "afternoon": "Place name", "evening": "Place name"},
                ...
            ]
        }
        If parsing fails, returns an empty dict.
        """
        today = date.today().isoformat()
        interests_text = ", ".join(interests) if interests else "general sightseeing"

        prompt = f"""
You are a helpful travel planner. Output ONLY a single JSON object (no explanatory text) with this schema:
{{
    "destination": "<destination>",
    "start_date": "<YYYY-MM-DD>",
    "end_date": "<YYYY-MM-DD>",
    "days": [
        {{"day": 1, "date": "<YYYY-MM-DD>", "morning": "Place name or short phrase", "afternoon": "...", "evening": "..."}},
        ...
    ]
}}

Destination: {destination}
Dates: {start_date} to {end_date}
Budget: {budget}
Interests: {interests_text}

Provide realistic, concise place names for each slot. Do NOT include additional keys.
"""

        raw = _call_ollama(prompt)

        # Try parse JSON from response (look for first {...} block)
        try:
                m = re.search(r"\{.*\}", raw, re.S)
                if not m:
                        return {}
                jtext = m.group(0)
                return json.loads(jtext)
        except Exception:
                return {}


# -------------------------------
# Simple activity types generator (fallback)
# -------------------------------
def generate_activity_types(destination: str, start_date: str, end_date: str, interests: list, budget: Any) -> list:
    """
    Return a lightweight activity type plan used by `itinerary_generator`.
    This is a fallback that builds morning/afternoon/evening labels per day
    based on provided `interests` when a richer LLM-driven plan is not available.
    """
    try:
        from datetime import datetime
        sd = datetime.fromisoformat(start_date).date()
        ed = datetime.fromisoformat(end_date).date()
        days = max(1, (ed - sd).days + 1)
    except Exception:
        days = 3

    base_labels = [i.replace(" ", "_") for i in (interests or [])]
    if not base_labels:
        base_labels = ["sightseeing", "food_experience", "relaxation"]

    plan = []
    for i in range(days):
        morning = base_labels[i % len(base_labels)]
        afternoon = base_labels[(i + 1) % len(base_labels)]
        evening = base_labels[(i + 2) % len(base_labels)]
        plan.append({"morning": morning, "afternoon": afternoon, "evening": evening})

    return plan
