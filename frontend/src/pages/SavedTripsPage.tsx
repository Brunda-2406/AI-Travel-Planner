import React, { useEffect } from "react";
import { useTrip } from "../hooks/useTrip";
import { useTripStore } from "../state/tripStore";
import { usePlanning } from "../hooks/usePlanning";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";

interface SavedTripsPageProps {
  onBackToPlanner: () => void;
}

const getFlagEmoji = (country: string) => {
  const mapping: Record<string, string> = {
    india: "🇮🇳",
    france: "🇫🇷",
    japan: "🇯🇵",
    uk: "🇬🇧",
    "united kingdom": "🇬🇧",
    usa: "🇺🇸",
    "united states": "🇺🇸",
    italy: "🇮🇹",
    spain: "🇪🇸",
    switzerland: "🇨🇭",
    australia: "🇦🇺",
    indonesia: "🇮🇩",
    thailand: "🇹🇭",
    singapore: "🇸🇬",
    bali: "🇮🇩",
  };
  return mapping[(country || "").toLowerCase().trim()] || "🌍";
};

const getInitials = (name: string) => name?.slice(0, 2).toUpperCase() || "TR";

export const SavedTripsPage: React.FC<SavedTripsPageProps> = ({ onBackToPlanner }) => {
  const { savedTrips, fetchTrips, deleteTripById, fetchTripDetails, loading } = useTrip();
  const { setTripData } = usePlanning();

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleViewDetails = async (id: number) => {
    await fetchTripDetails(id);
    const trip = useTripStore.getState().activeTrip;
    if (trip) {
      setTripData(trip);
      onBackToPlanner();
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-600">
              Your library
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink mt-1">
              Saved journeys
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {savedTrips.length > 0
                ? `${savedTrips.length} trip${savedTrips.length > 1 ? "s" : ""} ready to revisit.`
                : "Every itinerary you save will appear here."}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onBackToPlanner}>
            ← Back to Planner
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Spinner size="lg" />
            <p className="text-sm font-semibold">Loading your journeys…</p>
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="card rounded-[2rem] text-center py-20 px-8 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-brand-50 to-ocean-50 border border-brand-100 flex items-center justify-center text-4xl">
              🎒
            </div>
            <h3 className="font-display text-xl font-extrabold text-ink mt-6">No saved trips yet</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              Plan your first journey with the assistant, then hit{" "}
              <span className="font-bold text-brand-600">New Travel Itinerary</span> to save it here.
            </p>
            <Button className="mt-7" onClick={onBackToPlanner}>
              Start planning ✨
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {savedTrips.map((trip, i) => (
              <div
                key={trip.id}
                className="card card-hover rounded-[1.6rem] overflow-hidden flex flex-col animate-fade-in-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Cover */}
                <div className="relative h-32 bg-gradient-to-br from-ink via-slate-800 to-brand-900 overflow-hidden">
                  <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-brand-500/25 blur-2xl" />
                  <div className="absolute -left-8 bottom-0 w-36 h-36 rounded-full bg-ocean-500/20 blur-2xl" />
                  <div className="relative h-full px-6 flex items-center justify-between">
                    <div>
                      <span className="text-4xl drop-shadow">{getFlagEmoji(trip.country)}</span>
                      <h3 className="font-display text-2xl font-extrabold text-white mt-2">
                        {trip.destination}
                      </h3>
                    </div>
                    <span className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 text-white font-display font-extrabold text-sm flex items-center justify-center backdrop-blur">
                      {getInitials(trip.destination)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1 gap-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { icon: "📅", label: "Dates", value: `${trip.startdate} – ${trip.enddate}` },
                      { icon: "💰", label: "Budget", value: `${trip.currency || "USD"} ${trip.budget ?? "—"}` },
                      { icon: "✅", label: "Status", value: trip.status || "Planned" },
                    ].map((s) => (
                      <div key={s.label} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 min-w-0">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <span>{s.icon}</span>
                          {s.label}
                        </span>
                        <p className="mt-1 text-[11px] font-extrabold text-slate-700 truncate" title={s.value}>
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5 mt-auto">
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => handleViewDetails(trip.id)}>
                      View details
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm(`Delete the saved trip to ${trip.destination}?`)) {
                          await deleteTripById(trip.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
