import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { currencySymbol } from "../../utils/currency";

interface RouteMapProps {
  destination: string;
  activities: any[];
  routeGeometry?: any;
  routeAlternative?: any;
  routeDistanceKm?: number;
  routeDurationMin?: number;
  currency?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  cafe: "#f97316",
  food: "#f97316",
  attraction: "#6366f1",
  landmark: "#6366f1",
  museum: "#6366f1",
  nature: "#0d9488",
  park: "#0d9488",
  beach: "#0d9488",
  hotel: "#0d9488",
  stay: "#0d9488",
  transport: "#8b5cf6",
  shopping: "#ec4899",
  nightlife: "#ec4899",
};

const getPinColor = (category: string | undefined): string => {
  const cat = (category || "").toLowerCase();
  return CATEGORY_COLORS[cat] || "#6366f1";
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

const START_COLOR = "#3b82f6"; // blue like Google Maps start dot
const END_COLOR = "#ef4444"; // red destination pin

function ChangeMapView({ center, activities, geometry }: { center: [number, number]; activities: any[]; geometry?: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 0) {
      const coords = geometry.map((g) => [g.lat, g.lng]) as [number, number][];
      map.fitBounds(coords, { padding: [72, 72] });
      return;
    }
    if (activities && activities.length > 0) {
      const coords = activities
        .map((act) => (act.coordinates ? [act.coordinates.lat, act.coordinates.lng] : null))
        .filter(Boolean) as [number, number][];
      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [64, 64] });
        return;
      }
    }
    if (center) {
      map.setView(center, 12);
    }
  }, [center, activities, geometry, map]);
  return null;
}

const fmtDist = (km: number): string => {
  if (!km || km <= 0) return "";
  if (km < 1.6) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

const fmtTime = (min: number): string => {
  if (!min || min <= 0) return "";
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
};

/**
 * Estimate driving stats like Google Maps route card:
 *   fuel_liters ≈ 0.085 L/km, fuel price ≈ 1.35/unit in trip currency.
 */
const estimateDrive = (distanceKm: number, cur: string) => {
  const liters = Math.max(0, distanceKm * 0.085);
  const pricePerLiter = 1.35;
  const cost = liters * pricePerLiter;
  return { liters, cost, pricePerLiter };
};

const RouteLegend: React.FC = () => {
  const items = [
    { color: "#3b82f6", label: "Route" },
    { color: "#9ca3af", label: "Alternative" },
    { color: "#ef4444", label: "Destination" },
    { color: "#3b82f6", label: "Start" },
  ];
  return (
    <div className="absolute bottom-4 left-4 z-[500] bg-white/90 backdrop-blur rounded-xl shadow-soft px-3 py-2.5 border border-slate-100">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map((it) => (
          <span key={it.label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
            <span className="w-3 h-1 rounded-full" style={{ background: it.color }} />
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Google-Maps-style route info callout card with a pointer tail. */
const RouteCallout: React.FC<{
  variant: "primary" | "alternative";
  position: "top-left" | "bottom-right";
  timeMin: number;
  distanceKm: number;
  liters: number;
  cost: number;
  currency: string;
}> = ({ variant, position, timeMin, distanceKm, liters, cost, currency }) => {
  const isPrimary = variant === "primary";
  const tailPos = position === "top-left" ? "after:left-[18%]" : "after:right-[18%]";
  const tailRot = position === "top-left" ? "after:rotate-[225deg]" : "after:rotate-[45deg]";
  return (
    <div
      className={`absolute z-[500] rounded-xl px-4 py-3 min-w-[190px] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.3)] after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:border-l after:border-t ${
        position === "top-left" ? "top-4 left-4" : "bottom-16 right-4"
      } ${tailPos} ${tailRot} ${
        isPrimary
          ? "bg-[#1a73e8] text-white after:bg-[#1a73e8] after:border-[#1a73e8]"
          : "bg-white text-ink after:bg-white after:border-slate-200 border border-slate-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">🚗</span>
        <span className="font-display text-sm font-extrabold">{fmtTime(timeMin) || "—"}</span>
      </div>
      <div className={`mt-1 text-xs font-bold ${isPrimary ? "text-white/80" : "text-slate-500"}`}>
        {fmtDist(distanceKm) || "—"}
      </div>
      <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${isPrimary ? "text-white/80" : "text-slate-500"}`}>
        <span>{liters > 0 ? `${liters.toFixed(1)} L` : "—"}</span>
        <span>⛽</span>
      </div>
      <div className={`mt-1 text-sm font-extrabold ${isPrimary ? "text-white" : "text-ocean-700"}`}>
        {currencySymbol(currency)} {cost.toFixed(2)}
        <span className={`ml-1.5 text-[10px] font-semibold ${isPrimary ? "text-white/70" : "text-slate-400"}`}>fuel est.</span>
      </div>
      <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${isPrimary ? "bg-white/25" : "bg-slate-100"}`}>
        <div className="h-full w-2/3 rounded-full bg-white/60" />
      </div>
    </div>
  );
};

export const RouteMap: React.FC<RouteMapProps> = ({ destination, activities, routeGeometry, routeAlternative, routeDistanceKm, routeDurationMin, currency }) => {
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const cur = currency || "USD";

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    const fetchCoords = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`
        );
        const data = await res.json();
        if (!cancelled && data && data.length > 0) {
          setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (err) {
        console.error("Geocoding map center failed:", err);
      }
    };
    fetchCoords();
    return () => {
      cancelled = true;
    };
  }, [destination]);

  // Prefer backend road geometry (OSRM) — falls back to straight segments
  const polylineCoords: [number, number][] = useMemo(() => {
    if (routeGeometry && routeGeometry.length > 0) {
      return routeGeometry.map((g: any) => [g.lat, g.lng]) as [number, number][];
    }
    return (activities
      .map((act) => (act.coordinates ? [act.coordinates.lat, act.coordinates.lng] : null))
      .filter(Boolean) as [number, number][]);
  }, [routeGeometry, activities]);

  const alternativeCoords: [number, number][] = useMemo(() => {
    if (routeAlternative && routeAlternative.length > 0) {
      return routeAlternative.map((g: any) => [g.lat, g.lng]) as [number, number][];
    }
    return [];
  }, [routeAlternative]);

  const hasActivities = activities.some((a) => a.coordinates);

  // Route stats — prefer the backend's real OSRM road numbers, then fall back
  // to per-activity travel legs, then the raw geometry as a last resort.
  const routeStats = useMemo(() => {
    const hasRoad = typeof routeDistanceKm === "number" && routeDistanceKm > 0;
    const totalKm = hasRoad
      ? routeDistanceKm!
      : activities.reduce((acc, a) => acc + (a.traveltonext?.distancekm || 0), 0);
    const totalMin = hasRoad
      ? (routeDurationMin || (totalKm / 40) * 60)
      : activities.reduce((acc, a) => acc + (a.traveltonext?.durationminutes || 0), 0);
    const { liters, cost } = estimateDrive(totalKm, cur);
    return { totalKm, totalMin, liters, cost };
  }, [activities, routeDistanceKm, routeDurationMin, cur]);

  // Alternative route stats — scale from primary distance
  const altStats = useMemo(() => {
    const hasAlt = routeAlternative && routeAlternative.length > 1;
    const km = hasAlt ? routeStats.totalKm * 1.08 : 0;
    const min = hasAlt ? routeStats.totalMin * 1.12 : 0;
    const { liters, cost } = estimateDrive(km, cur);
    return { km, min, liters, cost };
  }, [routeAlternative, routeStats, cur]);

  const startPos: [number, number] | null = useMemo(() => {
    const first = activities.find((a) => a.coordinates);
    return first ? [first.coordinates.lat, first.coordinates.lng] : null;
  }, [activities]);

  const endIndex = useMemo(() => {
    for (let i = activities.length - 1; i >= 0; i--) {
      if (activities[i]?.coordinates) return i;
    }
    return -1;
  }, [activities]);
  const endPos: [number, number] | null =
    endIndex >= 0
      ? [activities[endIndex].coordinates.lat, activities[endIndex].coordinates.lng]
      : null;

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] rounded-3xl overflow-hidden shadow-lift border border-slate-100 animate-fade-in-up">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <ChangeMapView center={center} activities={activities} geometry={routeGeometry} />
        {/* Google-Maps-style light basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Alternative route — grey, like Google Maps */}
        {alternativeCoords.length > 1 && (
          <Polyline
            positions={alternativeCoords}
            pathOptions={{ color: "#9ca3af", weight: 4, opacity: 0.75, dashArray: "2 8" }}
          />
        )}

        {/* Primary route — blue */}
        {polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: "#1a73e8", weight: 6, opacity: 0.9 }}
          />
        )}

        {/* Stops: Google-Maps-style lettered waypoints A → B → C, blue start dot, red destination pin */}
        {activities.map((act, idx) => {
          if (!act.coordinates) return null;
          const pos: [number, number] = [act.coordinates.lat, act.coordinates.lng];
          const isStart = idx === 0 && startPos !== null;
          const isEnd = idx === endIndex && endIndex > 0;
          const color = getPinColor(act.category);
          const letter = waypointLetter(idx);

          if (isStart && activities.length > 1) {
            // Google-Maps-style blue start dot with white ring + "A" label
            return (
              <Marker
                key={`start-${idx}`}
                position={pos}
                icon={L.divIcon({
                  html: `<div class="relative" style="width:30px;height:30px"><div style="position:absolute;inset:0;background:#1a73e8;border:3px solid #fff;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px">${letter}</div></div>`,
                  className: "",
                  iconSize: [30, 30],
                  iconAnchor: [15, 15],
                })}
              >
                <Popup>
                  <div className="p-1 min-w-[150px]">
                    <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Start · {letter}</p>
                    <h4 className="font-bold text-slate-800 text-sm">{act.name}</h4>
                  </div>
                </Popup>
              </Marker>
            );
          }

          if (isEnd && activities.length > 1) {
            // Google-Maps-style red destination pin with final letter
            return (
              <Marker
                key={`end-${idx}`}
                position={pos}
                icon={L.divIcon({
                  html: `<div class="relative" style="width:34px;height:34px"><div style="position:absolute;inset:0;background:#ea4335;border:3px solid #fff;border-radius:9999px;box-shadow:0 3px 10px rgba(234,67,53,.5)"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px">${letter}</div></div>`,
                  className: "",
                  iconSize: [34, 34],
                  iconAnchor: [17, 17],
                })}
              >
                <Popup>
                  <div className="p-1 min-w-[150px]">
                    <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Destination · {letter}</p>
                    <h4 className="font-bold text-slate-800 text-sm">{act.name}</h4>
                  </div>
                </Popup>
              </Marker>
            );
          }

          return (
            <Marker
              key={idx}
              position={pos}
              icon={L.divIcon({
                html: `<div style="background:#fff;border:2.5px solid ${color};color:${color}" class="flex items-center justify-center font-extrabold text-xs rounded-full w-7 h-7 shadow-md">${letter}</div>`,
                className: "",
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              })}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center" style={{ background: color }}>
                      {letter}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">{act.name}</h4>
                  </div>
                  {act.category && <p className="text-xs text-slate-400 capitalize mt-1">{act.category}</p>}
                  {act.description && <p className="text-xs mt-1.5 text-slate-500 leading-relaxed">{act.description}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Google-Maps-style route info callouts */}
      {hasActivities && routeStats.totalKm > 0 && (
        <>
          {altStats.km > 0 ? (
            <>
              <RouteCallout
                variant="alternative"
                position="top-left"
                timeMin={altStats.min}
                distanceKm={altStats.km}
                liters={altStats.liters}
                cost={altStats.cost}
                currency={cur}
              />
              <RouteCallout
                variant="primary"
                position="bottom-right"
                timeMin={routeStats.totalMin}
                distanceKm={routeStats.totalKm}
                liters={routeStats.liters}
                cost={routeStats.cost}
                currency={cur}
              />
            </>
          ) : (
            <RouteCallout
              variant="primary"
              position="top-left"
              timeMin={routeStats.totalMin}
              distanceKm={routeStats.totalKm}
              liters={routeStats.liters}
              cost={routeStats.cost}
              currency={cur}
            />
          )}
        </>
      )}

      <RouteLegend />
      {!hasActivities && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur rounded-full px-4 py-1.5 shadow-soft border border-slate-100 text-[11px] font-bold text-slate-500">
          📍 Centered on {destination || "your destination"}
        </div>
      )}
    </div>
  );
};
