"""
Unit tests for models.py.
Verifies validation, invariants, and typed dataclass behavior.
"""

import pytest
from datetime import datetime, timezone

from backend.core.models import (
    Coordinate,
    Route,
    AQIStation,
    RouteSegment,
    ExposureResult,
    OptimizationResult,
    ClassificationResult,
    RouteOutcome,
    Confidence
)
from backend.core.exceptions import InvalidCoordinateError, InvalidRouteError


def test_coordinate_valid():
    c = Coordinate(lat=28.6139, lng=77.2090)
    assert c.lat == 28.6139
    assert c.lng == 77.2090


def test_coordinate_invalid_lat():
    with pytest.raises(InvalidCoordinateError):
        Coordinate(lat=95.0, lng=77.0)
    with pytest.raises(InvalidCoordinateError):
        Coordinate(lat=-95.0, lng=77.0)


def test_coordinate_invalid_lng():
    with pytest.raises(InvalidCoordinateError):
        Coordinate(lat=28.0, lng=185.0)
    with pytest.raises(InvalidCoordinateError):
        Coordinate(lat=28.0, lng=-185.0)


def test_route_valid():
    geom = [Coordinate(28.61, 77.20), Coordinate(28.62, 77.21)]
    r = Route(
        route_id="R1",
        geometry=geom,
        duration_sec=1200.0,
        distance_m=5000.0,
        source="test"
    )
    assert r.route_id == "R1"
    assert r.duration_min == 20.0
    assert r.distance_km == 5.0


def test_route_invalid():
    geom = [Coordinate(28.61, 77.20)]
    with pytest.raises(InvalidRouteError):
        # Less than 2 points
        Route(route_id="R1", geometry=geom, duration_sec=100.0, distance_m=100.0, source="test")

    geom2 = [Coordinate(28.61, 77.20), Coordinate(28.62, 77.21)]
    with pytest.raises(InvalidRouteError):
        # Non-positive duration
        Route(route_id="R1", geometry=geom2, duration_sec=0.0, distance_m=100.0, source="test")

    with pytest.raises(InvalidRouteError):
        # Negative distance
        Route(route_id="R1", geometry=geom2, duration_sec=100.0, distance_m=-5.0, source="test")

    with pytest.raises(InvalidRouteError):
        # Empty ID
        Route(route_id="", geometry=geom2, duration_sec=100.0, distance_m=100.0, source="test")


def test_aqi_station_valid():
    st = AQIStation(
        station_id="ST1",
        lat=28.6,
        lng=77.2,
        pm25=120.5,
        timestamp=datetime.now(timezone.utc),
        source="test"
    )
    assert st.station_id == "ST1"
    assert st.coordinate == Coordinate(28.6, 77.2)


def test_aqi_station_negative_pm25():
    with pytest.raises(ValueError):
        AQIStation(
            station_id="ST1",
            lat=28.6,
            lng=77.2,
            pm25=-10.0,
            timestamp=datetime.now(timezone.utc),
            source="test"
        )


def test_route_segment():
    p1 = Coordinate(28.61, 77.20)
    p2 = Coordinate(28.62, 77.21)
    seg = RouteSegment(
        start=p1,
        end=p2,
        length_m=200.0,
        midpoint=Coordinate(28.615, 77.205),
        duration_sec=60.0
    )
    assert seg.duration_min == 1.0


def test_optimization_result():
    opt = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.41,
        reduction_percent=41.0,
        fastest_exposure=1000.0,
        selected_exposure=590.0,
        additional_duration_sec=120.0
    )
    assert opt.additional_duration_min == 2.0
