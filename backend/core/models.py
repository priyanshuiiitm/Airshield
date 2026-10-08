"""
AirShield Core Data Models.
Structured, typed dataclasses and enums for the deterministic decision engine.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

from backend.core.exceptions import InvalidCoordinateError, InvalidRouteError


class RouteOutcome(str, Enum):
    """The four mutually exclusive classification states."""
    LOW = "LOW"
    AVOIDABLE = "AVOIDABLE"
    UNAVOIDABLE = "UNAVOIDABLE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class Confidence(str, Enum):
    """Confidence level based on spatial monitoring density."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass(frozen=True)
class Coordinate:
    """Geographic coordinate in decimal degrees."""
    lat: float
    lng: float

    def __post_init__(self):
        if not (-90.0 <= self.lat <= 90.0):
            raise InvalidCoordinateError(f"Latitude {self.lat} must be between -90 and 90.")
        if not (-180.0 <= self.lng <= 180.0):
            raise InvalidCoordinateError(f"Longitude {self.lng} must be between -180 and 180.")


# Type alias for route geometry points
RoutePoint = Coordinate


@dataclass(frozen=True)
class Route:
    """Candidate route with geometry and duration metrics."""
    route_id: str
    geometry: list[Coordinate]
    duration_sec: float
    distance_m: float
    source: str
    free_flow_duration_sec: Optional[float] = None
    has_traffic: bool = True

    def __post_init__(self):
        if not self.route_id:
            raise InvalidRouteError("Route ID cannot be empty.")
        if len(self.geometry) < 2:
            raise InvalidRouteError(f"Route {self.route_id} must have at least 2 points in geometry.")
        if self.duration_sec <= 0:
            raise InvalidRouteError(f"Route {self.route_id} duration must be positive, got {self.duration_sec}.")
        if self.distance_m < 0:
            raise InvalidRouteError(f"Route {self.route_id} distance cannot be negative, got {self.distance_m}.")

    @property
    def duration_min(self) -> float:
        return self.duration_sec / 60.0

    @property
    def distance_km(self) -> float:
        return self.distance_m / 1000.0


@dataclass(frozen=True)
class AQIStation:
    """Air quality monitoring station observation."""
    station_id: str
    lat: float
    lng: float
    pm25: float
    timestamp: datetime
    source: str

    def __post_init__(self):
        if not (-90.0 <= self.lat <= 90.0) or not (-180.0 <= self.lng <= 180.0):
            raise InvalidCoordinateError(f"Station {self.station_id} coordinates ({self.lat}, {self.lng}) invalid.")
        if self.pm25 < 0:
            raise ValueError(f"Station {self.station_id} PM2.5 cannot be negative, got {self.pm25}.")

    @property
    def coordinate(self) -> Coordinate:
        return Coordinate(lat=self.lat, lng=self.lng)


@dataclass(frozen=True)
class RouteSegment:
    """Sub-segment of a route for high-resolution spatial integration."""
    start: Coordinate
    end: Coordinate
    length_m: float
    midpoint: Coordinate
    duration_sec: float

    @property
    def duration_min(self) -> float:
        return self.duration_sec / 60.0


@dataclass(frozen=True)
class ExposureResult:
    """Modeled exposure calculation for a single route."""
    route_id: str
    exposure_index: float  # Relative index: 100 for fastest route
    estimated_integrated_pm25: float  # Absolute modeled integration: sum(pm25 * minutes) [µg·min/m³]
    average_pm25: float  # Modeled average concentration along route [µg/m³]
    confidence: Confidence
    station_count_used: int
    segment_count: int
    is_robust: bool = True


@dataclass(frozen=True)
class OptimizationResult:
    """Constrained optimization selection result."""
    fastest_route_id: str
    selected_route_id: str
    feasible_route_ids: list[str]
    reduction_fraction: float  # (fastest_exp - selected_exp) / fastest_exp
    reduction_percent: float  # reduction_fraction * 100
    fastest_exposure: float
    selected_exposure: float
    additional_duration_sec: float = 0.0

    @property
    def additional_duration_min(self) -> float:
        return self.additional_duration_sec / 60.0


@dataclass(frozen=True)
class ClassificationResult:
    """Final decision output with audit trail and benefit trigger status."""
    outcome: RouteOutcome
    reason_code: str
    optimization: OptimizationResult
    confidence: Confidence
    better_outside_buffer: bool = False
    extra_minutes_needed: float = 0.0
    outside_buffer_reduction_percent: float = 0.0
    reward_eligible: bool = False
    benefit_eligible: bool = False
    metadata: dict = field(default_factory=dict)
