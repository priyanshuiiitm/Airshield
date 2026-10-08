"""
AirShield Route Provider & Geometry Engine.
Fetches, normalizes, deduplicates, and validates candidate routes.
Uses geodesic (Haversine) mathematics for all distance and overlap checks.
"""

from __future__ import annotations
import math
import logging
from abc import ABC, abstractmethod
from typing import Optional, Any

from backend.core.models import Coordinate, Route
from backend.core.config import Config, DEFAULT_CONFIG
from backend.core.exceptions import (
    RouteProviderError,
    InvalidRouteError,
    RouteNotFoundError,
    InvalidCoordinateError
)

logger = logging.getLogger("airshield.routes")


def haversine_distance(p1: Coordinate, p2: Coordinate) -> float:
    """
    Calculate the great-circle distance between two coordinates in meters.
    Uses Haversine formula on Earth mean radius (6,371,000 m).
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(p1.lat)
    phi2 = math.radians(p2.lat)
    delta_phi = math.radians(p2.lat - p1.lat)
    delta_lambda = math.radians(p2.lng - p1.lng)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return R * c


def calculate_route_distance(geometry: list[Coordinate]) -> float:
    """Calculate cumulative geodesic distance along a route geometry in meters."""
    if len(geometry) < 2:
        return 0.0
    total = 0.0
    for i in range(len(geometry) - 1):
        total += haversine_distance(geometry[i], geometry[i + 1])
    return total


def point_to_segment_distance(p: Coordinate, a: Coordinate, b: Coordinate) -> float:
    """
    Calculate minimum distance in meters from point p to line segment ab.
    Uses projected flat approximation for small local segments.
    """
    # Vector ab
    ab_dist = haversine_distance(a, b)
    if ab_dist < 1.0:
        return haversine_distance(p, a)

    # Approximate equirectangular projection centered at a.lat
    lat_rad = math.radians(a.lat)
    kx = 111320.0 * math.cos(lat_rad)
    ky = 110540.0

    ax, ay = a.lng * kx, a.lat * ky
    bx, by = b.lng * kx, b.lat * ky
    px, py = p.lng * kx, p.lat * ky

    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return haversine_distance(p, a)

    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    proj_x = ax + t * dx
    proj_y = ay + t * dy

    return math.sqrt((px - proj_x) ** 2 + (py - proj_y) ** 2)


def calculate_geometry_overlap(r1: Route, r2: Route, buffer_m: float = 75.0) -> float:
    """
    Calculate geometry overlap fraction [0.0 - 1.0] between two routes.
    Measures the fraction of sample points in r2 within buffer_m meters of r1.
    """
    if not r1.geometry or not r2.geometry:
        return 0.0

    # Sample points along r2 geometry
    points_matched = 0
    total_points = len(r2.geometry)

    for p in r2.geometry:
        # Check minimum distance to any segment in r1
        min_d = float("inf")
        for i in range(len(r1.geometry) - 1):
            d = point_to_segment_distance(p, r1.geometry[i], r1.geometry[i + 1])
            if d < min_d:
                min_d = d
            if min_d <= buffer_m:
                break
        if min_d <= buffer_m:
            points_matched += 1

    return points_matched / float(total_points) if total_points > 0 else 0.0


def sort_routes_by_duration(routes: list[Route]) -> list[Route]:
    """Sort routes ascending by duration (fastest first), breaking ties by distance and ID."""
    return sorted(routes, key=lambda r: (r.duration_sec, r.distance_m, r.route_id))


def deduplicate_routes(routes: list[Route], overlap_threshold: float = 0.90) -> list[Route]:
    """
    Filter out candidate routes that have >90% geometry overlap with a faster alternative.
    The fastest route is ALWAYS preserved.
    """
    if not routes:
        return []

    sorted_routes = sort_routes_by_duration(routes)
    unique_routes: list[Route] = [sorted_routes[0]]

    for candidate in sorted_routes[1:]:
        is_duplicate = False
        for accepted in unique_routes:
            overlap = calculate_geometry_overlap(accepted, candidate)
            if overlap >= overlap_threshold:
                logger.debug(
                    f"Route {candidate.route_id} dropped as duplicate of {accepted.route_id} (overlap={overlap:.2%})"
                )
                is_duplicate = True
                break
        if not is_duplicate:
            unique_routes.append(candidate)

    return unique_routes


def decode_route_geometry(coords: list[list[float]]) -> list[Coordinate]:
    """
    Convert GeoJSON / Amazon Location coordinate pairs [[lon, lat], ...] to list[Coordinate].
    Amazon Location returns [longitude, latitude].
    """
    result = []
    for pair in coords:
        if len(pair) >= 2:
            # Amazon Location format: [lng, lat]
            lng, lat = float(pair[0]), float(pair[1])
            result.append(Coordinate(lat=lat, lng=lng))
    return result


class RouteProvider(ABC):
    """Abstract interface for candidate route generation."""

    @abstractmethod
    def get_routes(
        self,
        pickup: Coordinate,
        destination: Coordinate,
        travel_mode: str = "Car"
    ) -> list[Route]:
        """Fetch candidate routes between pickup and destination."""
        pass


class FixtureRouteProvider(RouteProvider):
    """Deterministic route provider backed by predefined in-memory routes or JSON fixtures."""

    def __init__(self, routes: list[Route]):
        self._routes = routes

    def get_routes(
        self,
        pickup: Coordinate,
        destination: Coordinate,
        travel_mode: str = "Car"
    ) -> list[Route]:
        if not self._routes:
            raise RouteNotFoundError("No routes configured in fixture provider.")
        return deduplicate_routes(self._routes)


class AmazonLocationRouteProvider(RouteProvider):
    """Production route provider using AWS Amazon Location Service CalculateRoute API."""

    def __init__(self, calculator_name: Optional[str] = None, region_name: Optional[str] = None, client: Any = None):
        self.calculator_name = calculator_name or DEFAULT_CONFIG.AWS_LOCATION_CALCULATOR_NAME
        self.region_name = region_name or DEFAULT_CONFIG.AWS_DEFAULT_REGION
        self._client = client

    def _get_client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client("location", region_name=self.region_name)
        return self._client

    def get_routes(
        self,
        pickup: Coordinate,
        destination: Coordinate,
        travel_mode: str = "Car"
    ) -> list[Route]:
        logger.info(f"Fetching routes from Amazon Location ({pickup.lat},{pickup.lng}) -> ({destination.lat},{destination.lng})")
        client = self._get_client()

        # Map travel mode to valid AWS Location TravelMode ('Car', 'Truck', 'Walking', 'Bicycle', 'Motorcycle')
        aws_mode = travel_mode if travel_mode in ["Car", "Truck", "Walking", "Bicycle", "Motorcycle"] else "Car"

        try:
            response = client.calculate_route(
                CalculatorName=self.calculator_name,
                DeparturePosition=[pickup.lng, pickup.lat],
                DestinationPosition=[destination.lng, destination.lat],
                TravelMode=aws_mode,
                IncludeLegGeometry=True,
                DistanceUnit="Kilometers"
            )
        except Exception as e:
            logger.error(f"Amazon Location CalculateRoute failed: {e}")
            raise RouteProviderError(f"Failed to fetch routes from Amazon Location: {e}") from e

        summary = response.get("Summary", {})
        legs = response.get("Legs", [])

        if not legs:
            raise RouteNotFoundError("Amazon Location returned no route legs.")

        # Extract geometry points from legs
        coords: list[Coordinate] = []
        for leg in legs:
            leg_geom = leg.get("Geometry", {}).get("LineString", [])
            coords.extend(decode_route_geometry(leg_geom))

        if len(coords) < 2:
            # Fallback to direct straight line if geometry was empty
            coords = [pickup, destination]

        duration_sec = float(summary.get("DurationSeconds", 0.0))
        distance_km = float(summary.get("Distance", 0.0))
        distance_m = distance_km * 1000.0 if distance_km > 0 else calculate_route_distance(coords)

        if duration_sec <= 0:
            raise InvalidRouteError(f"Invalid duration returned from Location Service: {duration_sec}s")

        primary_route = Route(
            route_id="R1_PRIMARY",
            geometry=coords,
            duration_sec=duration_sec,
            distance_m=distance_m,
            source="amazon_location",
            has_traffic=True
        )

        return [primary_route]
