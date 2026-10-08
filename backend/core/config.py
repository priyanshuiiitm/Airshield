"""
AirShield Central Configuration.
Holds all operational thresholds, spatial modifiers, and model assumptions.
No magic numbers inside business logic.
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Central configuration for deterministic routing, exposure, and classification."""

    # Operational Buffer Limits (minutes)
    DEFAULT_BUFFER_MIN: float = 5.0
    MIN_BUFFER_MIN: float = 0.0
    MAX_BUFFER_MIN: float = 15.0

    # Decision Thresholds
    REDUCTION_THRESHOLD: float = 0.15  # 15% minimal meaningful exposure reduction
    LOW_PM25_THRESHOLD: float = 60.0   # µg/m³ - below this is considered acceptable/low
    HIGH_PM25_THRESHOLD: float = 90.0  # µg/m³ - above this is elevated/unavoidable risk

    # Air Quality Monitoring Selection
    MAX_STATIONS: int = 4
    MAX_STATION_DISTANCE_KM: float = 25.0
    FRESHNESS_HOURS: float = 3.0

    # Route Segmentation & Geometry
    SEGMENT_LENGTH_M: float = 200.0
    OVERLAP_THRESHOLD: float = 0.90  # >90% geometry overlap considered duplicate

    # Spatial Proxy Modifiers (Transparent contextual assumptions)
    MAJOR_ROAD_DISTANCE_M: float = 50.0
    SECONDARY_ROAD_DISTANCE_M: float = 200.0
    MAJOR_ROAD_MULTIPLIER: float = 1.25
    SECONDARY_ROAD_MULTIPLIER: float = 1.10
    GREEN_FACTOR_STRENGTH: float = 0.15

    # Confidence Thresholds
    HIGH_CONFIDENCE_MIN_STATIONS: int = 3
    MEDIUM_CONFIDENCE_MIN_STATIONS: int = 2

    # Robustness Configurations (Multiplier strengths)
    DEFAULT_STRENGTH: float = 1.0
    HALF_STRENGTH: float = 0.5
    ONE_POINT_FIVE_STRENGTH: float = 1.5

    # Simulated Financial Benefits (in INR)
    REWARD_AVOIDABLE: int = 3
    BENEFIT_UNAVOIDABLE: int = 5

    # Delhi NCR Bounding Box for Coordinate Sanity (Optional validation)
    DELHI_LAT_MIN: float = 28.20
    DELHI_LAT_MAX: float = 28.95
    DELHI_LNG_MIN: float = 76.70
    DELHI_LNG_MAX: float = 77.60

    # Environment / External Credentials
    OPENAQ_API_KEY: str = os.getenv("OPENAQ_API_KEY", "")
    AWS_LOCATION_CALCULATOR_NAME: str = os.getenv("AWS_LOCATION_CALCULATOR_NAME", "AirShieldRouteCalculator")
    AWS_DEFAULT_REGION: str = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")


# Global default instance
DEFAULT_CONFIG = Config()
