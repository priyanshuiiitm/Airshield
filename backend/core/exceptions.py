"""
AirShield Core Exceptions.
All domain-specific errors inherit from AirShieldError.
No silent failures; errors are explicit and typed.
"""

class AirShieldError(Exception):
    """Base exception for all AirShield domain errors."""
    pass


class InvalidCoordinateError(AirShieldError):
    """Raised when coordinates are outside valid geographic or regional bounds."""
    pass


class InvalidBufferError(AirShieldError):
    """Raised when the operational time buffer is negative, excessive, or non-numeric."""
    pass


class InvalidRouteError(AirShieldError):
    """Raised when route geometry, duration, or distance is malformed or invalid."""
    pass


class RouteNotFoundError(AirShieldError):
    """Raised when no valid routes can be found or provided."""
    pass


class RouteProviderError(AirShieldError):
    """Raised when an external or mock route provider fails."""
    pass


class AQIProviderError(AirShieldError):
    """Raised when an external or mock AQI provider fails."""
    pass


class InsufficientDataError(AirShieldError):
    """Raised when air quality monitoring coverage is insufficient to compute confidence."""
    pass
