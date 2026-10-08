"""
Unit tests for exposure.py.
Extensive mathematical verification of 200m segmentation, IDW interpolation,
spatial context proxies, relative exposure indexing, and robustness evaluation.
"""

import math
from datetime import datetime, timezone
import pytest

from backend.core.models import (
    Coordinate,
    Route,
    AQIStation,
    Confidence
)
from backend.core.exposure import (
    segment_route,
    idw_interpolation,
    get_spatial_modifier,
    compute_route_exposure,
    compute_relative_exposure_indices,
    evaluate_robustness
)
from backend.core.routes import calculate_route_distance, haversine_distance


def test_segment_route_preserves_distance_and_duration():
    geom = [
        Coordinate(28.6139, 77.2090),
        Coordinate(28.6300, 77.2250),
        Coordinate(28.6450, 77.2350)
    ]
    orig_dist_m = calculate_route_distance(geom)
    duration_sec = 1200.0  # 20 min

    route = Route(
        route_id="R_TEST",
        geometry=geom,
        duration_sec=duration_sec,
        distance_m=orig_dist_m,
        source="test"
    )

    segments = segment_route(route, target_segment_length_m=200.0)
    assert len(segments) > 1

    # Check segment lengths are approx 200m
    for seg in segments:
        assert 50.0 <= seg.length_m <= 350.0

    # Total duration across segments must equal route duration
    total_seg_duration = sum(s.duration_sec for s in segments)
    assert math.isclose(total_seg_duration, duration_sec, rel_tol=1e-3)

    # Total distance across segments must approx equal original distance
    total_seg_dist = sum(s.length_m for s in segments)
    assert math.isclose(total_seg_dist, orig_dist_m, rel_tol=1e-2)


def test_idw_exact_manual_calculation():
    # Setup point at (28.60, 77.20)
    # Station 1 at (28.60, 77.21): distance = d1
    # Station 2 at (28.61, 77.20): distance = d2
    pt = Coordinate(28.60, 77.20)
    now = datetime.now(timezone.utc)
    st1 = AQIStation("ST1", 28.60, 77.21, 100.0, now, "test")
    st2 = AQIStation("ST2", 28.61, 77.20, 200.0, now, "test")

    d1_km = haversine_distance(pt, st1.coordinate) / 1000.0
    d2_km = haversine_distance(pt, st2.coordinate) / 1000.0

    w1 = 1.0 / (d1_km ** 2 + 1e-6)
    w2 = 1.0 / (d2_km ** 2 + 1e-6)
    expected_c = (100.0 * w1 + 200.0 * w2) / (w1 + w2)

    computed_c = idw_interpolation(pt, [st1, st2])
    assert math.isclose(computed_c, expected_c, rel_tol=1e-5)


def test_idw_exact_station_match():
    pt = Coordinate(28.6139, 77.2090)
    now = datetime.now(timezone.utc)
    st = AQIStation("ST_EXACT", 28.6139, 77.2090, 175.5, now, "test")
    val = idw_interpolation(pt, [st])
    assert val == 175.5


def test_idw_empty_stations():
    pt = Coordinate(28.6139, 77.2090)
    assert idw_interpolation(pt, []) == 0.0


def test_spatial_modifier_major_road():
    pt = Coordinate(28.6, 77.2)
    # <= 50m to major road -> 1.25 multiplier
    ctx = {"distance_to_major_road_m": 30.0, "green_fraction": 0.0}
    m = get_spatial_modifier(pt, ctx, strength_multiplier=1.0)
    assert math.isclose(m, 1.25, rel_tol=1e-3)


def test_spatial_modifier_secondary_road():
    pt = Coordinate(28.6, 77.2)
    # 50 - 200m -> 1.10 multiplier
    ctx = {"distance_to_major_road_m": 120.0, "green_fraction": 0.0}
    m = get_spatial_modifier(pt, ctx, strength_multiplier=1.0)
    assert math.isclose(m, 1.10, rel_tol=1e-3)


def test_spatial_modifier_green_reduction():
    pt = Coordinate(28.6, 77.2)
    # 50% green coverage -> 1 - 0.15*0.5 = 0.925
    ctx = {"distance_to_major_road_m": 300.0, "green_fraction": 0.5}
    m = get_spatial_modifier(pt, ctx, strength_multiplier=1.0)
    assert math.isclose(m, 0.925, rel_tol=1e-3)


def test_exposure_doubles_when_duration_doubles(standard_routes, delhi_stations):
    r1 = standard_routes[0]  # duration = 1440s
    r1_double = Route(
        route_id="R1_DOUBLE",
        geometry=r1.geometry,
        duration_sec=r1.duration_sec * 2.0,
        distance_m=r1.distance_m,
        source="test"
    )

    exp1 = compute_route_exposure(r1, delhi_stations)
    exp2 = compute_route_exposure(r1_double, delhi_stations)

    # Exposure = integrated PM2.5 * time_in_minutes -> should double
    assert math.isclose(exp2.estimated_integrated_pm25, exp1.estimated_integrated_pm25 * 2.0, rel_tol=1e-3)
    # Average PM2.5 concentration along the geometry should remain unchanged
    assert math.isclose(exp2.average_pm25, exp1.average_pm25, rel_tol=1e-3)


def test_exposure_increases_when_pm25_increases(standard_routes):
    r = standard_routes[0]
    now = datetime.now(timezone.utc)
    st_low = [AQIStation("S1", 28.62, 77.21, 50.0, now, "test")]
    st_high = [AQIStation("S1", 28.62, 77.21, 150.0, now, "test")]

    exp_low = compute_route_exposure(r, st_low)
    exp_high = compute_route_exposure(r, st_high)

    assert exp_high.estimated_integrated_pm25 > exp_low.estimated_integrated_pm25
    assert math.isclose(exp_high.estimated_integrated_pm25, exp_low.estimated_integrated_pm25 * 3.0, rel_tol=1e-3)


def test_exposure_confidence_levels(standard_routes):
    r = standard_routes[0]
    now = datetime.now(timezone.utc)

    # 1 station -> LOW
    st_1 = [AQIStation("S1", 28.62, 77.21, 100.0, now, "test")]
    exp_low = compute_route_exposure(r, st_1)
    assert exp_low.confidence == Confidence.LOW

    # 2 stations -> MEDIUM
    st_2 = [
        AQIStation("S1", 28.62, 77.21, 100.0, now, "test"),
        AQIStation("S2", 28.63, 77.22, 100.0, now, "test")
    ]
    exp_med = compute_route_exposure(r, st_2)
    assert exp_med.confidence == Confidence.MEDIUM

    # 3+ stations -> HIGH
    st_3 = [
        AQIStation("S1", 28.62, 77.21, 100.0, now, "test"),
        AQIStation("S2", 28.63, 77.22, 100.0, now, "test"),
        AQIStation("S3", 28.64, 77.23, 100.0, now, "test")
    ]
    exp_high = compute_route_exposure(r, st_3)
    assert exp_high.confidence == Confidence.HIGH


def test_compute_relative_exposure_indices(standard_routes, delhi_stations):
    r1, r2 = standard_routes[0], standard_routes[1]
    e1 = compute_route_exposure(r1, delhi_stations)
    e2 = compute_route_exposure(r2, delhi_stations)

    results = {r1.route_id: e1, r2.route_id: e2}
    normalized = compute_relative_exposure_indices(results, fastest_route_id=r1.route_id)

    assert normalized[r1.route_id].exposure_index == 100.0
    expected_r2_index = (e2.estimated_integrated_pm25 / e1.estimated_integrated_pm25) * 100.0
    assert math.isclose(normalized[r2.route_id].exposure_index, expected_r2_index, rel_tol=1e-3)


def test_evaluate_robustness(standard_routes, delhi_stations):
    # Tests that under 0.5x, 1.0x, and 1.5x strength modifiers, evaluation returns consistent bool
    is_robust, winner_id = evaluate_robustness(standard_routes, delhi_stations, buffer_min=5.0)
    assert isinstance(is_robust, bool)
    assert winner_id in [r.route_id for r in standard_routes]
