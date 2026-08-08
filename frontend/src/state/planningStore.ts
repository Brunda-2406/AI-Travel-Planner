import { create } from "zustand";
import { generate, chatEdit, updateDay, recommendPlaces, addPlaceToTrip, RecommendedPlace } from "../api/generateApi";
import { Trip, GenerateResponse } from "../api/types";

/** Session currency — the chosen currency is sent with every request so it never
 *  falls back to USD, but the user can change it anytime (no permanent lock). */
let sessionCurrency: string | null = null;

export const getLockedCurrency = (): string | null => sessionCurrency;
export const setLockedCurrency = (code: string): void => {
  sessionCurrency = code;
};

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface PlanningState {
  messages: ChatMessage[];
  sessionid: string | null;
  planningstate: any;
  missingfields: string[];
  currentQuestion: string | null;
  tripData: Trip | null;
  loading: boolean;
  error: string | null;
  recommendations: RecommendedPlace[];
  recommendationsLoading: boolean;

  sendMessage: (message: string) => Promise<void>;
  editTrip: (tripid: number, message: string) => Promise<void>;
  updateDayActivities: (tripid: number, day: number, activities: any[]) => Promise<void>;
  setTripData: (trip: Trip | null) => void;
  resetPlanning: () => void;
  fetchRecommendations: (destination: string, interests?: string[]) => Promise<void>;
  addPlace: (day: number, place: RecommendedPlace) => Promise<boolean>;
  lockedCurrency: string | null;
  lockCurrency: (code: string) => void;
  planTrip: (details: {
    destination: string;
    startdate: string;
    enddate: string;
    travelercount: number;
    travelertype: string;
    budget: number;
    currency: string;
    interests: string[];
  }) => Promise<void>;
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  messages: [
    {
      role: "assistant",
      text: "Hi! 👋 I'm your AI travel assistant. Tell me where you'd like to go, your dates and budget — or tap a suggestion below to get started."
    }
  ],
  sessionid: null,
  planningstate: { entities: {} },
  missingfields: [],
  currentQuestion: null,
  tripData: null,
  loading: false,
  error: null,
  recommendations: [],
  recommendationsLoading: false,
  lockedCurrency: getLockedCurrency(),

  lockCurrency: (code) => {
    const normalized = code.trim().toUpperCase();
    setLockedCurrency(normalized);
    set({ lockedCurrency: normalized });
  },

  sendMessage: async (text: string) => {
    const userMsg: ChatMessage = { role: "user", text };
    set((state) => ({
      messages: [...state.messages, userMsg],
      loading: true,
      error: null
    }));

    try {
      const state = get();
      const history = state.messages.map((m) => ({ role: m.role, text: m.text }));
      const locked = getLockedCurrency();
      const res: GenerateResponse = await generate(
        text,
        state.sessionid || undefined,
        state.planningstate,
        history,
        state.tripData || undefined,
        state.tripData?.tripid || undefined,
        locked || undefined
      );

      if (res.status === "needsmoreinfo") {
        set((state) => ({
          sessionid: res.sessionid || state.sessionid,
          planningstate: res.planningstate || state.planningstate,
          missingfields: res.missingfields || [],
          currentQuestion: res.question || null,
          messages: [
            ...state.messages,
            { role: "assistant", text: res.question || "Could you tell me more?" }
          ],
          loading: false
        }));
      } else if (res.status === "success") {
        if (res.intent === "travelquestion" || res.intent === "nontravel") {
          set((state) => ({
            messages: [
              ...state.messages,
              { role: "assistant", text: res.answer || "Here is what I found." }
            ],
            loading: false
          }));
        } else if ((res.intent === "plantrip" || res.intent === "modifytrip" || res.intent === "modify_trip") && res.trip) {
          const isPlantrip = res.intent === "plantrip";
          set((state) => ({
            tripData: { ...res.trip!, tripid: res.tripid || state.tripData?.tripid || null, budget: res.budget || res.trip!.budget || state.tripData?.budget },
            messages: [
              ...state.messages,
              { role: "assistant", text: res.answer || (isPlantrip ? "🎉 I have generated a custom trip itinerary for you!" : "🎉 I have updated your trip itinerary!") }
            ],
            loading: false
          }));
        }
      } else {
        set((state) => ({
          messages: [
            ...state.messages,
            { role: "assistant", text: "I encountered an issue processing your query." }
          ],
          loading: false
        }));
      }
    } catch (err: any) {
      const isNetwork = !err?.response;
      const detail = isNetwork
        ? "The backend isn't reachable. Make sure it's running with `npm start` (backend on port 8001)."
        : `The server returned an error (${err.response?.status}). Please try again.`;
      set((state) => ({
        error: "Server connection failed",
        messages: [
          ...state.messages,
          { role: "assistant", text: `❌ Connection error. ${detail}` }
        ],
        loading: false
      }));
    }
  },

  planTrip: async (details) => {
    const { destination, startdate, enddate, travelercount, travelertype, budget, currency, interests } = details;

    // Lock the currency the moment the user generates — it stays for the session.
    const normalized = currency.trim().toUpperCase();
    setLockedCurrency(normalized);

    const userMsg: ChatMessage = {
      role: "user",
      text: `Plan a trip to ${destination} for ${travelercount} ${travelertype} traveler(s), from ${startdate} to ${enddate}, with a budget of ${budget} ${normalized}, interested in ${interests.join(", ")}.`
    };
    const entities = {
      destination,
      country: null,
      startdate,
      enddate,
      travelercount,
      travelertype,
      budget,
      currency: normalized,
      interests
    };
    // IMPORTANT: keep planningstate empty until the response arrives so the
    // TripWizard stays mounted and can show its "Crafting…" state. Only flip
    // to a real planning state on success/needsmoreinfo.
    set((state) => ({
      messages: [...state.messages, userMsg],
      sessionid: null,
      lockedCurrency: normalized,
      loading: true,
      error: null
    }));

    try {
      const state = get();
      const res: GenerateResponse = await generate(
        userMsg.text,
        undefined,
        { entities },
        state.messages.map((m) => ({ role: m.role, text: m.text })),
        undefined,
        undefined,
        normalized
      );

      if (res.status === "success" && res.trip) {
        set((state) => ({
          tripData: { ...res.trip!, tripid: res.tripid || null, budget: res.budget || res.trip!.budget || state.tripData?.budget },
          planningstate: res.planningstate || { entities },
          messages: [
            ...state.messages,
            { role: "assistant", text: res.answer || "🎉 I have generated a custom trip itinerary for you!" }
          ],
          missingfields: [],
          currentQuestion: null,
          loading: false
        }));
      } else if (res.status === "needsmoreinfo") {
        set((state) => ({
          planningstate: res.planningstate || { entities },
          missingfields: res.missingfields || [],
          currentQuestion: res.question || null,
          messages: [
            ...state.messages,
            { role: "assistant", text: res.question || "Could you tell me more?" }
          ],
          loading: false
        }));
      } else {
        set((state) => ({
          messages: [...state.messages, { role: "assistant", text: "I encountered an issue processing your request." }],
          error: "Could not generate the itinerary. Please try again.",
          loading: false
        }));
      }
    } catch (err: any) {
      const isNetwork = !err?.response;
      const detail = isNetwork
        ? "The backend isn't reachable. Make sure it's running with `npm start` (backend on port 8001)."
        : `The server returned an error (${err.response?.status}). Please try again.`;
      set((state) => ({
        error: "Server connection failed",
        messages: [
          ...state.messages,
          { role: "assistant", text: `❌ Connection error. ${detail}` }
        ],
        loading: false
      }));
    }
  },

  editTrip: async (tripid: number, message: string) => {
    const userMsg: ChatMessage = { role: "user", text: message };
    set((state) => ({
      messages: [...state.messages, userMsg],
      loading: true,
      error: null
    }));

    try {
      const res = await chatEdit(tripid, message);
      if (res.status === "success" && res.trip) {
        set((state) => ({
          tripData: res.trip,
          messages: [
            ...state.messages,
            { role: "assistant", text: `I have updated your itinerary based on: "${message}"` }
          ],
          loading: false
        }));
      } else {
        set((state) => ({
          messages: [
            ...state.messages,
            { role: "assistant", text: "I couldn't modify the itinerary with that instruction." }
          ],
          loading: false
        }));
      }
    } catch (err) {
      set((state) => ({
        messages: [
          ...state.messages,
          { role: "assistant", text: "❌ Editing error. Make sure the backend is running (`npm start`) and try again." }
        ],
        loading: false
      }));
    }
  },

  updateDayActivities: async (tripid: number, day: number, activities: any[]) => {
    set({ loading: true, error: null });
    try {
      const res = await updateDay(tripid, day, activities);
      if (res.status === "success" && res.trip) {
        set({ tripData: res.trip, loading: false });
      } else {
        set({ error: "Failed to update day activities", loading: false });
      }
    } catch (err) {
      set({ error: "Connection error", loading: false });
    }
  },

  setTripData: (trip) => {
    set({ tripData: trip });
  },

  fetchRecommendations: async (destination, interests = []) => {
    if (!destination) return;
    const state = get();
    const currency = getLockedCurrency() || state.tripData?.budget?.currency || "USD";
    set({ recommendationsLoading: true });
    try {
      const res = await recommendPlaces(destination, interests, 30, currency);
      set({ recommendations: res.places || [], recommendationsLoading: false });
    } catch (err) {
      set({ recommendations: [], recommendationsLoading: false });
    }
  },

  addPlace: async (day, place) => {
    const state = get();
    if (!state.tripData) return false;
    set({ loading: true, error: null });
    try {
      const locked = getLockedCurrency();
      const placeWithCurrency = locked
        ? { ...place, currency: locked }
        : place;
      const res = await addPlaceToTrip({
        tripid: state.tripData.tripid || null,
        itinerary: state.tripData.tripid ? undefined : state.tripData,
        day,
        place: placeWithCurrency
      });
      if (res.status === "success" && res.trip) {
        const merged = {
          ...res.trip,
          tripid: res.trip.tripid || state.tripData.tripid,
          budget: res.trip.budget || state.tripData.budget
        };
        set({
          tripData: merged,
          messages: [
            ...state.messages,
            { role: "assistant", text: res.answer || `Added ${place.name} to Day ${day}!` }
          ],
          loading: false
        });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err) {
      set({
        error: "Failed to add place",
        messages: [...state.messages, { role: "assistant", text: "❌ Could not add that place. Please try again." }],
        loading: false
      });
      return false;
    }
  },

  resetPlanning: () => {
    set({
      messages: [
        {
          role: "assistant",
          text: "Hi! 👋 I'm your AI travel assistant. Tell me where you'd like to go, your dates and budget — or tap a suggestion below to get started."
        }
      ],
      sessionid: null,
      planningstate: { entities: {} },
      missingfields: [],
      currentQuestion: null,
      tripData: null,
      loading: false,
      error: null,
      recommendations: [],
      recommendationsLoading: false,
      lockedCurrency: getLockedCurrency()
    });
  }
}));
