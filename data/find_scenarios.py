"""
AirShield Scenario Discovery Tool (Phase 2).
Discovers high-quality, realistic demonstration scenarios across Delhi NCR:
- Scenario A: AVOIDABLE (Meaningful exposure reduction within operational buffer)
- Scenario B: UNAVOIDABLE (Safer route exists but exceeds operational buffer)

Uses the exact same Phase 1 deterministic pipeline for 100% reproducibility.
"""

from __future__ import annotations
import os
import sys
import json
import math
import random
import logging
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Any

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

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
from backend.core.config import Config, DEFAULT_CONFIG
from backend.core.routes import (
    haversine_distance,
    calculate_route_distance,
    deduplicate_routes,
    sort_routes_by_duration,
    AmazonLocationRouteProvider,
    FixtureRouteProvider
)
from backend.core.aqi import (
    select_nearest_stations,
    filter_fresh_stations,
    FixtureAQIProvider,
    OpenAQProvider
)
from backend.core.exposure import (
    compute_route_exposure,
    compute_relative_exposure_indices,
    evaluate_robustness
)
from backend.core.optimize import optimize_routes, validate_buffer
from backend.core.classify import classify_trip
from tests.conftest import load_stations_from_fixture

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("airshield.scenario_discovery")

CACHE_DIR = PROJECT_ROOT / "data" / "cache" / "routes"
SCENARIOS_DIR = PROJECT_ROOT / "data" / "scenarios"
CONFIG_FILE = PROJECT_ROOT / "data" / "scenario_config.json"

# Key urban delivery hubs across Delhi NCR for realistic spatial sampling
DELHI_NCR_HUBS = [
    {"name": "Connaught Place", "lat": 28.6328, "lng": 77.2197, "area": "Central"},
    {"name": "Chandni Chowk", "lat": 28.6506, "lng": 77.2303, "area": "North-Central"},
    {"name": "Karol Bagh", "lat": 28.6514, "lng": 77.1907, "area": "West-Central"},
    {"name": "South Extension", "lat": 28.5694, "lng": 77.2206, "area": "South"},
    {"name": "Hauz Khas", "lat": 28.5494, "lng": 77.1930, "area": "South"},
    {"name": "Vasant Kunj", "lat": 28.5244, "lng": 77.1588, "area": "South-Ridge"},
    {"name": "Saket", "lat": 28.5245, "lng": 77.2167, "area": "South"},
    {"name": "Nehru Place", "lat": 28.5494, "lng": 77.2530, "area": "South-East"},
    {"name": "Lajpat Nagar", "lat": 28.5677, "lng": 77.2433, "area": "South-East"},
    {"name": "Mayur Vihar", "lat": 28.6083, "lng": 77.2954, "area": "East"},
    {"name": "Laxmi Nagar", "lat": 28.6304, "lng": 77.2773, "area": "East"},
    {"name": "Punjabi Bagh", "lat": 28.6675, "lng": 77.1260, "area": "West"},
    {"name": "Rajouri Garden", "lat": 28.6415, "lng": 77.1209, "area": "West"},
    {"name": "Janakpuri", "lat": 28.6219, "lng": 77.0878, "area": "West"},
    {"name": "Rohini / DTU", "lat": 28.7495, "lng": 77.1172, "area": "North-West"},
    {"name": "Pitampura", "lat": 28.6990, "lng": 77.1384, "area": "North-West"},
    {"name": "Civil Lines", "lat": 28.6816, "lng": 77.2227, "area": "North"},
    {"name": "Dwarka", "lat": 28.5823, "lng": 77.0500, "area": "South-West"},
    {"name": "Cyber City Gurgaon", "lat": 28.4900, "lng": 77.0900, "area": "South-West-NCR"},
    {"name": "Noida Sector 18", "lat": 28.5700, "lng": 77.3200, "area": "East-NCR"}
]


def load_discovery_config(custom_path: Optional[str] = None) -> dict:
    """Load scenario discovery configuration JSON with sensible defaults."""
    cfg_path = Path(custom_path) if custom_path else CONFIG_FILE
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "city": "Delhi NCR",
        "min_trip_distance_km": 3.0,
        "max_trip_distance_km": 12.0,
        "max_detour_ratio": 2.5,
        "sample_count": 100,
        "random_seed": 42,
        "buffer_minutes": 5.0,
        "reduction_threshold": 0.15,
        "low_pm25_threshold": 60.0,
        "high_pm25_threshold": 90.0,
        "minimum_confidence": "MEDIUM",
        "max_attempts": 150,
        "snapshot_id": "demo_v1",
        "snapshot_timestamp": "2026-10-08T12:00:00Z"
    }


def get_cache_key(pickup: Coordinate, drop: Coordinate, travel_mode: str = "Scooter") -> str:
    """Deterministic hash key for route request caching."""
    key_str = f"{round(pickup.lat, 4)}_{round(pickup.lng, 4)}_{round(drop.lat, 4)}_{round(drop.lng, 4)}_{travel_mode}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()[:16]


def get_cached_routes(cache_key: str) -> Optional[list[Route]]:
    """Retrieve cached routes from disk if available."""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            routes = []
            for r in data.get("routes", []):
                geom = [Coordinate(lat=pt["lat"], lng=pt["lng"]) for pt in r["geometry"]]
                routes.append(
                    Route(
                        route_id=r["route_id"],
                        geometry=geom,
                        duration_sec=float(r["duration_sec"]),
                        distance_m=float(r["distance_m"]),
                        source=r.get("source", "cached"),
                        free_flow_duration_sec=r.get("free_flow_duration_sec"),
                        has_traffic=r.get("has_traffic", True)
                    )
                )
            return routes
        except Exception as e:
            logger.debug(f"Cache read error for {cache_key}: {e}")
    return None


def save_cached_routes(cache_key: str, routes: list[Route]) -> None:
    """Save routes to local disk cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{cache_key}.json"
    data = {
        "cache_key": cache_key,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "routes": [
            {
                "route_id": r.route_id,
                "duration_sec": r.duration_sec,
                "distance_m": r.distance_m,
                "source": r.source,
                "free_flow_duration_sec": r.free_flow_duration_sec,
                "has_traffic": r.has_traffic,
                "geometry": [{"lat": pt.lat, "lng": pt.lng} for pt in r.geometry]
            }
            for r in routes
        ]
    }
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def generate_candidate_pairs(
    sample_count: int = 100,
    min_dist_km: float = 3.0,
    max_dist_km: float = 12.0,
    random_seed: int = 42
) -> list[tuple[Coordinate, Coordinate, str, str]]:
    """
    Generate realistic delivery pickup/drop pairs across Delhi NCR urban hubs.
    Guarantees strict determinism with seeded random sampling.
    """
    rng = random.Random(random_seed)
    pairs = []
    attempts = 0
    max_attempts = sample_count * 15

    while len(pairs) < sample_count and attempts < max_attempts:
        attempts += 1
        h1 = rng.choice(DELHI_NCR_HUBS)
        h2 = rng.choice(DELHI_NCR_HUBS)

        if h1["name"] == h2["name"]:
            continue

        # Slight random jitter (±500m) to represent realistic doorstep pickups/drops
        jitter_lat1 = h1["lat"] + rng.uniform(-0.005, 0.005)
        jitter_lng1 = h1["lng"] + rng.uniform(-0.005, 0.005)
        jitter_lat2 = h2["lat"] + rng.uniform(-0.005, 0.005)
        jitter_lng2 = h2["lng"] + rng.uniform(-0.005, 0.005)

        c1 = Coordinate(lat=round(jitter_lat1, 4), lng=round(jitter_lng1, 4))
        c2 = Coordinate(lat=round(jitter_lat2, 4), lng=round(jitter_lng2, 4))

        dist_km = haversine_distance(c1, c2) / 1000.0
        if min_dist_km <= dist_km <= max_dist_km:
            pairs.append((c1, c2, h1["name"], h2["name"]))

    return pairs


def synthesize_candidate_routes_snapshot(pickup: Coordinate, drop: Coordinate) -> list[Route]:
    """
    Generate realistic candidate alternative routes for Delhi NCR in offline snapshot mode.
    Simulates:
    - Route 1 (R1_FAST): Direct arterial route (fastest duration, passes high-traffic central corridors)
    - Route 2 (R2_SAFER): Green Ridge / Ring Road bypass (diverts around central pollution hotspots, +2 to +3 min)
    - Route 3 (R3_SLOW): Outer perimeter ring bypass (+6 to +7 min, exceeds 5 min buffer)
    - Route 4 (R4_DUPLICATE): Slight variation of R1 (>92% overlap, testing deduplication)
    """
    straight_dist_m = haversine_distance(pickup, drop)
    if straight_dist_m <= 0:
        return []

    speed_mps = 5.8   # ~21 km/h realistic Delhi urban scooter delivery speed
    r1_dist_m = straight_dist_m * 1.15
    r1_dur_sec = r1_dist_m / speed_mps

    dlat = drop.lat - pickup.lat
    dlng = drop.lng - pickup.lng
    mag = math.sqrt(dlat * dlat + dlng * dlng)
    if mag == 0:
        return []

    # Perpendicular unit normal vector
    n_lat = -dlng / mag
    n_lng = dlat / mag

    # Midpoint
    mid_lat = (pickup.lat + drop.lat) / 2.0
    mid_lng = (pickup.lng + drop.lng) / 2.0

    # Direction towards cleaner South Ridge (28.5800, 77.1650)
    ridge_lat, ridge_lng = 28.5800, 77.1650
    to_ridge_lat = ridge_lat - mid_lat
    to_ridge_lng = ridge_lng - mid_lng
    dot_ridge = (to_ridge_lat * n_lat) + (to_ridge_lng * n_lng)
    ridge_sign = 1.0 if dot_ridge >= 0 else -1.0

    # 1. R1_FAST: Direct arterial route (slightly pulled toward central hotspot 28.6300, 77.2200)
    to_hotspot_lat = 28.6300 - mid_lat
    to_hotspot_lng = 77.2200 - mid_lng
    dot_hotspot = (to_hotspot_lat * n_lat) + (to_hotspot_lng * n_lng)
    hotspot_sign = 1.0 if dot_hotspot >= 0 else -1.0

    m1 = Coordinate(
        lat=round(mid_lat + (0.015 * hotspot_sign * n_lat), 5),
        lng=round(mid_lng + (0.015 * hotspot_sign * n_lng), 5)
    )
    r1_geom = [pickup, m1, drop]
    r1 = Route("R1_FAST", r1_geom, duration_sec=round(r1_dur_sec, 1), distance_m=round(r1_dist_m, 1), source="synthetic_delhi")

    # Corridor determination based on coordinates hash
    corridor_hash = int(hashlib.md5(f"{pickup.lat}_{pickup.lng}_{drop.lat}_{drop.lng}".encode()).hexdigest(), 16)
    has_intermediate_alternative = (corridor_hash % 3 != 0)

    routes = [r1]

    if has_intermediate_alternative:
        # 2. R2_SAFER: Diverts towards South/West Ridge green corridor (+2.0 min, within buffer)
        offset2 = min(0.040, max(0.018, mag * 0.40))
        m2 = Coordinate(
            lat=round(mid_lat + (offset2 * ridge_sign * n_lat), 5),
            lng=round(mid_lng + (offset2 * ridge_sign * n_lng), 5)
        )
        r2_geom = [pickup, m2, drop]
        r2_dist_m = calculate_route_distance(r2_geom)
        r2_dur_sec = r1_dur_sec + 120.0  # +2.0 min
        r2 = Route("R2_SAFER", r2_geom, duration_sec=round(r2_dur_sec, 1), distance_m=round(r2_dist_m, 1), source="synthetic_delhi")
        routes.append(r2)

    # 3. R3_SLOW: Wide outer bypass (+6.5 min, exceeds 5 min buffer)
    offset3 = min(0.070, max(0.035, mag * 0.65))
    m3 = Coordinate(
        lat=round(mid_lat + (offset3 * ridge_sign * n_lat), 5),
        lng=round(mid_lng + (offset3 * ridge_sign * n_lng), 5)
    )
    r3_geom = [pickup, m3, drop]
    r3_dist_m = calculate_route_distance(r3_geom)
    r3_dur_sec = r1_dur_sec + 390.0  # +6.5 min (exceeds 5 min buffer)
    r3 = Route("R3_SLOW", r3_geom, duration_sec=round(r3_dur_sec, 1), distance_m=round(r3_dist_m, 1), source="synthetic_delhi")
    routes.append(r3)

    # 4. R4_DUPLICATE_R1: 96% overlapping near-duplicate
    m4 = Coordinate(lat=m1.lat + 0.0001, lng=m1.lng + 0.0001)
    r4_geom = [pickup, m4, drop]
    r4_dist_m = r1_dist_m + 10.0
    r4_dur_sec = r1_dur_sec + 5.0
    r4 = Route("R4_DUPLICATE_R1", r4_geom, duration_sec=round(r4_dur_sec, 1), distance_m=round(r4_dist_m, 1), source="synthetic_delhi")
    routes.append(r4)

    return routes


def score_scenario_a(
    opt: OptimizationResult,
    clf: ClassificationResult,
    routes: list[Route],
    exposure_map: dict[str, ExposureResult]
) -> float:
    """
    Score quality of Scenario A candidate.
    Higher score = better demo scenario (larger exposure reduction, minimal extra time, HIGH confidence).
    """
    if clf.outcome != RouteOutcome.AVOIDABLE:
        return -1.0

    reduction_pct = opt.reduction_percent
    extra_time_min = opt.additional_duration_min
    conf_bonus = 15.0 if clf.confidence == Confidence.HIGH else 5.0
    route_count_bonus = len(opt.feasible_route_ids) * 3.0

    # Objective: Maximize reduction while minimizing extra time
    quality = (reduction_pct * 1.5) - (extra_time_min * 4.0) + conf_bonus + route_count_bonus
    return quality


def score_scenario_b(
    opt: OptimizationResult,
    clf: ClassificationResult,
    routes: list[Route],
    exposure_map: dict[str, ExposureResult],
    buffer_min: float = 5.0
) -> float:
    """
    Score quality of Scenario B candidate.
    Prefers cases where a genuinely cleaner route exists that is just slightly outside the buffer (+5.5 to +8 min).
    """
    if clf.outcome != RouteOutcome.UNAVOIDABLE or not clf.better_outside_buffer:
        return -1.0

    reduction_pct = clf.outside_buffer_reduction_percent
    extra_time_min = clf.extra_minutes_needed  # Total extra time beyond fastest
    over_buffer_min = max(0.0, extra_time_min - buffer_min)

    conf_bonus = 15.0 if clf.confidence == Confidence.HIGH else 5.0

    # Penalize routes that are excessively far outside the buffer (>10 min extra is less relatable)
    time_penalty = over_buffer_min * 3.0

    quality = (reduction_pct * 1.5) - time_penalty + conf_bonus
    return quality


def evaluate_candidate_pair(
    pickup: Coordinate,
    drop: Coordinate,
    stations: list[AQIStation],
    buffer_min: float = 5.0,
    reduction_threshold: float = 0.15,
    mode: str = "snapshot",
    location_provider: Optional[AmazonLocationRouteProvider] = None,
    max_detour_ratio: float = 2.5
) -> dict:
    """
    Evaluate a single candidate pickup/drop pair using the exact Phase 1 engine.
    """
    cache_key = get_cache_key(pickup, drop)
    routes = get_cached_routes(cache_key)

    if routes is None:
        if mode == "live" and location_provider is not None:
            try:
                # Live query
                routes = location_provider.get_routes(pickup, drop, travel_mode="Car")
            except Exception as e:
                logger.debug(f"Live route query failed: {e}")
                return {"status": "rejected", "reason": "routing_error"}
        else:
            routes = synthesize_candidate_routes_snapshot(pickup, drop)

        save_cached_routes(cache_key, routes)

    # 1. Route validation & deduplication
    straight_dist_m = haversine_distance(pickup, drop)
    if straight_dist_m <= 0:
        return {"status": "rejected", "reason": "zero_distance"}

    # Detour ratio filter
    for r in routes:
        ratio = r.distance_m / straight_dist_m
        if ratio > max_detour_ratio:
            return {"status": "rejected", "reason": "unrealistic_detour"}

    unique_routes = deduplicate_routes(routes)
    if len(unique_routes) < 2:
        return {"status": "rejected", "reason": "one_route_only"}

    # 2. Exposure calculation
    exp_map: dict[str, ExposureResult] = {}
    for r in unique_routes:
        exp = compute_route_exposure(r, stations)
        exp_map[r.route_id] = exp

    # 3. Optimization
    opt = optimize_routes(unique_routes, exp_map, buffer_min=buffer_min)

    # 4. Normalized relative exposure
    normalized_exp = compute_relative_exposure_indices(exp_map, opt.fastest_route_id)

    # 5. Robustness check
    is_robust, _ = evaluate_robustness(unique_routes, stations, buffer_min=buffer_min)

    # 6. Classification
    fastest_exp = normalized_exp[opt.fastest_route_id]
    clf = classify_trip(
        opt_result=opt,
        fastest_exposure_result=fastest_exp,
        all_exposure_results=normalized_exp,
        all_routes=unique_routes,
        is_robust=is_robust,
        buffer_min=buffer_min
    )

    return {
        "status": "valid",
        "pickup": pickup,
        "drop": drop,
        "routes": unique_routes,
        "exposure_map": normalized_exp,
        "optimization": opt,
        "is_robust": is_robust,
        "classification": clf,
        "quality_a": score_scenario_a(opt, clf, unique_routes, normalized_exp),
        "quality_b": score_scenario_b(opt, clf, unique_routes, normalized_exp, buffer_min=buffer_min)
    }


def find_scenarios(
    mode: str = "snapshot",
    sample_count: int = 100,
    random_seed: int = 42,
    buffer_min: float = 5.0,
    config_dict: Optional[dict] = None
) -> dict:
    """
    Search and rank candidate scenarios across Delhi NCR to discover Scenario A and Scenario B.
    """
    cfg = config_dict or load_discovery_config()
    red_thresh = cfg.get("reduction_threshold", 0.15)
    max_detour = cfg.get("max_detour_ratio", 2.5)

    # Load frozen AQI snapshot (or live in live mode)
    if mode == "live":
        aqi_prov = OpenAQProvider()
        stations = aqi_prov.get_stations(Coordinate(28.6139, 77.2090), max_distance_km=25.0)
    else:
        stations = load_stations_from_fixture("delhi_stations.json")

    location_prov = AmazonLocationRouteProvider() if mode == "live" else None

    # Generate candidate pairs
    pairs = generate_candidate_pairs(
        sample_count=sample_count,
        min_dist_km=cfg.get("min_trip_distance_km", 3.0),
        max_dist_km=cfg.get("max_trip_distance_km", 12.0),
        random_seed=random_seed
    )

    stats = {
        "total_sampled": len(pairs),
        "valid_comparisons": 0,
        "rejections": {},
        "classifications": {
            RouteOutcome.LOW.value: 0,
            RouteOutcome.AVOIDABLE.value: 0,
            RouteOutcome.UNAVOIDABLE.value: 0,
            RouteOutcome.INSUFFICIENT_DATA.value: 0
        },
        "exposure_reductions": []
    }

    candidates_a = []
    candidates_b = []

    for idx, (p1, p2, name1, name2) in enumerate(pairs, 1):
        eval_res = evaluate_candidate_pair(
            pickup=p1,
            drop=p2,
            stations=stations,
            buffer_min=buffer_min,
            reduction_threshold=red_thresh,
            mode=mode,
            location_provider=location_prov,
            max_detour_ratio=max_detour
        )

        if eval_res["status"] != "valid":
            reason = eval_res["reason"]
            stats["rejections"][reason] = stats["rejections"].get(reason, 0) + 1
            continue

        stats["valid_comparisons"] += 1
        clf: ClassificationResult = eval_res["classification"]
        opt: OptimizationResult = eval_res["optimization"]

        stats["classifications"][clf.outcome.value] += 1
        if opt.reduction_percent > 0:
            stats["exposure_reductions"].append(opt.reduction_percent)

        if clf.outcome == RouteOutcome.AVOIDABLE and eval_res["quality_a"] > 0:
            candidates_a.append((eval_res["quality_a"], eval_res, name1, name2))

        if clf.outcome == RouteOutcome.UNAVOIDABLE and eval_res["quality_b"] > 0:
            candidates_b.append((eval_res["quality_b"], eval_res, name1, name2))

    # Rank and select best candidates
    best_a = max(candidates_a, key=lambda x: x[0])[1] if candidates_a else None
    best_b = max(candidates_b, key=lambda x: x[0])[1] if candidates_b else None

    return {
        "stats": stats,
        "best_scenario_a": best_a,
        "best_scenario_b": best_b,
        "snapshot_id": cfg.get("snapshot_id", "demo_v1"),
        "random_seed": random_seed,
        "buffer_minutes": buffer_min,
        "reduction_threshold": red_thresh
    }


def format_scenario_dict(scenario_id: str, eval_res: dict, snapshot_id: str) -> dict:
    """Format evaluated candidate into canonical JSON structure for scenarios_v1.json."""
    clf: ClassificationResult = eval_res["classification"]
    opt: OptimizationResult = eval_res["optimization"]
    routes: list[Route] = eval_res["routes"]
    exp_map: dict[str, ExposureResult] = eval_res["exposure_map"]

    fastest_r = next(r for r in routes if r.route_id == opt.fastest_route_id)
    selected_r = next(r for r in routes if r.route_id == opt.selected_route_id)

    # Collect station IDs used
    station_ids = list(set(
        st.station_id for r in routes
        for st in select_nearest_stations(load_stations_from_fixture("delhi_stations.json"), r.geometry[0], max_stations=4)
    ))

    # Detailed candidate routes for exact replay
    route_details = []
    for r in routes:
        e = exp_map[r.route_id]
        route_details.append({
            "route_id": r.route_id,
            "duration_sec": r.duration_sec,
            "duration_min": round(r.duration_min, 1),
            "distance_m": r.distance_m,
            "distance_km": round(r.distance_km, 2),
            "source": r.source,
            "exposure_index": round(e.exposure_index, 1),
            "estimated_integrated_pm25": round(e.estimated_integrated_pm25, 1),
            "average_pm25": round(e.average_pm25, 1),
            "confidence": e.confidence.value,
            "is_feasible": r.route_id in opt.feasible_route_ids,
            "additional_time_vs_fastest_sec": round(max(0.0, r.duration_sec - fastest_r.duration_sec), 1),
            "geometry": [{"lat": pt.lat, "lng": pt.lng} for pt in r.geometry]
        })

    return {
        "scenario_id": scenario_id,
        "pickup": {"lat": eval_res["pickup"].lat, "lng": eval_res["pickup"].lng},
        "drop": {"lat": eval_res["drop"].lat, "lng": eval_res["drop"].lng},
        "fastest_route_id": opt.fastest_route_id,
        "selected_route_id": opt.selected_route_id,
        "fastest_duration_sec": fastest_r.duration_sec,
        "selected_duration_sec": selected_r.duration_sec,
        "additional_time_sec": opt.additional_duration_sec,
        "additional_time_min": round(opt.additional_duration_min, 1),
        "fastest_exposure": round(opt.fastest_exposure, 1),
        "selected_exposure": round(opt.selected_exposure, 1),
        "reduction_fraction": round(opt.reduction_fraction, 4),
        "reduction_percent": round(opt.reduction_percent, 1),
        "classification": clf.outcome.value,
        "confidence": clf.confidence.value,
        "is_robust": eval_res["is_robust"],
        "better_outside_buffer": clf.better_outside_buffer,
        "extra_minutes_needed": round(clf.extra_minutes_needed, 1),
        "outside_buffer_reduction_percent": round(clf.outside_buffer_reduction_percent, 1),
        "reward_eligible": clf.reward_eligible,
        "benefit_eligible": clf.benefit_eligible,
        "station_ids": station_ids,
        "snapshot_id": snapshot_id,
        "modelled": True,
        "candidate_routes": route_details
    }


def save_scenarios_json(output_path: Path, discovery_res: dict) -> None:
    """Save canonical scenarios_v1.json artifact."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = {
        "version": "v1",
        "city": "Delhi NCR",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "random_seed": discovery_res["random_seed"],
        "snapshot_id": discovery_res["snapshot_id"],
        "config": {
            "buffer_minutes": discovery_res["buffer_minutes"],
            "reduction_threshold": discovery_res["reduction_threshold"]
        },
        "scenario_a": format_scenario_dict("A001", discovery_res["best_scenario_a"], discovery_res["snapshot_id"]) if discovery_res["best_scenario_a"] else None,
        "scenario_b": format_scenario_dict("B001", discovery_res["best_scenario_b"], discovery_res["snapshot_id"]) if discovery_res["best_scenario_b"] else None
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    logger.info(f"Scenarios successfully written to: {output_path}")


def replay_scenario(scenario_id: str, scenarios_file: Path) -> bool:
    """Reload and re-execute scenario from JSON artifact to prove exact reproducibility."""
    print("=" * 60)
    print(f"REPLAYING SCENARIO: {scenario_id}")
    print("=" * 60)
    if not scenarios_file.exists():
        print(f"Error: {scenarios_file} does not exist.")
        return False

    with open(scenarios_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    target_scenario = None
    if (data.get("scenario_a") or {}).get("scenario_id") == scenario_id:
        target_scenario = data["scenario_a"]
    elif (data.get("scenario_b") or {}).get("scenario_id") == scenario_id:
        target_scenario = data["scenario_b"]

    if not target_scenario:
        print(f"Scenario ID {scenario_id} not found in {scenarios_file}.")
        return False

    # Reconstruct route objects from stored candidates
    routes = []
    for r in target_scenario["candidate_routes"]:
        geom = [Coordinate(lat=pt["lat"], lng=pt["lng"]) for pt in r["geometry"]]
        routes.append(
            Route(
                route_id=r["route_id"],
                geometry=geom,
                duration_sec=float(r["duration_sec"]),
                distance_m=float(r["distance_m"]),
                source="replay_cache"
            )
        )

    stations = load_stations_from_fixture("delhi_stations.json")
    buffer_min = float(data.get("config", {}).get("buffer_minutes", 5.0))

    # Re-run pipeline
    exp_map = {r.route_id: compute_route_exposure(r, stations) for r in routes}
    opt = optimize_routes(routes, exp_map, buffer_min=buffer_min)
    norm_exp = compute_relative_exposure_indices(exp_map, opt.fastest_route_id)
    is_robust, _ = evaluate_robustness(routes, stations, buffer_min=buffer_min)
    clf = classify_trip(opt, norm_exp[opt.fastest_route_id], norm_exp, routes, is_robust=is_robust, buffer_min=buffer_min)

    print(f"Original Outcome:    {target_scenario['classification']}")
    print(f"Replayed Outcome:    {clf.outcome.value}")
    print(f"Original Selection:  {target_scenario['selected_route_id']}")
    print(f"Replayed Selection:  {opt.selected_route_id}")
    print(f"Original Reduction:  {target_scenario['reduction_percent']}%")
    print(f"Replayed Reduction:  {round(opt.reduction_percent, 1)}%")

    matches = (
        target_scenario["classification"] == clf.outcome.value
        and target_scenario["selected_route_id"] == opt.selected_route_id
        and math.isclose(target_scenario["reduction_percent"], opt.reduction_percent, abs_tol=0.1)
    )

    if matches:
        print("\n[SUCCESS] Scenario replay matches stored artifact perfectly (100% Deterministic)!\n")
        return True
    else:
        print("\n[FAIL] Replay mismatch detected.\n")
        return False


def run_buffer_sweep(discovery_res: dict) -> None:
    """Analyze scenario candidate sensitivity across 3, 5, 8, 10 minute buffers."""
    print("\n" + "=" * 60)
    print("BUFFER SENSITIVITY SWEEP (3 min, 5 min, 8 min, 10 min)")
    print("=" * 60)
    buffers = [3.0, 5.0, 8.0, 10.0]
    stations = load_stations_from_fixture("delhi_stations.json")
    pairs = generate_candidate_pairs(sample_count=50, random_seed=discovery_res["random_seed"])

    print(f"{'Buffer (min)':<14} | {'Avoidable %':<14} | {'Unavoidable %':<14} | {'Median Red. %':<14}")
    print("-" * 62)

    for b in buffers:
        avoidable_cnt = 0
        unavoidable_cnt = 0
        reductions = []
        valid_cnt = 0

        for p1, p2, _, _ in pairs:
            eval_res = evaluate_candidate_pair(p1, p2, stations, buffer_min=b)
            if eval_res["status"] == "valid":
                valid_cnt += 1
                clf = eval_res["classification"]
                opt = eval_res["optimization"]
                if clf.outcome == RouteOutcome.AVOIDABLE:
                    avoidable_cnt += 1
                    reductions.append(opt.reduction_percent)
                elif clf.outcome == RouteOutcome.UNAVOIDABLE:
                    unavoidable_cnt += 1

        avoidable_pct = (avoidable_cnt / valid_cnt * 100.0) if valid_cnt > 0 else 0
        unavoidable_pct = (unavoidable_cnt / valid_cnt * 100.0) if valid_cnt > 0 else 0
        med_red = sorted(reductions)[len(reductions)//2] if reductions else 0.0

        print(f"{b:<14.1f} | {avoidable_pct:<13.1f}% | {unavoidable_pct:<13.1f}% | {med_red:<13.1f}%")

    print("=" * 60 + "\n")


def run_threshold_sweep(discovery_res: dict) -> None:
    """Analyze sensitivity across 10%, 15%, 20% reduction thresholds."""
    print("\n" + "=" * 60)
    print("REDUCTION THRESHOLD SENSITIVITY SWEEP (10%, 15%, 20%)")
    print("=" * 60)
    thresholds = [0.10, 0.15, 0.20]
    stations = load_stations_from_fixture("delhi_stations.json")
    pairs = generate_candidate_pairs(sample_count=50, random_seed=discovery_res["random_seed"])

    print(f"{'Threshold':<14} | {'Avoidable Share':<16} | {'Unavoidable Share':<18}")
    print("-" * 60)

    for t in thresholds:
        avoidable_cnt = 0
        unavoidable_cnt = 0
        valid_cnt = 0

        for p1, p2, _, _ in pairs:
            eval_res = evaluate_candidate_pair(p1, p2, stations, buffer_min=5.0, reduction_threshold=t)
            if eval_res["status"] == "valid":
                valid_cnt += 1
                clf = eval_res["classification"]
                if clf.outcome == RouteOutcome.AVOIDABLE:
                    avoidable_cnt += 1
                elif clf.outcome == RouteOutcome.UNAVOIDABLE:
                    unavoidable_cnt += 1

        av_pct = (avoidable_cnt / valid_cnt * 100.0) if valid_cnt > 0 else 0
        unav_pct = (unavoidable_cnt / valid_cnt * 100.0) if valid_cnt > 0 else 0
        print(f"{t*100:<13.0f}% | {av_pct:<15.1f}% | {unav_pct:<17.1f}%")

    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="AirShield Scenario Discovery")
    parser.add_argument("--mode", choices=["snapshot", "live"], default="snapshot", help="Discovery mode (default: snapshot)")
    parser.add_argument("--sample-count", type=int, default=100, help="Number of candidate pairs to sample")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for sampling reproducibility")
    parser.add_argument("--buffer", type=float, default=5.0, help="Operational time buffer in minutes")
    parser.add_argument("--output", type=str, default="data/scenarios/scenarios_v1.json", help="Output scenarios JSON file path")
    parser.add_argument("--diagnostics", action="store_true", help="Print detailed diagnostic distributions")
    parser.add_argument("--buffer-sweep", action="store_true", help="Run buffer sensitivity sweep analysis")
    parser.add_argument("--threshold-sweep", action="store_true", help="Run threshold sensitivity sweep analysis")
    parser.add_argument("--replay", type=str, default=None, help="Replay a discovered scenario ID (e.g. A001)")

    args = parser.parse_args()
    out_file = PROJECT_ROOT / args.output

    if args.replay:
        success = replay_scenario(args.replay, out_file)
        sys.exit(0 if success else 1)

    print("\n" + "#" * 60)
    print(f"  AIRSHIELD SCENARIO DISCOVERY (Mode: {args.mode.upper()})")
    print("#" * 60 + "\n")

    discovery = find_scenarios(
        mode=args.mode,
        sample_count=args.sample_count,
        random_seed=args.seed,
        buffer_min=args.buffer
    )

    stats = discovery["stats"]
    best_a = discovery["best_scenario_a"]
    best_b = discovery["best_scenario_b"]

    print("=" * 60)
    print("DISCOVERY SUMMARY")
    print("=" * 60)
    print(f"City:                       Delhi NCR")
    print(f"Snapshot ID:                {discovery['snapshot_id']}")
    print(f"Random Seed:                {discovery['random_seed']}")
    print(f"Candidates Sampled:         {stats['total_sampled']}")
    print(f"Valid Comparisons:          {stats['valid_comparisons']}")
    print(f"Rejected:                   {sum(stats['rejections'].values())}")
    for k, v in stats["rejections"].items():
        print(f"  - {k}: {v}")

    print("\nClassifications:")
    for k, v in stats["classifications"].items():
        print(f"  - {k}: {v} ({(v/stats['valid_comparisons']*100.0) if stats['valid_comparisons']>0 else 0:.1f}%)")

    if stats["exposure_reductions"]:
        reds = sorted(stats["exposure_reductions"])
        p25 = reds[int(len(reds)*0.25)]
        med = reds[int(len(reds)*0.50)]
        p75 = reds[int(len(reds)*0.75)]
        max_r = reds[-1]
        print(f"\nExposure Reduction Distribution (Feasible):")
        print(f"  p25: {p25:.1f}% | Median: {med:.1f}% | p75: {p75:.1f}% | Max: {max_r:.1f}%")

    # ----------------------------------------------------
    # Print Best Scenario A
    # ----------------------------------------------------
    print("\n" + "=" * 60)
    print("BEST SCENARIO A (AVOIDABLE EXPOSURE)")
    print("=" * 60)
    if best_a:
        opt_a: OptimizationResult = best_a["optimization"]
        clf_a: ClassificationResult = best_a["classification"]
        p_a, d_a = best_a["pickup"], best_a["drop"]
        print(f"Pickup:             ({p_a.lat}, {p_a.lng})")
        print(f"Drop:               ({d_a.lat}, {d_a.lng})")
        print(f"Fastest Route:      {opt_a.fastest_route_id} ({best_a['exposure_map'][opt_a.fastest_route_id].average_pm25:.1f} ug/m3)")
        print(f"Recommended Route:  {opt_a.selected_route_id}")
        print(f"Additional Time:    +{opt_a.additional_duration_min:.1f} min")
        print(f"Exposure Reduction: {opt_a.reduction_percent:.1f}%")
        print(f"Spatial Confidence: {clf_a.confidence.value}")
        print(f"Model Robustness:   {'YES' if best_a['is_robust'] else 'NO'}")
        print(f"Classification:     {clf_a.outcome.value}")
    else:
        print("[FAIL] No valid Scenario A found under current configuration!")

    # ----------------------------------------------------
    # Print Best Scenario B
    # ----------------------------------------------------
    print("\n" + "=" * 60)
    print("BEST SCENARIO B (UNAVOIDABLE WITHIN BUFFER)")
    print("=" * 60)
    if best_b:
        opt_b: OptimizationResult = best_b["optimization"]
        clf_b: ClassificationResult = best_b["classification"]
        p_b, d_b = best_b["pickup"], best_b["drop"]
        print(f"Pickup:             ({p_b.lat}, {p_b.lng})")
        print(f"Drop:               ({d_b.lat}, {d_b.lng})")
        print(f"Fastest Route:      {opt_b.fastest_route_id}")
        print(f"Cleaner Route:      Exists outside buffer")
        print(f"Extra Time Needed:  +{clf_b.extra_minutes_needed:.1f} min (Buffer: +{args.buffer} min)")
        print(f"Exposure Reduction: {clf_b.outside_buffer_reduction_percent:.1f}%")
        print(f"Spatial Confidence: {clf_b.confidence.value}")
        print(f"Model Robustness:   {'YES' if best_b['is_robust'] else 'NO'}")
        print(f"Classification:     {clf_b.outcome.value}")
    else:
        print("[FAIL] No valid Scenario B found under current configuration!")

    if not best_a or not best_b:
        print("\n[FAIL] Scenario discovery failed to identify both required demonstration scenarios.")
        sys.exit(1)

    # Save artifact
    save_scenarios_json(out_file, discovery)

    if args.buffer_sweep:
        run_buffer_sweep(discovery)

    if args.threshold_sweep:
        run_threshold_sweep(discovery)

    print("\n[SUCCESS] Scenario discovery complete.\n")


if __name__ == "__main__":
    main()
