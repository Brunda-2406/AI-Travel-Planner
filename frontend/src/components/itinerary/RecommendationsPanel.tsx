import React, { useEffect, useState, useMemo } from "react";
import { usePlanning } from "../../hooks/usePlanning";
import { RecommendedPlace } from "../../api/generateApi";
import { Spinner } from "../ui/Spinner";
import { formatCurrency } from "../../utils/currency";

interface RecommendationsPanelProps {
  destination: string;
  interests?: string[];
  daysCount: number;
  selectedDay: number;
  currency?: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  food: "🍽️",
  food_experience: "🍜",
  attraction: "📍",
  landmark: "🏛️",
  museum: "🖼️",
  sightseeing: "🏛️",
  park: "🌳",
  nature: "🌿",
  beach: "🏖️",
  hotel: "🏨",
  shopping: "🛍️",
  relaxation: "🧖",
  adventure: "🧗",
};

const CATEGORY_LABELS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "attraction", label: "Attractions" },
  { key: "food", label: "Food" },
  { key: "museum", label: "Museums" },
  { key: "nature", label: "Nature" },
  { key: "shopping", label: "Shopping" },
  { key: "nightlife", label: "Nightlife" },
];

const placeCategory = (c: string | undefined): string => {
  const cat = (c || "").toLowerCase();
  if (cat.includes("food") || cat.includes("restaurant") || cat.includes("cafe")) return "food";
  if (cat.includes("museum")) return "museum";
  if (cat.includes("park") || cat.includes("nature") || cat.includes("beach")) return "nature";
  if (cat.includes("shop")) return "shopping";
  if (cat.includes("bar") || cat.includes("night")) return "nightlife";
  return "attraction";
};

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  destination,
  interests = [],
  daysCount,
  selectedDay,
  currency = "USD",
}) => {
  const { recommendations, recommendationsLoading, fetchRecommendations, addPlace, tripData } = usePlanning();
  const [addingName, setAddingName] = useState<string | null>(null);
  const [targetDay, setTargetDay] = useState<number>(selectedDay);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [activeCat, setActiveCat] = useState("all");

  useEffect(() => {
    setTargetDay(selectedDay);
  }, [selectedDay]);

  useEffect(() => {
    if (destination) {
      fetchRecommendations(destination, interests);
    }
  }, [destination, currency]);

  const alreadyPlaced = new Set<string>();
  tripData?.days?.forEach((d) => d.activities?.forEach((a) => alreadyPlaced.add(a.name?.toLowerCase())));

  const handleAdd = async (place: RecommendedPlace) => {
    setAddingName(place.name);
    const ok = await addPlace(targetDay, place);
    setAddingName(null);
    if (ok) {
      setAdded((prev) => new Set(prev).add(place.name));
    }
  };

  const available = useMemo(
    () =>
      recommendations.filter(
        (r) =>
          !alreadyPlaced.has(r.name?.toLowerCase()) &&
          (activeCat === "all" || placeCategory(r.category) === activeCat)
      ),
    [recommendations, alreadyPlaced, activeCat]
  );

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recommendations.forEach((r) => {
      const c = placeCategory(r.category);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [recommendations]);

  return (
    <div className="card rounded-3xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-ocean-600 via-ocean-500 to-brand-500 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center text-lg shrink-0">
            💡
          </span>
          <div className="min-w-0">
            <h4 className="font-display text-sm font-extrabold tracking-tight">Recommended places</h4>
            <p className="text-[11px] text-white/70 font-semibold truncate">
              Real spots near {destination} — add as many as you like
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 border border-white/15 text-[11px] font-extrabold">
          {available.length} shown
        </span>
      </div>

      {/* Day picker */}
      <div className="px-5 pt-4 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Add to day</span>
        <select
          value={targetDay}
          onChange={(e) => setTargetDay(Number(e.target.value))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-ink outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 transition-all cursor-pointer"
        >
          {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              Day {d}
            </option>
          ))}
        </select>
      </div>

      {/* Category filter tabs */}
      <div className="px-5 pt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORY_LABELS.map((c) => {
          const count = c.key === "all" ? recommendations.length : catCounts[c.key] || 0;
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border ${
                active
                  ? "bg-gradient-to-r from-ocean-600 to-ocean-500 text-white border-transparent shadow-glow"
                  : "bg-white text-slate-500 border-slate-200 hover:border-ocean-300 hover:text-ocean-600"
              }`}
            >
              {c.label}
              <span className={`ml-1 ${active ? "text-white/70" : "text-slate-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="p-5 space-y-2.5 max-h-[460px] overflow-y-auto scrollbar-slim">
        {recommendationsLoading ? (
          <div className="flex items-center justify-center gap-3 py-8 text-slate-400 text-sm font-semibold">
            <Spinner size="sm" />
            Finding real places near {destination}…
          </div>
        ) : available.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2">{added.size > 0 ? "🎉" : "📍"}</p>
            <p className="text-sm font-bold text-slate-600">
              {added.size > 0 ? "All recommended places are in your itinerary!" : "No recommendations in this category"}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {added.size > 0 ? "Check back — more spots may appear." : "Try another category or destination."}
            </p>
          </div>
        ) : (
          available.map((place) => (
            <div
              key={place.name}
              className="group flex items-center gap-3 bg-slate-50/70 hover:bg-white border border-slate-100 hover:border-ocean-200 rounded-2xl p-3 transition-all duration-200 hover:shadow-soft"
            >
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-slate-100 border border-slate-200 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                {CATEGORY_EMOJI[place.category?.toLowerCase()] || "📍"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold text-ink truncate">{place.name}</p>
                <p className="text-[11px] text-slate-400 font-semibold capitalize truncate">
                  {place.category?.replace("_", " ")}
                  {place.estimatedcost
                    ? ` · ${formatCurrency(place.estimatedcost, currency)}`
                    : " · Free"}
                </p>
              </div>
              <button
                onClick={() => handleAdd(place)}
                disabled={addingName === place.name}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-ocean-600 to-ocean-500 hover:from-ocean-700 hover:to-ocean-600 text-white text-[11px] font-extrabold shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] hover:shadow-lift transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {addingName === place.name ? "Adding…" : "+ Add"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
