# ✈️ AroundTheWorld — AI Travel Planner

**AroundTheWorld** is an intelligent, full-stack travel planner powered by a local LLM. Describe your journey, answer a few guided questions, and get a complete day-by-day itinerary with Google-Maps-style road routing, smart budgets in any currency, travel essentials, and per-country guides — all in a polished, animated UI.

## ✨ Features

- **Animated Welcome Page:** A branded landing page explaining what the app does, with a single click to sign in and start planning.
- **Guided Trip Wizard:** No typing required — answer five quick questions (destination, dates, travelers, budget, interests) one at a time, then watch the AI build your plan.
- **Conversational Trip Planning:** Chat naturally (e.g., *"5 days in Tokyo, budget $2000, love food and art"*) to generate comprehensive itineraries.
- **Chat Trip Editor:** After the itinerary is created, the chatbot becomes an editor — swap or add places, remove days, and change the **budget, currency, dates, travelers or destination** in plain English, with instant recalculation.
- **Google-Maps-Style Maps:** Lettered waypoints (A → B → C), real road routing via OSRM, turn-by-turn directions with distances, drive times and fuel estimates. The map re-routes automatically after every edit.
- **Budget Intelligence:** Overall / per-day / per-person budgets, cost allocations, comfort score, budget alerts, and a suggested budget for the whole trip.
- **Any Currency in the World:** Full ISO 4217 currency support with live rate conversion — every estimate converts to your chosen currency.
- **Travel Essentials:** One-tap links to hotels, Airbnbs, rental cars, local rides, flights, hostels, insurance, restaurants, eSIMs, sightseeing passes and visa services — all pre-filled for your destination.
- **Country Guides:** Detailed per-country essentials — customs, safety, visas, currency, best time to visit, food, language, transport, emergency numbers and tipping — for 13+ countries with a generic fallback.
- **Recommendations Panel:** Real, verifiable places near your destination (never fabricated) that you can add to any day.
- **Weather Forecasts:** Per-day weather for your destination.
- **Save & Export:** Keep journeys in your account and export polished PDF trip documents.
- **Modern UI:** A beautiful, responsive interface built with React, Tailwind CSS, and Framer Motion.

## 🏗️ Project Structure

The project is structured into two main applications:

- **/backend:** The FastAPI Python server handling the local LLM, NLP parsing, itinerary generation/editing, external APIs (maps, places, weather), and database interactions.
- **/frontend:** The React + Vite frontend application utilizing Tailwind CSS, Zustand for state management, and React-Leaflet for maps.

## 🚀 Getting Started

### One-command launch (recommended)

Start the **entire stack** — local LLM, backend and frontend — with a single command from the project root. Works in VS Code, Cursor, or any terminal:

```bash
npm start
# or
npm run dev
```

This launches, in order:

1. **Ollama** (local LLM server) → http://localhost:11434 — auto-started if not already running
2. **Backend** → http://127.0.0.1:8001 (FastAPI + Uvicorn)
3. **Frontend** → http://localhost:5173 (Vite + React)

The launcher automatically finds the project virtual environment (`.venv`) and the Ollama binary on Windows, macOS and Linux. If Ollama is already running, it is reused and not started twice. A PowerShell one-shot launcher (`run_all.ps1`) is also included.

### AI engine

The chatbot uses a local Ollama model (**Qwen3 8B**) for intent detection, itinerary generation and edit parsing. Install [Ollama](https://ollama.com) and pull the model once:

```bash
npm run setup:model   # equivalent to: ollama pull qwen3:8b
```

`npm start` verifies the model is pulled and prints a reminder if it's missing. If Ollama is unavailable, the app gracefully falls back to rule-based parsing and real OpenStreetMap place data — no hallucinations, no invented landmarks.

### Manual setup

#### Backend

1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```
2. (Optional) Copy `backend/.env.example` to `backend/.env` and add API keys for richer maps/weather data. The app works without keys using free OpenStreetMap fallbacks.
3. Run the FastAPI development server:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8001
   ```

#### Frontend

1. Install the necessary NPM packages:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 🧠 How It Works

1. **Answer a few questions** — destination, dates, travelers, budget and interests are collected one at a time (no typing required).
2. **AI plans your journey** — a full itinerary appears with per-day activities, budgets, maps and road guidance.
3. **Chat to fine-tune** — swap activities, add places, change currency, dates or budget, and the itinerary, map and budget intelligence all recalculate instantly.

## 🧪 Testing

```bash
# Backend tests (editor operations, budget scoring, auth, routing)
python -m pytest backend/tests

# Frontend typecheck
cd frontend && npx tsc --noEmit
```

## 🛠️ Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, Qwen3 8B via Ollama
- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Zustand, React-Leaflet, Recharts
- **Maps & Routing:** Leaflet + OSRM (real road geometry)
- **Database:** SQLite / PostgreSQL (configured via SQLAlchemy)

## 📝 License

This project is licensed under the MIT License.
