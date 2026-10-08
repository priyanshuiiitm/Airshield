"""
End-to-end integration tests for the deterministic AirShield pipeline.
Verifies full pipeline execution from pickup/drop coordinates to classification results.
"""

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


def run_deterministic_pipeline(
    route_provider: FixtureRouteProvider,
    aqi_provider: FixtureAQIProvider,
    pickup: Coordinate,
    destination: Coordinate,
    buffer_min: float = 5.0,
    frozen_now=None
):
    """Executes the full deterministic core pipeline."""
    # 1. Fetch and deduplicate candidate routes
    raw_routes = route_provider.get_routes(pickup, destination)
    routes = deduplicate_routes(raw_routes)

    # 2. Fetch fresh stations
    stations = aqi_provider.get_stations(pickup, max_distance_km=25.0, now=frozen_now)

    # 3. Compute exposure for each route
    exposure_map = {}
    for r in routes:
        exp = compute_route_exposure(r, stations)
        exposure_map[r.route_id] = exp

    # 4. Constrained Optimization
    opt_result = optimize_routes(routes, exposure_map, buffer_min=buffer_min)

    # 5. Relative Exposure Indices (Fastest = 100)
    normalized_exposures = compute_relative_exposure_indices(exposure_map, opt_result.fastest_route_id)

    # 6. Robustness sensitivity check
    is_robust, _ = evaluate_robustness(routes, stations, buffer_min=buffer_min)

    # 7. Classification
    fastest_exp = normalized_exposures[opt_result.fastest_route_id]
    classification = classify_trip(
        opt_result=opt_result,
        fastest_exposure_result=fastest_exp,
        all_exposure_results=normalized_exposures,
        all_routes=routes,
        is_robust=is_robust,
        buffer_min=buffer_min
    )

    return {
        "routes": routes,
        "stations": stations,
        "exposures": normalized_exposures,
        "optimization": opt_result,
        "robust": is_robust,
        "classification": classification
    }


def test_e2e_scenario_a_avoidable(standard_routes, delhi_stations, frozen_now):
    """
    Scenario A:
    Fastest route passes central hotspot.
    Safer route R2 takes +2 min (within 5 min buffer) and achieves >15% exposure reduction.
    Outcome: AVOIDABLE (₹3 reward eligible).
    """
    route_prov = FixtureRouteProvider(standard_routes)
    aqi_prov = FixtureAQIProvider(delhi_stations)

    res = run_deterministic_pipeline(
        route_provider=route_prov,
        aqi_provider=aqi_prov,
        pickup=Coordinate(28.6139, 77.2090),
        destination=Coordinate(28.6450, 77.2350),
        buffer_min=5.0,
        frozen_now=frozen_now
    )

    clf = res["classification"]
    opt = res["optimization"]

    assert clf.outcome == RouteOutcome.AVOIDABLE
    assert clf.reward_eligible is True
    assert clf.benefit_eligible is False
    assert opt.selected_route_id == "R2_SAFER"
    assert opt.reduction_percent >= 15.0
    assert opt.additional_duration_min == 2.0


def test_e2e_scenario_b_unavoidable(standard_routes, delhi_stations, frozen_now):
    """
    Scenario B:
    Buffer restricted to 1 minute.
    Safer route R2 takes +2 min and is now infeasible.
    Outcome: UNAVOIDABLE (₹5 benefit triggered, outside-buffer metadata provided).
    """
    route_prov = FixtureRouteProvider(standard_routes)
    aqi_prov = FixtureAQIProvider(delhi_stations)

    res = run_deterministic_pipeline(
        route_provider=route_prov,
        aqi_provider=aqi_prov,
        pickup=Coordinate(28.6139, 77.2090),
        destination=Coordinate(28.6450, 77.2350),
        buffer_min=1.0,  # Strict buffer
        frozen_now=frozen_now
    )

    clf = res["classification"]
    opt = res["optimization"]

    assert clf.outcome == RouteOutcome.UNAVOIDABLE
    assert clf.benefit_eligible is True
    assert clf.reward_eligible is False
    assert opt.selected_route_id == "R1_FAST"
    assert clf.better_outside_buffer is True
    assert clf.extra_minutes_needed == 2.0


def test_e2e_scenario_c_clean_day_low(standard_routes, clean_day_stations, frozen_now):
    """
    Scenario C:
    Ambient PM2.5 is low (<40 µg/m³).
    Outcome: LOW (acceptable air quality, no routing intervention).
    """
    route_prov = FixtureRouteProvider(standard_routes)
    aqi_prov = FixtureAQIProvider(clean_day_stations)

    res = run_deterministic_pipeline(
        route_provider=route_prov,
        aqi_provider=aqi_prov,
        pickup=Coordinate(28.6139, 77.2090),
        destination=Coordinate(28.6450, 77.2350),
        buffer_min=5.0,
        frozen_now=frozen_now
    )

    clf = res["classification"]
    assert clf.outcome == RouteOutcome.LOW
    assert clf.reward_eligible is False
    assert clf.benefit_eligible is False


def test_e2e_scenario_d_insufficient_data(standard_routes, sparse_stations, frozen_now):
    """
    Scenario D:
    Only 1 station available (Low confidence).
    Outcome: INSUFFICIENT_DATA (No claims or rewards).
    """
    route_prov = FixtureRouteProvider(standard_routes)
    aqi_prov = FixtureAQIProvider(sparse_stations)

    res = run_deterministic_pipeline(
        route_provider=route_prov,
        aqi_provider=aqi_prov,
        pickup=Coordinate(28.6139, 77.2090),
        destination=Coordinate(28.6450, 77.2350),
        buffer_min=5.0,
        frozen_now=frozen_now
    )

    clf = res["classification"]
    assert clf.outcome == RouteOutcome.INSUFFICIENT_DATA
    assert clf.confidence == Confidence.LOW
    assert clf.reward_eligible is False
    assert clf.benefit_eligible is False
