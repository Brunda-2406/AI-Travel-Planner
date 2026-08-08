# ✈️ AroundTheWorld — Frontend

This is the frontend application for **AroundTheWorld**, a smart travel assistant that guides you through a few questions and then generates a complete day-by-day itinerary — with Google-Maps-style road routing, smart budgets in any currency, travel essentials, and per-country guides.

## 🚀 Features

- **Animated Welcome Page:** A branded landing page explaining the app, with a single click to sign in and start planning.
- **Guided Trip Wizard:** Answer destination, dates, travelers, budget and interests one question at a time — no typing required.
- **Interactive Maps:** Google-Maps-style lettered waypoints (A → B → C) with real road routing powered by Leaflet & React-Leaflet; the map re-routes automatically after every edit.
- **Chat Trip Editor:** After the itinerary is built, the chatbot becomes an editor — swap/add places, change budget, currency, dates or destination, and everything recalculates instantly.
- **Budget Intelligence:** Overall / per-day / per-person budgets, cost allocations, comfort score and suggested budget, all converted to any ISO 4217 currency.
- **Travel Essentials:** One-tap links to hotels, Airbnbs, rental cars, rides, flights, hostels, insurance, restaurants, eSIMs, tours and visa services, pre-filled for the destination.
- **Country Guides:** Detailed per-country essentials — customs, safety, visas, currency, food, transport, emergency numbers and more.
- **Dynamic Animations:** Smooth transitions and micro-animations using Framer Motion.
- **Modern UI/UX:** Fully responsive, premium design styled with Tailwind CSS.
- **Data Visualization:** Charts and visual representations of travel data using Recharts.
- **State Management:** Efficient client-side state management with Zustand.

## 🛠️ Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Animations:** Framer Motion
- **Maps:** Leaflet & React-Leaflet
- **Charts:** Recharts
- **State Management:** Zustand
- **HTTP Client:** Axios

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- The FastAPI backend + local LLM (Ollama) — see the root README. The simplest path is to run `npm start` from the project root, which launches everything (Ollama → backend → frontend).

### Installation

1. Navigate to the frontend directory (if not already there):
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

Start the Vite development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

## 🔗 Backend Integration

This frontend is designed to work with the AroundTheWorld FastAPI backend (typically on `http://127.0.0.1:8001`). Ensure the backend server and the local LLM (Ollama, `http://localhost:11434`) are running so API calls (e.g., `/api/plan`, `/api/parse`, `/chat`) function correctly.
