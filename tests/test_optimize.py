"""
Unit tests for optimize.py.
Tests operational time buffer constraints, feasible route filtering,
minimum exposure selection, and deterministic tie-breaking.
"""

import math
import pytest

from backend.core.models import Coordinate, Route, ExposureResult, Confidence
from backend.core.optimize import validate_buffer, optimize_routes
from backend.core.exceptions import (
    InvalidBufferError,
    RouteNotFoundError,
    InvalidRouteError
)


def make_dummy_route(route_id: str, duration_min: float, distance_km: float) -> Route:
    geom = [Coordinate(28.60, 77.20), Coordinate(28.61, 77.21)]
    return Route(
        route_id=route_id,
        geometry=geom,
        duration_sec=duration_min * 60.0,
        distance_m=distance_km * 1000.0,
        source="test"
    )


def make_dummy_exposure(route_id: str, exposure_val: float) -> ExposureResult:
    return ExposureResult(
        route_id=route_id,
        exposure_index=100.0,
        estimated_integrated_pm25=exposure_val,
        average_pm25=100.0,
        confidence=Confidence.HIGH,
        station_count_used=4,
        segment_count=10,
        is_robust=True
    )


def test_validate_buffer_valid():
    assert validate_buffer(0.0) == 0.0
    assert validate_buffer(5.0) == 5.0
    assert validate_buffer(15.0) == 15.0
    assert validate_buffer("7.5") == 7.5


def test_validate_buffer_invalid():
    with pytest.raises(InvalidBufferError):
        validate_buffer(-1.0)
    with pytest.raises(InvalidBufferError):
        validate_buffer(15.5)
    with pytest.raises(InvalidBufferError):
        validate_buffer(float("nan"))
    with pytest.raises(InvalidBufferError):
        validate_buffer(float("inf"))
    with pytest.raises(InvalidBufferError):
        validate_buffer("invalid_string")


def test_optimize_fastest_is_lowest_exposure():
    r1 = make_dummy_route("R1", 20.0, 5.0)
    r2 = make_dummy_route("R2", 23.0, 5.5)
    exp = {
        "R1": make_dummy_exposure("R1", 500.0),
        "R2": make_dummy_exposure("R2", 700.0)
    }

    opt = optimize_routes([r1, r2], exp, buffer_min=5.0)
    assert opt.fastest_route_id == "R1"
    assert opt.selected_route_id == "R1"
    assert opt.reduction_fraction == 0.0
    assert opt.additional_duration_sec == 0.0


def test_optimize_safer_route_within_buffer_selected():
    r1 = make_dummy_route("R1", 24.0, 7.2)  # Fastest
    r2 = make_dummy_route("R2", 26.0, 7.5)  # +2 min (feasible with buffer=5)
    exp = {
        "R1": make_dummy_exposure("R1", 1000.0),
        "R2": make_dummy_exposure("R2", 590.0)  # 41% lower
    }

    opt = optimize_routes([r1, r2], exp, buffer_min=5.0)
    assert opt.fastest_route_id == "R1"
    assert opt.selected_route_id == "R2"
    assert "R1" in opt.feasible_route_ids
    assert "R2" in opt.feasible_route_ids
    assert math.isclose(opt.reduction_fraction, 0.41, rel_tol=1e-3)
    assert math.isclose(opt.reduction_percent, 41.0, rel_tol=1e-3)
    assert opt.additional_duration_min == 2.0


def test_optimize_safer_route_outside_buffer_rejected():
    r1 = make_dummy_route("R1", 24.0, 7.2)  # Fastest
    r3 = make_dummy_route("R3", 32.0, 8.5)  # +8 min (outside buffer=5)
    exp = {
        "R1": make_dummy_exposure("R1", 1000.0),
        "R3": make_dummy_exposure("R3", 400.0)  # 60% lower
    }

    opt = optimize_routes([r1, r3], exp, buffer_min=5.0)
    assert opt.fastest_route_id == "R1"
    assert opt.selected_route_id == "R1"  # R3 rejected because 32 > 24 + 5
    assert opt.feasible_route_ids == ["R1"]
    assert opt.reduction_fraction == 0.0


def test_optimize_increasing_buffer_expands_feasibility():
    r1 = make_dummy_route("R1", 20.0, 5.0)
    r2 = make_dummy_route("R2", 24.0, 5.5)  # +4 min
    r3 = make_dummy_route("R3", 28.0, 6.0)  # +8 min
    exp = {
        "R1": make_dummy_exposure("R1", 1000.0),
        "R2": make_dummy_exposure("R2", 700.0),
        "R3": make_dummy_exposure("R3", 400.0)
    }

    # Buffer = 2 min -> only R1 feasible
    opt2 = optimize_routes([r1, r2, r3], exp, buffer_min=2.0)
    assert opt2.feasible_route_ids == ["R1"]
    assert opt2.selected_route_id == "R1"

    # Buffer = 5 min -> R1, R2 feasible
    opt5 = optimize_routes([r1, r2, r3], exp, buffer_min=5.0)
    assert set(opt5.feasible_route_ids) == {"R1", "R2"}
    assert opt5.selected_route_id == "R2"

    # Buffer = 10 min -> R1, R2, R3 feasible
    opt10 = optimize_routes([r1, r2, r3], exp, buffer_min=10.0)
    assert set(opt10.feasible_route_ids) == {"R1", "R2", "R3"}
    assert opt10.selected_route_id == "R3"


def test_optimize_deterministic_tie_breaking():
    # Two feasible routes with exact same exposure
    r_fast = make_dummy_route("R_FAST", 22.0, 6.0)
    r_slow = make_dummy_route("R_SLOW", 24.0, 6.0)
    exp = {
        "R_FAST": make_dummy_exposure("R_FAST", 500.0),
        "R_SLOW": make_dummy_exposure("R_SLOW", 500.0)
    }

    opt = optimize_routes([r_slow, r_fast], exp, buffer_min=5.0)
    # Tie broken by lower duration -> R_FAST selected
    assert opt.selected_route_id == "R_FAST"


def test_optimize_empty_routes():
    with pytest.raises(RouteNotFoundError):
        optimize_routes([], {}, buffer_min=5.0)


def test_optimize_missing_exposure_result():
    r1 = make_dummy_route("R1", 20.0, 5.0)
    with pytest.raises(InvalidRouteError):
        optimize_routes([r1], {}, buffer_min=5.0)
