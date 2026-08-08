import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePlanning } from "../hooks/usePlanning";
import { useTrip } from "../hooks/useTrip";
import { ChatInterface } from "../components/chat/ChatInterface";
import { ItineraryView } from "../components/itinerary/ItineraryView";
import { RouteMap } from "../components/map/RouteMap";
import { DirectionsGuide } from "../components/itinerary/DirectionsGuide";
import { RecommendationsPanel } from "../components/itinerary/RecommendationsPanel";
import { TravelEssentialsPanel } from "../components/itinerary/TravelEssentialsPanel";
import { TripWizard } from "../components/trip/TripWizard";
import { Button } from "../components/ui/Button";
import { getExportPdfUrl } from "../api/tripsApi";

interface PlannerPageProps {
  onNavigate: (view: string) => void;
}

const FEATURES = [
  { icon: "🤖", title: "AI Itineraries", desc: "Day-by-day plans tailored to your dates, budget and interests." },
  { icon: "💰", title: "Budget Intelligence", desc: "Smart cost allocation, alerts and a comfort score for every trip." },
  { icon: "🗺️", title: "Smart Routes", desc: "Optimized map routes between every stop — no wasted time." },
  { icon: "🧭", title: "Local Guides", desc: "Visa, safety, etiquette and transport tips for your destination." },
];

const STEPS = [
  { n: "01", title: "Describe your trip", desc: "\"5 days in Tokyo, budget $2000, love food and art\"" },
  { n: "02", title: "Chat to refine", desc: "Answer a few quick questions or tweak any day in plain English." },
  { n: "03", title: "Explore & export", desc: "View maps, budgets and guides — then save or export a PDF." },
];

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center text-center px-4 py-10 lg:py-16 animate-fade-in-up">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-ocean-500 shadow-glow flex items-center justify-center text-5xl rotate-3">
          ✈️
        </div>
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-white shadow-soft border border-slate-100 flex items-center justify-center text-xl -rotate-12 animate-float">
          🧭
        </div>
        <div className="absolute -bottom-2 -left-4 w-9 h-9 rounded-xl bg-white shadow-soft border border-slate-100 flex items-center justify-center text-lg rotate-12 animate-float-slow">
          🗺️
        </div>
      </div>

      <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.1] max-w-2xl">
        Your next adventure, <span className="text-gradient">crafted by AI</span>
      </h2>
      <p className="mt-5 text-slate-500 font-medium max-w-xl leading-relaxed">
        Tell the assistant where you want to go, when, and what you love — it plans the whole
        journey: day-by-day activities, budgets, optimized routes and local guides.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 w-full max-w-4xl">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i + 0.15, duration: 0.45, ease: "easeOut" }}
            className="card card-hover rounded-2xl p-5 text-left"
          >
            <span className="text-2xl">{f.icon}</span>
            <h4 className="mt-3 text-sm font-extrabold text-ink">{f.title}</h4>
            <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 w-full max-w-3xl">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
          <span className="h-px flex-1 bg-slate-200" />
          How it works
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="text-left">
              <span className="font-display text-3xl font-extrabold text-gradient-warm">{s.n}</span>
              <h5 className="mt-2 text-sm font-extrabold text-ink">{s.title}</h5>
              <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PlannerPage: React.FC<PlannerPageProps> = ({ onNavigate }) => {
  const { tripData, resetPlanning, planningstate } = usePlanning();
  const { saveTrip } = useTrip();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [saving, setSaving] = useState(false);
  const activeDayNumber = selectedDay || 1;
  const activeDay = tripData?.days?.find((d) => d.day === activeDayNumber) || tripData?.days?.[0];

  useEffect(() => {
    if (tripData && tripData.days && tripData.days.length > 0) {
      if (selectedDay === null || selectedDay > tripData.days.length) {
        setSelectedDay(1);
      }
    } else {
      setSelectedDay(null);
    }
  }, [tripData]);

  const getMapActivities = () => {
    if (!tripData) return [];
    if (selectedDay !== null) {
      const dayData = tripData.days.find((d) => d.day === selectedDay);
      return dayData ? dayData.activities : [];
    }
    return tripData.days.flatMap((d) => d.activities);
  };

  const handleNewTrip = async () => {
    if (tripData && !tripData.tripid) {
      setSaving(true);
      try {
        await saveTrip(tripData);
      } catch (e) {
        console.error("Auto-saving active itinerary failed:", e);
      } finally {
        setSaving(false);
      }
    }
    resetPlanning();
    setSelectedDay(null);
  };

  const hasContent = Boolean(tripData || planningstate?.entities?.destination);

  const showWizard = !tripData && !planningstate?.entities?.destination;

  return (
    <div className="flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
        {/* No itinerary yet — guided wizard asks each requirement one by one,
            chatbot is hidden and becomes the add-on once the trip exists. */}
        {showWizard && (
          <div className="flex-1 min-w-0">
            <TripWizard onNavigate={onNavigate} />
          </div>
        )}

        {/* Left Column: Chat — an add-on for refining once the itinerary exists */}
        {!showWizard && (
          <div className="w-full lg:w-[440px] shrink-0 flex flex-col gap-4">
            <ChatInterface />
            <Button variant="secondary" size="lg" className="w-full border-dashed" loading={saving} onClick={handleNewTrip}>
              <span>✨</span> New Travel Itinerary
            </Button>
            {!tripData && (
              <button
                onClick={() => onNavigate("saved-trips")}
                className="text-xs font-bold text-slate-400 hover:text-brand-600 transition-colors cursor-pointer"
              >
                View your saved journeys →
              </button>
            )}
          </div>
        )}

        {/* Right Column: Results */}
        {!showWizard && (
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {hasContent ? (
            <div className="space-y-5">
              {tripData ? (
                <div className="card rounded-3xl p-5 sm:p-6 animate-fade-in-up relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-ocean-500" />
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-extrabold text-ink flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-ocean-500 text-white flex items-center justify-center text-lg shadow-glow">
                          🌍
                        </span>
                        Trip to {tripData.destination}
                      </h2>
                      <p className="mt-1.5 text-xs text-slate-500 font-semibold">
                        {tripData.days.length} day{tripData.days.length > 1 ? "s" : ""} ·{" "}
                        {tripData.startdate} → {tripData.enddate}
                        {tripData.country ? ` · ${tripData.country}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {tripData.tripid && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(getExportPdfUrl(tripData.tripid!), "_blank")}
                        >
                          📄 Export PDF
                        </Button>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-ocean-500 animate-pulse" />
                        Ready
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card rounded-3xl p-5 sm:p-6 animate-fade-in-up">
                  <h3 className="font-display text-xl font-extrabold text-ink flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-sunset-400 to-sunset-500 text-white flex items-center justify-center text-base">
                      📍
                    </span>
                    Destination detected —{" "}
                    <span className="text-gradient capitalize">{planningstate?.entities?.destination}</span>
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 font-medium">
                    We're building your custom trip. Keep chatting on the left to fill in the missing
                    details — dates, budget and travel style.
                  </p>
                </div>
              )}

              {/* Itinerary plan box */}
              {tripData && (
                <ItineraryView trip={tripData} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
              )}

              {/* Map toggle */}
              <button
                onClick={() => setShowMap(!showMap)}
                className="card card-hover w-full flex items-center justify-between p-5 rounded-3xl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl">
                    🗺️
                  </span>
                  <div className="text-left">
                    <span className="font-extrabold text-ink text-sm block">Map-based guide</span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {showMap ? "Hide the route map" : "Show the route map"}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 text-[11px] font-extrabold uppercase tracking-wider">
                  {showMap ? "Hide" : "View"}
                </span>
              </button>

              {showMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <RouteMap
                    destination={tripData?.destination || planningstate?.entities?.destination}
                    activities={getMapActivities()}
                    routeGeometry={activeDay?.route_geometry}
                    routeAlternative={activeDay?.route_alternative}
                    routeDistanceKm={activeDay?.route_distance_km}
                    routeDurationMin={activeDay?.route_duration_min}
                    currency={tripData?.budget?.currency || planningstate?.entities?.currency || "USD"}
                  />
                  {activeDay && (
                    <DirectionsGuide
                      day={activeDay}
                      currency={tripData?.budget?.currency || "USD"}
                    />
                  )}
                </motion.div>
              )}

              {/* Recommendations — add real places to the itinerary */}
              {tripData && (
                <RecommendationsPanel
                  destination={tripData.destination}
                  interests={tripData.interests || []}
                  daysCount={tripData.days.length}
                  selectedDay={activeDayNumber}
                  currency={tripData.budget?.currency || "USD"}
                />
              )}

              {/* Travel essentials — hotels, homes, wheels & tours */}
              {tripData && (
                <TravelEssentialsPanel
                  destination={tripData.destination}
                  country={tripData.country}
                  startdate={tripData.startdate}
                  enddate={tripData.enddate}
                  travelers={tripData.travelercount}
                />
              )}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
        )}
      </div>
    </div>
  );
};
