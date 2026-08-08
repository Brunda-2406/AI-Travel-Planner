import httpx
import logging
import math
import hashlib
from typing import List, Dict, Any, Optional

from ...config import settings
from ...cache.redisclient import RedisCache
from ...utils.retry import with_retry

logger = logging.getLogger("routing_service")

# In-memory fallback cache when Redis is unavailable
_MEMORY_ROUTE_CACHE = {}

OSRM_URL = "https://router.project-osrm.org/route/v1/driving"


class RoutingService:
    @staticmethod
    def _snap_zero_coords(activities: List[Dict[str, Any]]) -> None:
        """Activities still at lat/lng 0,0 (their geocode failed when the trip
        was built) are snapped onto the day's first real stop so the marker is
        on the map and the route can actually be computed."""
        anchor = None
        for act in activities:
            c = act.get("coordinates") or {}
            if c.get("lat") and c.get("lng"):
                anchor = c
                break
        if anchor is None:
            return
        for act in activities:
            c = act.get("coordinates") or {}
            if not c.get("lat") or not c.get("lng"):
                act["coordinates"] = {"lat": anchor["lat"], "lng": anchor["lng"]}

    @staticmethod
    def _spread_duplicate_coords(activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Stops that collapsed to the exact same point (a common geocoder
        city-center fallback for places OSM doesn't know) get small deterministic
        offsets so the map shows real, distinct markers and OSRM can compute an
        actual route instead of a zero-length degenerate line."""
        if not activities:
            return activities

        def _key(act: Dict[str, Any]):
            c = act.get("coordinates") or {}
            lat, lng = c.get("lat"), c.get("lng")
            if lat is None or lng is None:
                return None
            return (round(float(lat), 5), round(float(lng), 5))

        groups: Dict[Any, List[int]] = {}
        for idx, act in enumerate(activities):
            k = _key(act)
            if k is not None:
                groups.setdefault(k, []).append(idx)

        for base_key, idxs in groups.items():
            if len(idxs) < 2:
                continue
            base = activities[idxs[0]]["coordinates"]
            lat0, lng0 = float(base["lat"]), float(base["lng"])
            cos_lat = max(0.3, math.cos(math.radians(lat0)))
            for n, idx in enumerate(idxs[1:], start=1):
                # deterministic ring: ~160 m apart, drifting outward
                dist_m = 160.0 * n + 60.0
                angle = (n * 2.399963) % (2 * math.pi)  # golden-angle spread
                dlat = (dist_m / 111320.0) * math.cos(angle)
                dlng = (dist_m / (111320.0 * cos_lat)) * math.sin(angle)
                activities[idx]["coordinates"] = {
                    "lat": round(lat0 + dlat, 6),
                    "lng": round(lng0 + dlng, 6)
                }
        return activities

    @staticmethod
    @with_retry(max_attempts=3, backoff_factor=2.0)
    async def get_route(waypoints: List[Dict[str, float]], mode: str = "drive") -> Dict[str, Any]:
        if not settings.GEOAPIFY_API_KEY or len(waypoints) < 2:
            return {}

        wp_str = "|".join([f"{w['lat']},{w['lng']}" for w in waypoints])
        wp_hash = hashlib.md5(f"{wp_str}:{mode}".encode()).hexdigest()
        cache_key = f"route:{wp_hash}"

        cached = await RedisCache.get(cache_key)
        if cached:
            return cached

        url = "https://api.geoapify.com/v1/routing"
        params = {
            "waypoints": wp_str,
            "mode": mode,
            "apiKey": settings.GEOAPIFY_API_KEY
        }

        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, timeout=15)
            res.raise_for_status()
            data = res.json()

        features = data.get("features", [])
        if features:
            props = features[0]["properties"]
            geom = features[0]["geometry"]["coordinates"]
            result = {
                "route_geometry": geom,
                "total_distance_m": props.get("distance", 0.0),
                "total_duration_s": props.get("time", 0.0)
            }
            await RedisCache.set(cache_key, result, ttl=3600) # 1 hour
            return result

        return {}

    @staticmethod
    async def get_osrm_route(waypoints: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Real road-following driving route via the free OSRM public API — the
        same style of routing Google Maps uses (actual roads, real durations).

        Returns:
            {
              "geometry": [[lat, lng], ...]             # primary route (blue)
              "alternative_geometry": [[lat, lng], ...] # alternate route (grey)
              "legs": [ {distance_km, duration_min}, ... ]  # per waypoint segment
              "total_distance_km": float,
              "total_duration_min": float
            }
        """
        coords = [(w["lat"], w["lng"]) for w in waypoints if w and w.get("lat") is not None and w.get("lng") is not None]
        if len(coords) < 2:
            return {}

        cache_key = "osrm:" + hashlib.md5(",".join([f"{a:.5f},{b:.5f}" for a, b in coords]).encode()).hexdigest()
        cached = _MEMORY_ROUTE_CACHE.get(cache_key) or await RedisCache.get(cache_key)
        if cached:
            _MEMORY_ROUTE_CACHE[cache_key] = cached
            return cached

        # OSRM expects lon,lat pairs
        coord_str = ";".join([f"{lng},{lat}" for lat, lng in coords])
        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "true",
            "steps": "false"
        }

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{OSRM_URL}/{coord_str}", params=params, timeout=20)
                res.raise_for_status()
                data = res.json()
        except Exception as e:
            logger.warning(f"OSRM routing failed: {e}")
            return {}

        routes = data.get("routes") or []
        if not routes:
            return {}

        def _to_geometry(route) -> List[Dict[str, float]]:
            raw = (route.get("geometry") or {}).get("coordinates") or []
            return [{"lat": float(c[1]), "lng": float(c[0])} for c in raw]

        def _legs(route) -> List[Dict[str, float]]:
            legs = []
            for leg in route.get("legs") or []:
                d_m = float(leg.get("distance", 0.0) or 0.0)
                s = float(leg.get("duration", 0.0) or 0.0)
                legs.append({"distance_km": round(d_m / 1000.0, 2), "duration_min": round(s / 60.0, 1)})
            return legs

        primary = routes[0]
        result = {
            "geometry": _to_geometry(primary),
            "alternative_geometry": _to_geometry(routes[1]) if len(routes) > 1 else [],
            "legs": _legs(primary),
            "total_distance_km": round(float(primary.get("distance", 0.0)) / 1000.0, 2),
            "total_duration_min": round(float(primary.get("duration", 0.0)) / 60.0, 1)
        }

        await RedisCache.set(cache_key, result, ttl=3600)
        _MEMORY_ROUTE_CACHE[cache_key] = result
        return result

    @staticmethod
    async def enrich_day_route(day: Dict[str, Any]) -> Dict[str, Any]:
        """
        Attach real road geometry + per-leg travel data to a day's ordered
        activities. Falls back silently to the existing straight-line data
        when OSRM is unreachable.
        """
        activities = day.get("activities") or []
        # A 0,0 stop (geocode failed when the trip was built) would send the
        # route to the middle of the ocean — snap it to the day's first real stop.
        RoutingService._snap_zero_coords(activities)
        # Never let a day collapse to one point — spread co-identical stops first
        activities = RoutingService._spread_duplicate_coords(activities)
        day["activities"] = activities
        if len(activities) < 2:
            return day

        waypoints = [
            {"lat": a.get("coordinates", {}).get("lat"), "lng": a.get("coordinates", {}).get("lng")}
            for a in activities
        ]
        if not all(w.get("lat") is not None and w.get("lng") is not None for w in waypoints):
            return day

        route = await RoutingService.get_osrm_route(waypoints)
        if not route or not route.get("geometry"):
            return day

        # Ignore degenerate routes (all stops at the same spot) — let the map
        # fall back to straight segments instead of drawing a zero-length line.
        distinct = {(round(p["lat"], 5), round(p["lng"], 5)) for p in route["geometry"]}
        if len(distinct) < 2 or (route.get("total_distance_km") or 0) < 0.05:
            return day

        day["route_geometry"] = route["geometry"]
        if route.get("alternative_geometry"):
            day["route_alternative"] = route["alternative_geometry"]
        day["route_distance_km"] = route["total_distance_km"]
        day["route_duration_min"] = route["total_duration_min"]

        legs = route.get("legs") or []
        for idx, act in enumerate(activities):
            if idx < len(legs):
                leg = legs[idx]
                dist_km = leg["distance_km"]
                mode = "walking" if dist_km < 1.5 else "driving"
                duration_min = leg["duration_min"]
                if mode == "walking":
                    # walking speed ≈ 5 km/h — don't show a 1-min "drive" for a short hop
                    duration_min = max(2.0, (dist_km / 5.0) * 60.0)
                act["traveltonext"] = {
                    "mode": mode,
                    "durationminutes": max(1, int(round(duration_min))),
                    "distancekm": round(dist_km, 2),
                    "routing": "osrm"
                }
        day["activities"] = activities
        return day

    @staticmethod
    def _stats_from_geometry(geometry: List[Dict[str, float]]) -> Dict[str, float]:
        """Estimate route distance (km) and duration (min) from a polyline's
        coordinates when the real OSRM stats weren't persisted (older trips).
        Distance is the sum of haversine legs; duration assumes ~40 km/h."""
        if not geometry or len(geometry) < 2:
            return {"distance_km": 0.0, "duration_min": 0.0}
        total_m = 0.0
        for a, b in zip(geometry[:-1], geometry[1:]):
            lat1, lon1 = float(a.get("lat", 0.0)), float(a.get("lng", 0.0))
            lat2, lon2 = float(b.get("lat", 0.0)), float(b.get("lng", 0.0))
            total_m += RoutingService._haversine_m(lat1, lon1, lat2, lon2)
        dist_km = round(total_m / 1000.0, 2)
        return {"distance_km": dist_km, "duration_min": round(max(1.0, dist_km / 40.0 * 60.0), 1)}

    @staticmethod
    def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * R * math.asin(math.sqrt(a))

    @staticmethod
    async def enrich_trip_days(itinerary: Dict[str, Any]) -> Dict[str, Any]:
        """Make sure every day of a trip shows a real route on the map.
        - Always spreads co-identical pins (fixes overlapping markers).
        - Days missing road geometry get it computed from OSRM.
        - Days that have geometry but no persisted stats get them estimated
          from the polyline so the map callout/directions always show numbers.
        Used after chatbot edits and when loading saved trips so the map always
        reflects the current plan and recalculates automatically."""
        for day in itinerary.get("days", []):
            acts = day.get("activities") or []
            RoutingService._snap_zero_coords(acts)
            RoutingService._spread_duplicate_coords(acts)
            day["activities"] = acts
            if day.get("route_geometry"):
                # Existing route but no stored stats (older trips) — estimate from
                # the polyline so the map/directions show real numbers.
                if day.get("route_distance_km") is None and day.get("route_duration_min") is None:
                    stats = RoutingService._stats_from_geometry(day["route_geometry"])
                    day["route_distance_km"] = stats["distance_km"]
                    day["route_duration_min"] = stats["duration_min"]
                continue
            try:
                day = await RoutingService.enrich_day_route(day)
            except Exception as e:
                logger.warning(f"enrich_trip_days failed for day {day.get('day')}: {e}")
        return itinerary
