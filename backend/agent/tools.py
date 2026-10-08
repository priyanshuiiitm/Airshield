"""
Custom deterministic tools for AirShieldAgent (Phase 4).
Exposes exactly:
1. get_routes
2. get_aqi
3. compute_exposure
4. optimize_route

All numeric calculations and domain logic are delegated directly to Phase 1 core modules.
"""

from __future__ import annotations
import time
import logging
from typing import Dict, Any, List, Optional
from strands import tool

from datetime import datetime, timezone
from backend.core.models import (
    Coordinate,
    Route,
    AQIStation,
    ExposureResult,
    OptimizationResult,
    ClassificationResult,
    RouteOutcome,
    Confidence
)
from backend.core.config import DEFAULT_CONFIG
from backend.core.routes import deduplicate_routes
from backend.core.aqi import filter_fresh_stations
from backend.core.exposure import (
    compute_route_exposure,
    compute_relative_exposure_indices,
    evaluate_robustness
)
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from data.find_scenarios import synthesize_candidate_routes_snapshot
from tests.conftest import load_stations_from_fixture
from backend.agent.schemas import ToolTraceItem

logger = logging.getLogger("airshield.agent.tools")


class ToolContext:
    """Thread-local / request-scoped telemetry collector."""
    def __init__(self):
        self.trace: List[ToolTraceItem] = []
        
    def record(self, tool_name: str, start: float, end: float, status: str, error: Optional[str] = None):
        self.trace.append(ToolTraceItem(
            tool=tool_name,
            start_time=start,
            end_time=end,
            duration_ms=round((end - start) * 1000, 2),
            status=status,
            error=error
        ))


# Global context holder (swapped or cleared per request)
_current_context: Optional[ToolContext] = None


def get_tool_context() -> ToolContext:
    global _current_context
    if _current_context is None:
        _current_context = ToolContext()
    return _current_context


def set_tool_context(ctx: ToolContext):
    global _current_context
    _current_context = ctx


# ---------------------------------------------------------------------------
# Tool Implementations
# ---------------------------------------------------------------------------

def execute_get_routes(
    pickup_lat: float,
    pickup_lng: float,
    drop_lat: float,
    drop_lng: float,
    travel_mode: str = "Scooter"
) -> Dict[str, Any]:
    """Retrieve candidate routes using deterministic snapshot/routing."""
    start_time = time.time()
    ctx = get_tool_context()
    try:
        pickup = Coordinate(lat=pickup_lat, lng=pickup_lng)
        drop = Coordinate(lat=drop_lat, lng=drop_lng)
        
        raw_routes = synthesize_candidate_routes_snapshot(pickup, drop)
        unique_routes = deduplicate_routes(raw_routes)
        if len(unique_routes) < 2:
            unique_routes = raw_routes
            
        routes_data = [
            {
                "route_id": r.route_id,
                "duration_sec": r.duration_sec,
                "distance_m": r.distance_m,
                "free_flow_duration_sec": r.free_flow_duration_sec or r.duration_sec,
                "geometry": [[p.lat, p.lng] for p in r.geometry]
            }
            for r in unique_routes
        ]
        end_time = time.time()
        ctx.record("get_routes", start_time, end_time, "success")
        return {"status": "success", "routes": routes_data}
    except Exception as e:
        end_time = time.time()
        ctx.record("get_routes", start_time, end_time, "error", str(e))
        logger.error(f"get_routes failed: {e}")
        return {"status": "error", "routes": [], "message": str(e)}


def execute_get_aqi(
    lat: float,
    lng: float,
    snapshot_id: Optional[str] = None,
    mode: str = "snapshot"
) -> Dict[str, Any]:
    """Retrieve station observations from snapshot fixtures or cache."""
    start_time = time.time()
    ctx = get_tool_context()
    try:
        stations = load_stations_from_fixture("delhi_stations.json")
        frozen_time = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc) if mode == "snapshot" else None
        fresh_stations = filter_fresh_stations(stations, freshness_hours=DEFAULT_CONFIG.FRESHNESS_HOURS, now=frozen_time)
        
        if not fresh_stations:
            end_time = time.time()
            ctx.record("get_aqi", start_time, end_time, "insufficient_data")
            return {"status": "insufficient_data", "stations": [], "confidence": "LOW"}
            
        stations_data = [
            {
                "station_id": s.station_id,
                "lat": s.lat,
                "lng": s.lng,
                "pm25": s.pm25,
                "timestamp": s.timestamp.isoformat(),
                "source": s.source
            }
            for s in fresh_stations
        ]
        confidence = "HIGH" if len(fresh_stations) >= 2 else "LOW"
        end_time = time.time()
        ctx.record("get_aqi", start_time, end_time, "success")
        return {"status": "success", "stations": stations_data, "confidence": confidence}
    except Exception as e:
        end_time = time.time()
        ctx.record("get_aqi", start_time, end_time, "error", str(e))
        logger.error(f"get_aqi failed: {e}")
        return {"status": "error", "stations": [], "confidence": "LOW", "message": str(e)}


def execute_compute_exposure(
    routes: List[Dict[str, Any]],
    stations: List[Dict[str, Any]],
    config_version: str = "v1"
) -> Dict[str, Any]:
    """Compute exposure for routes using Phase 1 deterministic exposure module."""
    start_time = time.time()
    ctx = get_tool_context()
    try:
        cand_routes = []
        for r in routes:
            geom = [Coordinate(lat=p[0], lng=p[1]) for p in r.get("geometry", [])]
            cand_routes.append(Route(
                route_id=r["route_id"],
                geometry=geom,
                duration_sec=r["duration_sec"],
                distance_m=r["distance_m"],
                source="tool",
                free_flow_duration_sec=r.get("free_flow_duration_sec", r["duration_sec"])
            ))
            
        obs_stations = []
        for s in stations:
            t = datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00")) if "timestamp" in s else datetime.now(timezone.utc)
            obs_stations.append(AQIStation(
                station_id=s["station_id"],
                lat=s["lat"],
                lng=s["lng"],
                pm25=s["pm25"],
                timestamp=t,
                source=s.get("source", "OpenAQ")
            ))
            
        results_data = []
        for cr in cand_routes:
            exp_res = compute_route_exposure(cr, obs_stations)
            results_data.append({
                "route_id": exp_res.route_id,
                "exposure": exp_res.estimated_integrated_pm25,
                "average_pm25": exp_res.average_pm25,
                "confidence": exp_res.confidence.value,
                "station_count_used": exp_res.station_count_used,
                "segment_count": exp_res.segment_count,
                "is_robust": exp_res.is_robust
            })
            
        end_time = time.time()
        ctx.record("compute_exposure", start_time, end_time, "success")
        return {"status": "success", "results": results_data}
    except Exception as e:
        end_time = time.time()
        ctx.record("compute_exposure", start_time, end_time, "error", str(e))
        logger.error(f"compute_exposure failed: {e}")
        return {"status": "error", "results": [], "message": str(e)}


def execute_optimize_route(
    routes: List[Dict[str, Any]],
    exposure_results: List[Dict[str, Any]],
    buffer_min: float = 5.0
) -> Dict[str, Any]:
    """Optimize and classify routes using Phase 1 optimize_routes and classify_trip."""
    start_time = time.time()
    ctx = get_tool_context()
    try:
        cand_routes = []
        for r in routes:
            geom = [Coordinate(lat=p[0], lng=p[1]) for p in r.get("geometry", [])]
            cand_routes.append(Route(
                route_id=r["route_id"],
                geometry=geom,
                duration_sec=r["duration_sec"],
                distance_m=r["distance_m"],
                source="tool",
                free_flow_duration_sec=r.get("free_flow_duration_sec", r["duration_sec"])
            ))
            
        exp_map: Dict[str, ExposureResult] = {}
        for er in exposure_results:
            rid = er["route_id"]
            exp_map[rid] = ExposureResult(
                route_id=rid,
                exposure_index=100.0,
                estimated_integrated_pm25=er["exposure"],
                average_pm25=er.get("average_pm25", 0.0),
                confidence=Confidence(er.get("confidence", "HIGH")),
                station_count_used=er.get("station_count_used", 4),
                segment_count=er.get("segment_count", 10),
                is_robust=er.get("is_robust", True)
            )
            
        opt = optimize_routes(cand_routes, exp_map, buffer_min=buffer_min)
        norm_exp = compute_relative_exposure_indices(exp_map, opt.fastest_route_id)
        
        # Robustness
        stations = load_stations_from_fixture("delhi_stations.json")
        is_robust, _ = evaluate_robustness(cand_routes, stations, buffer_min=buffer_min)
        
        fastest_exp = norm_exp[opt.fastest_route_id]
        clf = classify_trip(
            opt_result=opt,
            fastest_exposure_result=fastest_exp,
            all_exposure_results=norm_exp,
            all_routes=cand_routes,
            is_robust=is_robust,
            buffer_min=buffer_min
        )
        
        decision_data = {
            "classification": clf.outcome.value,
            "fastest_route_id": opt.fastest_route_id,
            "selected_route_id": opt.selected_route_id,
            "reduction_fraction": round(opt.reduction_percent / 100.0, 3),
            "reduction_percent": round(opt.reduction_percent, 1),
            "additional_time_sec": opt.additional_duration_min * 60.0,
            "additional_time_min": round(opt.additional_duration_min, 1),
            "confidence": fastest_exp.confidence.value,
            "robust": is_robust,
            "reward_eligible": clf.reward_eligible,
            "reward_amount_inr": 3.0 if clf.reward_eligible else 0.0
        }
        
        end_time = time.time()
        ctx.record("optimize_route", start_time, end_time, "success")
        return {"status": "success", "decision": decision_data}
    except Exception as e:
        end_time = time.time()
        ctx.record("optimize_route", start_time, end_time, "error", str(e))
        logger.error(f"optimize_route failed: {e}")
        return {"status": "error", "decision": None, "message": str(e)}


# ---------------------------------------------------------------------------
# Strands Decorated Tools
# ---------------------------------------------------------------------------

@tool
def get_routes(
    pickup_lat: float,
    pickup_lng: float,
    drop_lat: float,
    drop_lng: float,
    travel_mode: str = "Scooter"
) -> Dict[str, Any]:
    """
    Retrieve candidate traffic-aware routes between pickup and drop coordinates in Delhi NCR.
    """
    return execute_get_routes(pickup_lat, pickup_lng, drop_lat, drop_lng, travel_mode)


@tool
def get_aqi(
    lat: float,
    lng: float,
    snapshot_id: Optional[str] = None,
    mode: str = "snapshot"
) -> Dict[str, Any]:
    """
    Retrieve ambient PM2.5 air quality station observations near the given coordinates.
    """
    return execute_get_aqi(lat, lng, snapshot_id, mode)


@tool
def compute_exposure(
    routes: List[Dict[str, Any]],
    stations: List[Dict[str, Any]],
    config_version: str = "v1"
) -> Dict[str, Any]:
    """
    Compute integrated PM2.5 pollution exposure for each candidate route using IDW and spatial modifiers.
    """
    return execute_compute_exposure(routes, stations, config_version)


@tool
def optimize_route(
    routes: List[Dict[str, Any]],
    exposure_results: List[Dict[str, Any]],
    buffer_min: float = 5.0
) -> Dict[str, Any]:
    """
    Evaluate candidate routes against time buffer constraint and classify the operational state.
    """
    return execute_optimize_route(routes, exposure_results, buffer_min)
