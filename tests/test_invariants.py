"""
Mathematical Invariant & Property Tests for AirShield Core.
Verifies the 7 fundamental invariants required by the architecture specification.
"""

from datetime import datetime, timezone
import pytest

from backend.core.models import (
    Coordinate,
    Route,
    AQIStation,
    Confidence,
    RouteOutcome
)
from backend.core.exposure import compute_route_exposure, evaluate_robustness
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip


def make_test_route(route_id: str, duration_min: float, distance_km: float) -> Route:
    geom = [Coordinate(28.6139, 77.2090), Coordinate(28.6300, 77.2250), Coordinate(28.6450, 77.2350)]
    return Route(
        route_id=route_id,
        geometry=geom,
        duration_sec=duration_min * 60.0,
        distance_m=distance_km * 1000.0,
        source="test"
    )


def test_invariant_1_pm25_increase_monotonicity(standard_routes):
    """Invariant 1: If PM2.5 increases everywhere, exposure must not decrease."""
    r = standard_routes[0]
    now = datetime.now(timezone.utc)

    stations_base = [
        AQIStation("S1", 28.61, 77.20, 100.0, now, "test"),
        AQIStation("S2", 28.64, 77.23, 120.0, now, "test")
    ]
    stations_elevated = [
        AQIStation("S1", 28.61, 77.20, 150.0, now, "test"),
        AQIStation("S2", 28.64, 77.23, 170.0, now, "test")
    ]

    exp_base = compute_route_exposure(r, stations_base)
    exp_elevated = compute_route_exposure(r, stations_elevated)

    assert exp_elevated.estimated_integrated_pm25 >= exp_base.estimated_integrated_pm25


def test_invariant_2_duration_increase_monotonicity(standard_routes, delhi_stations):
    """Invariant 2: If route duration increases, exposure must not decrease."""
    r = standard_routes[0]
    r_longer = Route(
        route_id="R_LONGER",
        geometry=r.geometry,
        duration_sec=r.duration_sec * 1.5,
        distance_m=r.distance_m,
        source="test"
    )

    exp_base = compute_route_exposure(r, delhi_stations)
    exp_longer = compute_route_exposure(r_longer, delhi_stations)

    assert exp_longer.estimated_integrated_pm25 >= exp_base.estimated_integrated_pm25


def test_invariant_3_buffer_expansion_monotonicity(standard_routes, delhi_stations):
    """Invariant 3: If buffer increases, feasible route set cannot shrink."""
    exp_results = {r.route_id: compute_route_exposure(r, delhi_stations) for r in standard_routes}

    opt_buf2 = optimize_routes(standard_routes, exp_results, buffer_min=2.0)
    opt_buf5 = optimize_routes(standard_routes, exp_results, buffer_min=5.0)
    opt_buf10 = optimize_routes(standard_routes, exp_results, buffer_min=10.0)

    # Feasible set at buf2 is subset of buf5, which is subset of buf10
    set2 = set(opt_buf2.feasible_route_ids)
    set5 = set(opt_buf5.feasible_route_ids)
    set10 = set(opt_buf10.feasible_route_ids)

    assert set2.issubset(set5)
    assert set5.issubset(set10)


def test_invariant_4_fastest_is_cleanest_cannot_be_avoidable():
    """Invariant 4: If the fastest route is also the lowest-exposure route, outcome cannot be AVOIDABLE."""
    r1 = make_test_route("R1", 20.0, 5.0)
    r2 = make_test_route("R2", 23.0, 5.5)
    now = datetime.now(timezone.utc)
    stations = [AQIStation("S1", 28.62, 77.21, 150.0, now, "test"), AQIStation("S2", 28.63, 77.22, 140.0, now, "test"), AQIStation("S3", 28.64, 77.23, 130.0, now, "test")]

    exp1 = compute_route_exposure(r1, stations)
    exp2 = compute_route_exposure(r2, stations)
    all_exp = {r1.route_id: exp1, r2.route_id: exp2}

    opt = optimize_routes([r1, r2], all_exp, buffer_min=5.0)
    res = classify_trip(opt, exp1, all_exp, [r1, r2], is_robust=True, buffer_min=5.0)

    assert res.outcome != RouteOutcome.AVOIDABLE


def test_invariant_5_low_confidence_strictly_insufficient_data():
    """Invariant 5: If confidence is LOW, classification must be INSUFFICIENT_DATA."""
    r1 = make_test_route("R1", 20.0, 5.0)
    r2 = make_test_route("R2", 22.0, 5.2)
    now = datetime.now(timezone.utc)
    # Only 1 station -> LOW confidence
    stations = [AQIStation("S1", 28.62, 77.21, 150.0, now, "test")]

    exp1 = compute_route_exposure(r1, stations)
    exp2 = compute_route_exposure(r2, stations)
    all_exp = {r1.route_id: exp1, r2.route_id: exp2}

    opt = optimize_routes([r1, r2], all_exp, buffer_min=5.0)
    res = classify_trip(opt, exp1, all_exp, [r1, r2], is_robust=True, buffer_min=5.0)

    assert res.outcome == RouteOutcome.INSUFFICIENT_DATA


def test_invariant_6_buffer_violating_route_never_selected():
    """Invariant 6: If a safer route violates the buffer, it must NOT be selected."""
    r_fast = make_test_route("R_FAST", 20.0, 5.0)
    r_slow_clean = make_test_route("R_SLOW_CLEAN", 30.0, 8.0)  # +10 min (outside buffer=5)

    exp_fast = compute_route_exposure(r_fast, [AQIStation("S1", 28.62, 77.21, 200.0, datetime.now(timezone.utc), "test")])
    exp_slow = compute_route_exposure(r_slow_clean, [AQIStation("S1", 28.62, 77.21, 20.0, datetime.now(timezone.utc), "test")])
    all_exp = {r_fast.route_id: exp_fast, r_slow_clean.route_id: exp_slow}

    opt = optimize_routes([r_fast, r_slow_clean], all_exp, buffer_min=5.0)
    assert opt.selected_route_id == "R_FAST"
    assert opt.selected_route_id != "R_SLOW_CLEAN"


def test_invariant_7_strict_reproducibility(standard_routes, delhi_stations):
    """Invariant 7: Running the pipeline twice with identical inputs produces identical outputs."""
    exp1 = {r.route_id: compute_route_exposure(r, delhi_stations) for r in standard_routes}
    opt1 = optimize_routes(standard_routes, exp1, buffer_min=5.0)
    rob1, _ = evaluate_robustness(standard_routes, delhi_stations, buffer_min=5.0)
    res1 = classify_trip(opt1, exp1[opt1.fastest_route_id], exp1, standard_routes, is_robust=rob1, buffer_min=5.0)

    exp2 = {r.route_id: compute_route_exposure(r, delhi_stations) for r in standard_routes}
    opt2 = optimize_routes(standard_routes, exp2, buffer_min=5.0)
    rob2, _ = evaluate_robustness(standard_routes, delhi_stations, buffer_min=5.0)
    res2 = classify_trip(opt2, exp2[opt2.fastest_route_id], exp2, standard_routes, is_robust=rob2, buffer_min=5.0)

    assert opt1.selected_route_id == opt2.selected_route_id
    assert opt1.reduction_fraction == opt2.reduction_fraction
    assert res1.outcome == res2.outcome
    assert res1.reward_eligible == res2.reward_eligible
