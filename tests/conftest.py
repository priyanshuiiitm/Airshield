"""
AirShield Pytest Configuration and Test Fixtures.
Provides in-memory route and AQI station objects loaded from JSON fixtures.
Guarantees NO external network calls during test runs.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
import pytest

from backend.core.models import Coordinate, Route, AQIStation

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_routes_from_fixture(file_name: str) -> list[Route]:
    path = FIXTURES_DIR / "routes" / file_name
    with open(path, "r", encoding="utf-8") as f:
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
                source=r.get("source", "fixture"),
                free_flow_duration_sec=r.get("free_flow_duration_sec"),
                has_traffic=r.get("has_traffic", True)
            )
        )
    return routes


def load_stations_from_fixture(file_name: str) -> list[AQIStation]:
    path = FIXTURES_DIR / "aqi" / file_name
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    stations = []
    for s in data.get("stations", []):
        dt = datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00"))
        stations.append(
            AQIStation(
                station_id=s["station_id"],
                lat=float(s["lat"]),
                lng=float(s["lng"]),
                pm25=float(s["pm25"]),
                timestamp=dt,
                source=s.get("source", "fixture")
            )
        )
    return stations


@pytest.fixture
def frozen_now() -> datetime:
    """Fixed frozen reference time matching the test fixtures."""
    return datetime(2026, 10, 8, 12, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def standard_routes() -> list[Route]:
    return load_routes_from_fixture("standard_routes.json")


@pytest.fixture
def single_route() -> list[Route]:
    return load_routes_from_fixture("single_route.json")


@pytest.fixture
def delhi_stations() -> list[AQIStation]:
    return load_stations_from_fixture("delhi_stations.json")


@pytest.fixture
def sparse_stations() -> list[AQIStation]:
    return load_stations_from_fixture("sparse_stations.json")


@pytest.fixture
def clean_day_stations() -> list[AQIStation]:
    return load_stations_from_fixture("clean_day_stations.json")
