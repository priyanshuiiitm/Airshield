"""
Unit tests for routes.py.
Tests geodesic math, route geometry parsing, deduplication, and mock providers.
NO external network calls occur during tests.
"""

import math
import pytest
from unittest.mock import MagicMock

from backend.core.models import Coordinate, Route
from backend.core.routes import (
    haversine_distance,
    calculate_route_distance,
    calculate_geometry_overlap,
    deduplicate_routes,
    sort_routes_by_duration,
    decode_route_geometry,
    FixtureRouteProvider,
    AmazonLocationRouteProvider
)
from backend.core.exceptions import (
    RouteProviderError,
    InvalidRouteError,
    RouteNotFoundError
)


def test_haversine_distance_known_points():
    # Delhi CP (28.6328, 77.2197) to India Gate (28.6129, 77.2295) is approx 2.4 - 2.5 km
    cp = Coordinate(lat=28.6328, lng=77.2197)
    india_gate = Coordinate(lat=28.6129, lng=77.2295)
    dist = haversine_distance(cp, india_gate)
    assert 2200.0 < dist < 2600.0


def test_haversine_distance_identical_points():
    p = Coordinate(lat=28.6139, lng=77.2090)
    assert haversine_distance(p, p) == 0.0


def test_calculate_route_distance():
    pts = [
        Coordinate(28.60, 77.20),
        Coordinate(28.61, 77.20),
        Coordinate(28.62, 77.20)
    ]
    total = calculate_route_distance(pts)
    assert total > 2000.0  # Approx 2.2 km


def test_decode_route_geometry():
    raw_coords = [[77.2090, 28.6139], [77.2180, 28.6250]]
    decoded = decode_route_geometry(raw_coords)
    assert len(decoded) == 2
    assert decoded[0].lat == 28.6139
    assert decoded[0].lng == 77.2090
    assert decoded[1].lat == 28.6250
    assert decoded[1].lng == 77.2180


def test_deduplicate_routes_removes_near_duplicates(standard_routes):
    # standard_routes contains R1_FAST, R2_SAFER, R3_SLOW, and R4_DUPLICATE_R1 (>90% overlap with R1)
    unique = deduplicate_routes(standard_routes, overlap_threshold=0.90)
    unique_ids = [r.route_id for r in unique]

    assert "R1_FAST" in unique_ids
    assert "R2_SAFER" in unique_ids
    assert "R3_SLOW" in unique_ids
    assert "R4_DUPLICATE_R1" not in unique_ids
    assert len(unique) == 3


def test_sort_routes_by_duration(standard_routes):
    sorted_r = sort_routes_by_duration(standard_routes)
    durations = [r.duration_sec for r in sorted_r]
    assert durations == sorted(durations)
    assert sorted_r[0].route_id == "R1_FAST"


def test_fixture_route_provider(standard_routes):
    provider = FixtureRouteProvider(standard_routes)
    routes = provider.get_routes(Coordinate(28.61, 77.20), Coordinate(28.64, 77.23))
    assert len(routes) == 3  # After deduplication
    assert routes[0].route_id == "R1_FAST"


def test_fixture_route_provider_empty():
    provider = FixtureRouteProvider([])
    with pytest.raises(RouteNotFoundError):
        provider.get_routes(Coordinate(28.61, 77.20), Coordinate(28.64, 77.23))


def test_amazon_location_provider_mock_success():
    mock_client = MagicMock()
    mock_client.calculate_route.return_value = {
        "Summary": {
            "Distance": 8.5,
            "DurationSeconds": 1500.0
        },
        "Legs": [
            {
                "Geometry": {
                    "LineString": [
                        [77.2090, 28.6139],
                        [77.2250, 28.6300]
                    ]
                }
            }
        ]
    }

    provider = AmazonLocationRouteProvider(client=mock_client)
    routes = provider.get_routes(Coordinate(28.6139, 77.2090), Coordinate(28.6300, 77.2250))

    assert len(routes) == 1
    assert routes[0].duration_sec == 1500.0
    assert routes[0].distance_m == 8500.0
    assert routes[0].source == "amazon_location"
    assert len(routes[0].geometry) == 2


def test_amazon_location_provider_mock_failure():
    mock_client = MagicMock()
    mock_client.calculate_route.side_effect = Exception("AWS Location service unavailable")

    provider = AmazonLocationRouteProvider(client=mock_client)
    with pytest.raises(RouteProviderError):
        provider.get_routes(Coordinate(28.6139, 77.2090), Coordinate(28.6300, 77.2250))


def test_amazon_location_provider_empty_legs():
    mock_client = MagicMock()
    mock_client.calculate_route.return_value = {
        "Summary": {"Distance": 0.0, "DurationSeconds": 0.0},
        "Legs": []
    }

    provider = AmazonLocationRouteProvider(client=mock_client)
    with pytest.raises(RouteNotFoundError):
        provider.get_routes(Coordinate(28.6139, 77.2090), Coordinate(28.6300, 77.2250))
