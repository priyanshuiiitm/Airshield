"""
Unit tests for aqi.py.
Tests OpenAQ response parsing, freshness filtering, distance selection, and mock providers.
NO external network calls occur during tests.
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest

from backend.core.models import Coordinate, AQIStation
from backend.core.aqi import (
    parse_openaq_response,
    filter_fresh_stations,
    filter_stations_by_distance,
    select_nearest_stations,
    FixtureAQIProvider,
    OpenAQProvider
)
from backend.core.exceptions import AQIProviderError


def test_parse_openaq_response_valid():
    sample_data = {
        "results": [
            {
                "id": 101,
                "name": "Delhi Station 1",
                "coordinates": {"latitude": 28.6139, "longitude": 77.2090},
                "sensors": [
                    {
                        "parameter": {"name": "pm25"},
                        "latest": {
                            "value": 145.2,
                            "datetime": "2026-10-08T11:30:00Z"
                        }
                    }
                ]
            }
        ]
    }
    stations = parse_openaq_response(sample_data)
    assert len(stations) == 1
    assert stations[0].station_id == "101"
    assert stations[0].pm25 == 145.2
    assert stations[0].lat == 28.6139
    assert stations[0].lng == 77.2090


def test_parse_openaq_response_invalid_entries():
    sample_data = {
        "results": [
            # Missing coordinates
            {"id": "bad1", "sensors": [{"parameter": {"name": "pm25"}, "latest": {"value": 50}}]},
            # Negative PM2.5
            {
                "id": "bad2",
                "coordinates": {"latitude": 28.6, "longitude": 77.2},
                "sensors": [{"parameter": {"name": "pm25"}, "latest": {"value": -20}}]
            },
            # Missing PM2.5 sensor
            {
                "id": "bad3",
                "coordinates": {"latitude": 28.6, "longitude": 77.2},
                "sensors": [{"parameter": {"name": "no2"}, "latest": {"value": 40}}]
            }
        ]
    }
    stations = parse_openaq_response(sample_data)
    assert len(stations) == 0


def test_filter_fresh_stations(frozen_now):
    fresh_time = frozen_now - timedelta(hours=1)
    stale_time = frozen_now - timedelta(hours=4)

    st_fresh = AQIStation("F1", 28.6, 77.2, 100.0, fresh_time, "test")
    st_stale = AQIStation("S1", 28.6, 77.2, 100.0, stale_time, "test")

    filtered = filter_fresh_stations([st_fresh, st_stale], freshness_hours=3.0, now=frozen_now)
    assert len(filtered) == 1
    assert filtered[0].station_id == "F1"


def test_filter_stations_by_distance():
    center = Coordinate(28.6139, 77.2090)
    # Approx 5km away
    st_near = AQIStation("NEAR", 28.64, 77.22, 100.0, datetime.now(timezone.utc), "test")
    # Approx 50km away (outside 25km)
    st_far = AQIStation("FAR", 28.20, 77.20, 100.0, datetime.now(timezone.utc), "test")

    filtered = filter_stations_by_distance([st_near, st_far], center, max_distance_km=25.0)
    assert len(filtered) == 1
    assert filtered[0].station_id == "NEAR"


def test_select_nearest_stations_limit_four():
    center = Coordinate(28.6139, 77.2090)
    stations = [
        AQIStation(f"ST_{i}", 28.6139 + (i * 0.01), 77.2090, 100.0, datetime.now(timezone.utc), "test")
        for i in range(10)
    ]
    selected = select_nearest_stations(stations, center, max_stations=4, max_distance_km=25.0)
    assert len(selected) == 4
    # Deterministic distance ordering
    assert selected[0].station_id == "ST_0"
    assert selected[1].station_id == "ST_1"
    assert selected[2].station_id == "ST_2"
    assert selected[3].station_id == "ST_3"


def test_select_nearest_stations_deterministic_tie_break():
    center = Coordinate(28.6139, 77.2090)
    # Two stations at the exact same location
    st_b = AQIStation("ST_B", 28.62, 77.21, 100.0, datetime.now(timezone.utc), "test")
    st_a = AQIStation("ST_A", 28.62, 77.21, 100.0, datetime.now(timezone.utc), "test")

    selected = select_nearest_stations([st_b, st_a], center, max_stations=4)
    assert len(selected) == 2
    # Tie broken alphabetically by station_id
    assert selected[0].station_id == "ST_A"
    assert selected[1].station_id == "ST_B"


def test_fixture_aqi_provider(delhi_stations, frozen_now):
    provider = FixtureAQIProvider(delhi_stations)
    center = Coordinate(28.6139, 77.2090)
    stations = provider.get_stations(center, max_distance_km=25.0, now=frozen_now)
    # delhi_stations has 6 stations: 1 is stale (age 6h) -> 5 fresh remain
    assert len(stations) == 5
    ids = [s.station_id for s in stations]
    assert "ST_STALE_AIRPORT" not in ids


def test_openaq_provider_mock_success():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "results": [
            {
                "id": "mock_st_1",
                "coordinates": {"latitude": 28.61, "longitude": 77.20},
                "sensors": [
                    {"parameter": {"name": "pm25"}, "latest": {"value": 110.0, "datetime": "2026-10-08T11:00:00Z"}}
                ]
            }
        ]
    }

    with patch("requests.get", return_value=mock_resp):
        provider = OpenAQProvider(api_key="test_key")
        stations = provider.get_stations(
            Coordinate(28.61, 77.20),
            now=datetime(2026, 10, 8, 12, 0, 0, tzinfo=timezone.utc)
        )
        assert len(stations) == 1
        assert stations[0].station_id == "mock_st_1"


def test_openaq_provider_mock_http_error():
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"

    with patch("requests.get", return_value=mock_resp):
        provider = OpenAQProvider(api_key="test_key")
        with pytest.raises(AQIProviderError):
            provider.get_stations(Coordinate(28.61, 77.20))
