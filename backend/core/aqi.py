"""
AirShield Air Quality (PM2.5) Provider & Spatial Station Selector.
Fetches, normalizes, and filters ambient monitoring observations.
Ensures deterministic ordering and strict freshness checking.
"""

from __future__ import annotations
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

from backend.core.models import Coordinate, AQIStation
from backend.core.config import Config, DEFAULT_CONFIG
from backend.core.routes import haversine_distance
from backend.core.exceptions import AQIProviderError, InsufficientDataError

logger = logging.getLogger("airshield.aqi")


def parse_openaq_response(data: dict, source_name: str = "openaq") -> list[AQIStation]:
    """
    Parse an OpenAQ v3 API response dictionary into validated AQIStation objects.
    Discards missing, non-numeric, or negative PM2.5 readings.
    """
    results = data.get("results", [])
    stations: list[AQIStation] = []

    for item in results:
        try:
            station_id = str(item.get("id") or item.get("name") or "unknown")
            coords = item.get("coordinates", {})
            lat = coords.get("latitude")
            lng = coords.get("longitude")

            if lat is None or lng is None:
                continue

            lat = float(lat)
            lng = float(lng)

            # Find PM2.5 sensor value
            pm25_val = None
            ts = None

            # OpenAQ v3 can return sensors list or latest measurement
            sensors = item.get("sensors", [])
            for s in sensors:
                param = s.get("parameter", {})
                param_name = param.get("name", "").lower()
                if param_name == "pm25" or param_name == "pm2.5":
                    # Check sensor latest value
                    latest = s.get("latest", {})
                    if latest:
                        pm25_val = latest.get("value")
                        dt_str = latest.get("datetime")
                        if dt_str:
                            # Parse ISO format
                            ts = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                    break

            # Fallback to direct 'value' and 'datetime' if available (e.g. measurements endpoint)
            if pm25_val is None and "value" in item:
                pm25_val = item.get("value")
                dt_str = item.get("datetime", {}).get("utc") if isinstance(item.get("datetime"), dict) else item.get("datetime")
                if dt_str:
                    ts = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))

            # Fallback timestamp if not found
            if ts is None:
                ts = datetime.now(timezone.utc)

            if pm25_val is None:
                # OpenAQ location might list PM2.5 capability without an embedded measurement in locations endpoint;
                # In that case, check if summary/latest or fallback value exists.
                continue

            pm25_float = float(pm25_val)
            if pm25_float < 0:
                logger.debug(f"Discarding negative PM2.5 value {pm25_float} at station {station_id}")
                continue

            station = AQIStation(
                station_id=station_id,
                lat=lat,
                lng=lng,
                pm25=pm25_float,
                timestamp=ts,
                source=source_name
            )
            stations.append(station)

        except (ValueError, TypeError, KeyError) as e:
            logger.debug(f"Skipping malformed station entry: {e}")
            continue

    return stations


def filter_fresh_stations(
    stations: list[AQIStation],
    freshness_hours: float = 3.0,
    now: Optional[datetime] = None
) -> list[AQIStation]:
    """
    Filter stations to retain only observations within the freshness threshold.
    Rejects stale readings. Supports frozen time for deterministic testing.
    """
    if not stations:
        return []

    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        # If naive datetime passed, assume UTC
        now = now.replace(tzinfo=timezone.utc)

    max_delta = timedelta(hours=freshness_hours)
    fresh: list[AQIStation] = []

    for st in stations:
        st_ts = st.timestamp
        if st_ts.tzinfo is None:
            st_ts = st_ts.replace(tzinfo=timezone.utc)

        # Allow readings that are up to freshness_hours in the past (or slightly in future due to clock skew)
        delta = now - st_ts
        if timedelta(seconds=-60) <= delta <= max_delta:
            fresh.append(st)
        else:
            logger.debug(f"Station {st.station_id} rejected as stale (age = {delta.total_seconds() / 3600.0:.2f} hours)")

    return fresh


def filter_stations_by_distance(
    stations: list[AQIStation],
    center: Coordinate,
    max_distance_km: float = 25.0
) -> list[AQIStation]:
    """Filter stations to those strictly within max_distance_km of center."""
    max_m = max_distance_km * 1000.0
    return [
        st for st in stations
        if haversine_distance(center, st.coordinate) <= max_m
    ]


def select_nearest_stations(
    stations: list[AQIStation],
    target: Coordinate,
    max_stations: int = 4,
    max_distance_km: float = 25.0
) -> list[AQIStation]:
    """
    Select up to max_stations nearest to target within max_distance_km.
    Sort order is strictly deterministic: (distance, station_id).
    """
    candidates = filter_stations_by_distance(stations, target, max_distance_km)
    if not candidates:
        return []

    # Sort deterministically by distance, breaking ties by station_id
    sorted_candidates = sorted(
        candidates,
        key=lambda st: (haversine_distance(target, st.coordinate), st.station_id)
    )

    return sorted_candidates[:max_stations]


class AQIProvider(ABC):
    """Abstract interface for AQI monitoring station observations."""

    @abstractmethod
    def get_stations(
        self,
        center: Coordinate,
        max_distance_km: float = 25.0,
        now: Optional[datetime] = None
    ) -> list[AQIStation]:
        """Fetch fresh PM2.5 stations within radius of center."""
        pass


class FixtureAQIProvider(AQIProvider):
    """Deterministic in-memory AQI provider for tests and reproducible offline demos."""

    def __init__(self, stations: list[AQIStation]):
        self._stations = stations

    def get_stations(
        self,
        center: Coordinate,
        max_distance_km: float = 25.0,
        now: Optional[datetime] = None
    ) -> list[AQIStation]:
        fresh = filter_fresh_stations(self._stations, freshness_hours=DEFAULT_CONFIG.FRESHNESS_HOURS, now=now)
        return filter_stations_by_distance(fresh, center, max_distance_km=max_distance_km)


class OpenAQProvider(AQIProvider):
    """Production provider integrating OpenAQ v3 REST API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or DEFAULT_CONFIG.OPENAQ_API_KEY
        self.base_url = "https://api.openaq.org/v3"

    def get_stations(
        self,
        center: Coordinate,
        max_distance_km: float = 25.0,
        now: Optional[datetime] = None
    ) -> list[AQIStation]:
        import requests

        url = f"{self.base_url}/locations"
        radius_m = int(max_distance_km * 1000)
        params = {
            "coordinates": f"{center.lat},{center.lng}",
            "radius": radius_m,
            "parameters": "pm25",
            "limit": 100
        }
        headers = {"X-API-Key": self.api_key} if self.api_key else {}

        logger.info(f"Querying OpenAQ API for stations within {max_distance_km}km of ({center.lat}, {center.lng})")
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            if response.status_code != 200:
                raise AQIProviderError(
                    f"OpenAQ request returned status {response.status_code}: {response.text}"
                )
            data = response.json()
        except Exception as e:
            if isinstance(e, AQIProviderError):
                raise
            raise AQIProviderError(f"OpenAQ network call failed: {e}") from e

        all_stations = parse_openaq_response(data)
        fresh = filter_fresh_stations(all_stations, freshness_hours=DEFAULT_CONFIG.FRESHNESS_HOURS, now=now)
        return fresh
