import React, { useState } from "react";
import { TripDay } from "../../api/types";
import { formatCurrency } from "../../utils/currency";

const MODE_META: Record<string, { icon: string; label: string }> = {
  walking: { icon: "🚶", label: "Walk" },
  drive: { icon: "🚗", label: "Drive" },
  driving: { icon: "🚗", label: "Drive" },
  transit: { icon: "🚌", label: "Transit" },
  public_transport: { icon: "🚌", label: "Transit" },
  cycling: { icon: "🚲", label: "Cycle" },
  bike: { icon: "🚲", label: "Cycle" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  food: "🍽️",
  attraction: "📍",
  landmark: "🏛️",
  museum: "🖼️",
  park: "🌳",
  nature: "🌿",
  beach: "🏖️",
  hotel: "🏨",
  shopping: "🛍️",
  transport: "🚉",
};

/** Google-Maps-style waypoint letters: A, B, C … Z, AA, AB … */
const waypointLetter = (idx: number): string => {
  let n = idx;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

interface DirectionsGuideProps {
  day: TripDay;
  currency?: string;
}

const fmtFuel = (km: number): string => {
  // ~8.5 L/100km average consumption estimate
  const liters = Math.max(0, km * 0.085);
  if (liters <= 0) return "";
  return `${liters.toFixed(1)} L`;
};

const fmtKm = (km: number | undefined): string => {
  if (km === undefined || km === null || km <= 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

const fmtMin = (min: number | undefined): string => {
  if (min === undefined || min === null) return "";
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
};

export const DirectionsGuide: React.FC<DirectionsGuideProps> = ({ day, currency = "USD" }) => {
  const activities = day.activities || [];
  const [open, setOpen] = useState(true);

  if (activities.length === 0) return null;

  // Prefer real OSRM road stats when the backend attached them
  const roadKm = (day as any).route_distance_km;
  const roadMin = (day as any).route_duration_min;
  const totalDistance =
    typeof roadKm === "number" && roadKm > 0
      ? roadKm
      : activities.reduce((acc, a) => acc + (a.traveltonext?.distancekm || 0), 0);
  const totalDuration =
    typeof roadMin === "number" && roadMin > 0
      ? roadMin
      : activities.reduce((acc, a) => acc + (a.traveltonext?.durationminutes || 0), 0);
  const totalFuelCost = totalDistance * 0.085 * 1.35; // liters × avg fuel price
  const totalFuel = fmtFuel(totalDistance);

  return (
    <div className="card rounded-3xl overflow-hidden animate-fade-in-up">
      {/* Header bar */}
      <div className="px-5 py-4 bg-gradient-to-r from-ink via-slate-800 to-brand-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-lg">
            🧭
          </span>
          <div>
            <h4 className="font-display text-sm font-extrabold tracking-tight">Directions · Day {day.day}</h4>
            <p className="text-[11px] text-white/60 font-semibold">
              {activities.length} stop{activities.length > 1 ? "s" : ""} · turn-by-turn route
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {open ? "Hide" : "Show"}
          <span className={`text-[9px] transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▼</span>
        </button>
      </div>

      {open && (
        <>
          {/* Stop rows — Google-Maps-style waypoint list */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/70 to-white">
            <div className="space-y-1">
              {activities.map((act, idx) => {
                const isLast = idx === activities.length - 1;
                const travel = act.traveltonext;
                const mode = MODE_META[travel?.mode || ""] || { icon: "🚶", label: "Walk" };
                const catEmoji = CATEGORY_EMOJI[(act.category || "").toLowerCase()] || "📍";
                const letter = waypointLetter(idx);

                return (
                  <div key={idx}>
                    <div className="flex items-start gap-3 rounded-2xl bg-white border border-slate-100 shadow-soft px-3.5 py-3 hover:border-brand-200 transition-colors">
                      {/* Waypoint letter badge */}
                      <span
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold shrink-0 mt-0.5 ${
                          isLast
                            ? "border-red-400 text-red-500 bg-red-50"
                            : idx === 0
                              ? "border-blue-500 text-blue-600 bg-blue-50"
                              : "border-ocean-300 text-ocean-600 bg-ocean-50"
                        }`}
                      >
                        {letter}
                      </span>

                      {/* Stop details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[13px] font-extrabold text-ink leading-snug">
                          <span className="mr-1.5">{catEmoji}</span>
                          {act.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {act.timeslot && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 capitalize">
                              {act.timeslot}
                            </span>
                          )}
                          {act.estimateddurationminutes ? (
                            <span className="text-[10px] font-bold text-slate-400">
                              ⏳ {act.estimateddurationminutes} min
                            </span>
                          ) : null}
                          {act.estimatedcost ? (
                            <span className="text-[10px] font-bold text-slate-500">
                              {formatCurrency(act.estimatedcost, currency)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Drag-handle look */}
                      <span className="shrink-0 self-center text-slate-300 cursor-grab select-none text-sm tracking-tighter" title="Stop order">
                        ⠿
                      </span>
                    </div>

                    {/* Travel leg connector to the next stop */}
                    {!isLast && (
                      <div className="ml-[26px] pl-1.5 py-1 flex items-center gap-2">
                        <span className="w-0.5 self-stretch bg-gradient-to-b from-ocean-300 to-red-200 rounded-full" />
                        <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5">
                          <span className="w-6 h-6 rounded-lg bg-ocean-50 text-ocean-600 flex items-center justify-center text-xs shrink-0">
                            {mode.icon}
                          </span>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            <span className="font-extrabold text-ocean-700 capitalize">{mode.label}</span>
                            {travel && travel.distancekm > 0 ? ` ${fmtKm(travel.distancekm)}` : ""}
                            {travel && travel.durationminutes ? ` · ${fmtMin(travel.durationminutes)}` : ""}
                            <span className="text-slate-400"> → {waypointLetter(idx + 1)}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total-trip summary footer — Google-Maps style */}
          <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center text-base shrink-0">
                🚗
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-ink">
                  {totalDistance > 0 || totalDuration > 0 ? (
                    <>
                      Total trip:{" "}
                      <span className="text-ocean-700">
                        {totalDuration > 0 ? fmtMin(totalDuration) : "—"}
                        {totalDistance > 0 ? ` (${fmtKm(totalDistance)})` : ""}
                      </span>
                    </>
                  ) : (
                    "Total trip: —"
                  )}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {totalFuel ? `${totalFuel} fuel` : ""}
                  {totalDistance > 0 && totalFuelCost > 0
                    ? ` · ~${formatCurrency(totalFuelCost, currency)} fuel est.`
                    : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white text-xs font-extrabold shadow-glow transition-all active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
};
