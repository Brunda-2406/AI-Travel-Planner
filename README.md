# AI Travel Planner

**AI Travel Planner** is an intelligent, full-stack application that leverages Artificial Intelligence and Natural Language Processing to generate customized travel itineraries based on user queries. It offers a seamless user experience for discovering destinations, viewing interactive maps, and receiving hotel and weather suggestions.

## ✨ Features

- **Conversational Trip Planning:** Use natural language (e.g., "Plan a 5-day trip to Paris for under $2000 focusing on art and food") to generate comprehensive itineraries.
- **Detailed Itineraries:** Receive daily plans including activities, locations, and schedules.
- **Interactive Maps:** View your destinations on dynamic maps powered by Leaflet.
- **Weather Forecasts:** Check up-to-date weather forecasts for your destination.
- **Hotel Suggestions:** Get tailored hotel recommendations based on your budget and preferences.
- **Modern UI:** A beautiful, responsive interface built with React, Tailwind CSS, and Framer Motion.
- **FastAPI Backend:** A high-performance Python backend powered by FastAPI for processing AI generation and NLP tasks.

## 🏗️ Project Structure

The project is structured into two main applications:

- **/backend:** The FastAPI Python server handling AI models, NLP parsing, external APIs (weather, places), and database interactions.
- **/frontend:** The React + Vite frontend application utilizing Tailwind CSS, Zustand for state management, and Leaflet for maps.

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

The launcher automatically finds the project virtual environment (`.venv`) and the Ollama binary on Windows, macOS and Linux. If Ollama is already running, it is reused and not started twice.

### AI engine (optional)

The chatbot uses a local Ollama model (Qwen3 8B) for intent detection and itinerary generation. Install [Ollama](https://ollama.com) and pull the model once:

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



## 🛠️ Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic
- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Zustand, React-Leaflet, Recharts
- **Database:** SQLite / PostgreSQL (configured via SQLAlchemy)

## 📝 License

This project is licensed under the MIT License.
