"""
AirShield Local Deterministic Engine Demonstration.
Runs pure Python offline end-to-end scenarios without external network calls.
Optional live mode supported with --live flag.
"""

from __future__ import annotations
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.core.models import Coordinate, RouteOutcome, Confidence
from backend.core.routes import FixtureRouteProvider, deduplicate_routes
from backend.core.aqi import FixtureAQIProvider
from backend.core.exposure import (
    compute_route_exposure,
    compute_relative_exposure_indices,
    evaluate_robustness
)
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from tests.conftest import load_routes_from_fixture, load_stations_from_fixture


def run_scenario(
    title: str,
    routes_file: str,
    aqi_file: str,
    buffer_min: float,
    pickup: Coordinate,
    drop: Coordinate
):
    print("=" * 60)
    print(f"  SCENARIO: {title}")
    print("=" * 60)
    print(f"Pickup:      ({pickup.lat}, {pickup.lng}) [Central Delhi]")
    print(f"Drop:        ({drop.lat}, {drop.lng}) [North Delhi]")
    print(f"Time Buffer: {buffer_min} minutes\n")

    # 1. Load routes & stations from deterministic snapshot fixtures
    raw_routes = load_routes_from_fixture(routes_file)
    routes = deduplicate_routes(raw_routes)
    frozen_time = datetime(2026, 10, 8, 12, 0, 0, tzinfo=timezone.utc)
    stations = load_stations_from_fixture(aqi_file)

    route_prov = FixtureRouteProvider(routes)
    aqi_prov = FixtureAQIProvider(stations)

    candidate_routes = route_prov.get_routes(pickup, drop)
    fresh_stations = aqi_prov.get_stations(pickup, max_distance_km=25.0, now=frozen_time)

    # 2. Compute exposure
    exposure_map = {}
    for r in candidate_routes:
        exp = compute_route_exposure(r, fresh_stations)
        exposure_map[r.route_id] = exp

    # 3. Constrained optimization
    opt = optimize_routes(candidate_routes, exposure_map, buffer_min=buffer_min)

    # 4. Relative exposure normalization (Fastest = 100)
    normalized = compute_relative_exposure_indices(exposure_map, opt.fastest_route_id)

    # 5. Robustness check
    is_robust, _ = evaluate_robustness(candidate_routes, fresh_stations, buffer_min=buffer_min)

    # 6. Classification
    clf = classify_trip(
        opt_result=opt,
        fastest_exposure_result=normalized[opt.fastest_route_id],
        all_exposure_results=normalized,
        all_routes=candidate_routes,
        is_robust=is_robust,
        buffer_min=buffer_min
    )

    # ----------------------------------------------------
    # Formatted Output
    # ----------------------------------------------------
    print("-" * 60)
    print("CANDIDATE ROUTES")
    print("-" * 60)
    for r in candidate_routes:
        exp_info = normalized[r.route_id]
        is_fastest = " [FASTEST]" if r.route_id == opt.fastest_route_id else ""
        print(f"* {r.route_id}{is_fastest}")
        print(f"    Duration: {r.duration_min:.1f} min | Distance: {r.distance_km:.2f} km")
        print(f"    Modeled Exposure Index: {exp_info.exposure_index:.1f} (Avg PM2.5: {exp_info.average_pm25:.1f} ug/m3)")

    print("-" * 60)
    print("OPTIMIZATION & SENSITIVITY")
    print("-" * 60)
    print(f"Fastest Route:      {opt.fastest_route_id}")
    print(f"Feasible Routes:    {', '.join(opt.feasible_route_ids)} (within +{buffer_min} min)")
    print(f"Selected Route:     {opt.selected_route_id}")
    print(f"Additional Time:    +{opt.additional_duration_min:.1f} min")
    print(f"Exposure Reduction: {opt.reduction_percent:.1f}%")
    print(f"Robust Model Check: {'YES (Stable across 0.5x, 1.0x, 1.5x)' if is_robust else 'NO'}")
    print(f"Spatial Confidence: {clf.confidence.value} ({normalized[opt.fastest_route_id].station_count_used} stations used)")

    print("-" * 60)
    print("CLASSIFICATION & WORKER NUDGE")
    print("-" * 60)
    print(f"Outcome State:      {clf.outcome.value}")
    print(f"Reason Code:        {clf.reason_code}")

    if clf.outcome == RouteOutcome.AVOIDABLE:
        print("\n>> WORKER CARD:")
        print(f"   [ACTIONABLE] Take Safer Route ({opt.selected_route_id})")
        print(f"   +{opt.additional_duration_min:.1f} min -> {opt.reduction_percent:.1f}% lower estimated exposure")
        print("   Earn: INR 3 (Simulated Reward)")

    elif clf.outcome == RouteOutcome.UNAVOIDABLE:
        print("\n>> WORKER CARD:")
        print("   [INFO] No sufficiently safer route within current delivery buffer.")
        if clf.better_outside_buffer:
            print(f"   (Cleaner route exists with {clf.outside_buffer_reduction_percent:.1f}% lower exposure, but requires +{clf.extra_minutes_needed:.1f} min)")
        print("   Triggered: INR 5 (Simulated Health Benefit)")

    elif clf.outcome == RouteOutcome.LOW:
        print("\n>> WORKER CARD:")
        print("   [INFO] Air conditions are acceptable (<60 ug/m3). Follow fastest route.")

    elif clf.outcome == RouteOutcome.INSUFFICIENT_DATA:
        print("\n>> WORKER CARD:")
        print("   [WARN] Air quality data coverage is insufficient to compare routes safely.")

    print("\n" + "=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="AirShield Local Demo")
    parser.add_argument("--live", action="store_true", help="Run with live APIs if credentials configured")
    args = parser.parse_args()

    pickup = Coordinate(28.6139, 77.2090)
    drop = Coordinate(28.6450, 77.2350)

    print("\n" + "#" * 60)
    print("  AIRSHIELD DETERMINISTIC DECISION ENGINE (PHASE 1)")
    print("#" * 60 + "\n")

    # Scenario A: Avoidable Exposure
    run_scenario(
        title="Scenario A: Avoidable Exposure (Safer Route Within Buffer)",
        routes_file="standard_routes.json",
        aqi_file="delhi_stations.json",
        buffer_min=5.0,
        pickup=pickup,
        drop=drop
    )

    # Scenario B: Unavoidable Exposure
    run_scenario(
        title="Scenario B: Unavoidable Exposure (Strict 1-min Buffer)",
        routes_file="standard_routes.json",
        aqi_file="delhi_stations.json",
        buffer_min=1.0,
        pickup=pickup,
        drop=drop
    )

    # Scenario C: Clean Day
    run_scenario(
        title="Scenario C: Acceptable Air Day (PM2.5 < 60 ug/m3)",
        routes_file="standard_routes.json",
        aqi_file="clean_day_stations.json",
        buffer_min=5.0,
        pickup=pickup,
        drop=drop
    )

    # Scenario D: Insufficient Data
    run_scenario(
        title="Scenario D: Insufficient Monitoring Data (Sparse Stations)",
        routes_file="standard_routes.json",
        aqi_file="sparse_stations.json",
        buffer_min=5.0,
        pickup=pickup,
        drop=drop
    )


if __name__ == "__main__":
    main()
