"""
AirShield Constrained Optimizer.
Selects the minimum-exposure feasible route subject to the operational delivery time buffer:
route_duration <= fastest_route_duration + buffer_minutes.
Deterministic tie-breaking: lower exposure -> lower duration -> lower distance -> route_id.
"""

from __future__ import annotations
import math
import logging
from typing import Optional

from backend.core.models import Route, ExposureResult, OptimizationResult
from backend.core.config import Config, DEFAULT_CONFIG
from backend.core.exceptions import InvalidBufferError, InvalidRouteError, RouteNotFoundError

logger = logging.getLogger("airshield.optimize")


def validate_buffer(
    buffer_min: float,
    min_buf: float = 0.0,
    max_buf: float = 15.0
) -> float:
    """
    Validate that the operational time buffer is a finite number between min_buf and max_buf.
    Rejects negative, excessive, NaN, and non-numeric values.
    """
    try:
        val = float(buffer_min)
    except (TypeError, ValueError) as e:
        raise InvalidBufferError(f"Buffer must be numeric, got: {buffer_min}") from e

    if math.isnan(val) or math.isinf(val):
        raise InvalidBufferError(f"Buffer cannot be NaN or infinity, got: {val}")

    if not (min_buf <= val <= max_buf):
        raise InvalidBufferError(
            f"Buffer {val} min is outside the allowable range [{min_buf}, {max_buf}] minutes."
        )

    return val


def optimize_routes(
    routes: list[Route],
    exposure_results: dict[str, ExposureResult],
    buffer_min: float = 5.0,
    config: Optional[Config] = None
) -> OptimizationResult:
    """
    Find the route with the lowest estimated pollution exposure within the allowed time buffer.
    
    1. Identify fastest route (baseline).
    2. Filter routes satisfying: duration <= fastest.duration + (buffer_min * 60).
    3. Select feasible route with lowest exposure.
    4. Compute exposure reduction relative to fastest route.
    """
    if not routes:
        raise RouteNotFoundError("Cannot optimize an empty list of routes.")

    valid_buffer = validate_buffer(
        buffer_min,
        min_buf=config.MIN_BUFFER_MIN if config else DEFAULT_CONFIG.MIN_BUFFER_MIN,
        max_buf=config.MAX_BUFFER_MIN if config else DEFAULT_CONFIG.MAX_BUFFER_MIN
    )

    # 1. Identify fastest route (Deterministic tie-breaking: duration -> distance -> route_id)
    sorted_by_duration = sorted(routes, key=lambda r: (r.duration_sec, r.distance_m, r.route_id))
    fastest_route = sorted_by_duration[0]

    # Verify all routes have exposure results
    for r in routes:
        if r.route_id not in exposure_results:
            raise InvalidRouteError(f"Missing exposure result for route {r.route_id}")

    fastest_exp_val = exposure_results[fastest_route.route_id].estimated_integrated_pm25

    # 2. Filter feasible routes within operational buffer
    max_allowed_duration_sec = fastest_route.duration_sec + (valid_buffer * 60.0)
    feasible_routes = [
        r for r in routes
        if r.duration_sec <= max_allowed_duration_sec + 1e-6  # small tolerance for floating point
    ]

    # 3. Select minimum exposure route among feasible
    # Sort order: exposure -> duration -> distance -> route_id
    selected_route = min(
        feasible_routes,
        key=lambda r: (
            exposure_results[r.route_id].estimated_integrated_pm25,
            r.duration_sec,
            r.distance_m,
            r.route_id
        )
    )

    selected_exp_val = exposure_results[selected_route.route_id].estimated_integrated_pm25

    # 4. Calculate reduction relative to fastest route
    if fastest_exp_val > 0:
        reduction_fraction = (fastest_exp_val - selected_exp_val) / fastest_exp_val
        # Round negative tiny floats to 0.0
        if reduction_fraction < 0:
            reduction_fraction = 0.0
    else:
        reduction_fraction = 0.0

    reduction_percent = reduction_fraction * 100.0
    additional_sec = max(0.0, selected_route.duration_sec - fastest_route.duration_sec)

    return OptimizationResult(
        fastest_route_id=fastest_route.route_id,
        selected_route_id=selected_route.route_id,
        feasible_route_ids=[r.route_id for r in feasible_routes],
        reduction_fraction=reduction_fraction,
        reduction_percent=reduction_percent,
        fastest_exposure=fastest_exp_val,
        selected_exposure=selected_exp_val,
        additional_duration_sec=additional_sec
    )
