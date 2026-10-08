"""
AirShield Exposure Engine.
Computes high-resolution, deterministic route-level pollution exposure scores.
Combines 200m spatial segmentation, Inverse-Distance Weighting (IDW),
and transparent spatial proxy modifiers.
"""

from __future__ import annotations
import math
import logging
from typing import Optional

from backend.core.models import (
    Coordinate,
    Route,
    RouteSegment,
    AQIStation,
    ExposureResult,
    Confidence
)
from backend.core.config import Config, DEFAULT_CONFIG
from backend.core.routes import haversine_distance, calculate_route_distance
from backend.core.aqi import select_nearest_stations

logger = logging.getLogger("airshield.exposure")


def interpolate_coordinate(c1: Coordinate, c2: Coordinate, fraction: float) -> Coordinate:
    """Linearly interpolate between two coordinates in decimal degrees."""
    lat = c1.lat + (c2.lat - c1.lat) * fraction
    lng = c1.lng + (c2.lng - c1.lng) * fraction
    return Coordinate(lat=lat, lng=lng)


def segment_route(route: Route, target_segment_length_m: float = 200.0) -> list[RouteSegment]:
    """
    Divide a route geometry into sub-segments of approximately target_segment_length_m.
    Allocates duration proportionally so sum(segment.duration_sec) == route.duration_sec.
    Preserves total route distance and endpoints.
    """
    geom = route.geometry
    if len(geom) < 2:
        mid = geom[0] if geom else Coordinate(0.0, 0.0)
        return [RouteSegment(start=mid, end=mid, length_m=0.0, midpoint=mid, duration_sec=route.duration_sec)]

    total_dist_m = calculate_route_distance(geom)
    if total_dist_m <= 0:
        mid = geom[0]
        return [RouteSegment(start=geom[0], end=geom[-1], length_m=0.0, midpoint=mid, duration_sec=route.duration_sec)]

    # Collect dense sample points along the linestring
    dense_points: list[Coordinate] = [geom[0]]
    
    for i in range(len(geom) - 1):
        p1 = geom[i]
        p2 = geom[i + 1]
        leg_dist = haversine_distance(p1, p2)
        
        if leg_dist <= 0:
            continue
            
        if leg_dist <= target_segment_length_m * 1.5:
            dense_points.append(p2)
        else:
            num_sub = max(1, int(round(leg_dist / target_segment_length_m)))
            for s in range(1, num_sub + 1):
                frac = float(s) / float(num_sub)
                dense_points.append(interpolate_coordinate(p1, p2, frac))

    if len(dense_points) < 2:
        dense_points = [geom[0], geom[-1]]

    # Form RouteSegments from adjacent dense points
    raw_segments = []
    accum_len = 0.0
    for i in range(len(dense_points) - 1):
        start = dense_points[i]
        end = dense_points[i + 1]
        seg_len = haversine_distance(start, end)
        mid = interpolate_coordinate(start, end, 0.5)
        raw_segments.append((start, end, seg_len, mid))
        accum_len += seg_len

    if accum_len <= 0:
        accum_len = total_dist_m

    segments: list[RouteSegment] = []
    for start, end, seg_len, mid in raw_segments:
        # Proportional duration allocation
        seg_dur = route.duration_sec * (seg_len / accum_len) if accum_len > 0 else (route.duration_sec / len(raw_segments))
        segments.append(
            RouteSegment(
                start=start,
                end=end,
                length_m=seg_len,
                midpoint=mid,
                duration_sec=seg_dur
            )
        )

    return segments


def idw_interpolation(point: Coordinate, stations: list[AQIStation], epsilon: float = 1e-6) -> float:
    """
    Inverse-Distance Weighting (IDW) to estimate PM2.5 at point from nearby stations.
    Formula: C_i = SUM(C_j / (d_ij^2 + eps)) / SUM(1 / (d_ij^2 + eps))
    Distance d_ij measured in kilometers.
    """
    if not stations:
        return 0.0

    numerator = 0.0
    denominator = 0.0

    for st in stations:
        dist_km = haversine_distance(point, st.coordinate) / 1000.0
        
        # If point is effectively at the station (< 1 meter), return station PM2.5 directly
        if dist_km < 0.001:
            return st.pm25
            
        weight = 1.0 / (dist_km ** 2 + epsilon)
        numerator += st.pm25 * weight
        denominator += weight

    return (numerator / denominator) if denominator > 0 else 0.0


def get_spatial_modifier(
    midpoint: Coordinate,
    spatial_context: Optional[dict] = None,
    strength_multiplier: float = 1.0,
    config: Optional[Config] = None
) -> float:
    """
    Calculate contextual spatial adjustment factor based on transparent road/green proxies.
    road_factor: <=50m -> 1.25, 50-200m -> 1.10, >200m -> 1.00
    green_factor: 1 - (0.15 * green_fraction)
    """
    cfg = config or DEFAULT_CONFIG
    if not spatial_context:
        return 1.0

    # 1. Road factor
    dist_road_m = spatial_context.get("distance_to_major_road_m")
    if dist_road_m is not None:
        if dist_road_m <= cfg.MAJOR_ROAD_DISTANCE_M:
            road_delta = (cfg.MAJOR_ROAD_MULTIPLIER - 1.0) * strength_multiplier
            road_factor = 1.0 + road_delta
        elif dist_road_m <= cfg.SECONDARY_ROAD_DISTANCE_M:
            road_delta = (cfg.SECONDARY_ROAD_MULTIPLIER - 1.0) * strength_multiplier
            road_factor = 1.0 + road_delta
        else:
            road_factor = 1.0
    else:
        road_factor = 1.0

    # 2. Green factor
    green_frac = spatial_context.get("green_fraction", 0.0)
    green_frac = max(0.0, min(1.0, float(green_frac)))
    green_reduction = cfg.GREEN_FACTOR_STRENGTH * strength_multiplier * green_frac
    green_factor = max(0.5, 1.0 - green_reduction)

    return road_factor * green_factor


def determine_confidence(unique_station_count: int, config: Optional[Config] = None) -> Confidence:
    """Classify confidence level based on number of distinct stations used."""
    cfg = config or DEFAULT_CONFIG
    if unique_station_count >= cfg.HIGH_CONFIDENCE_MIN_STATIONS:
        return Confidence.HIGH
    elif unique_station_count >= cfg.MEDIUM_CONFIDENCE_MIN_STATIONS:
        return Confidence.MEDIUM
    return Confidence.LOW


def compute_route_exposure(
    route: Route,
    stations: list[AQIStation],
    config: Optional[Config] = None,
    strength_multiplier: float = 1.0,
    spatial_contexts: Optional[list[dict]] = None
) -> ExposureResult:
    """
    Compute total modeled pollution exposure for a candidate route.
    Exposure unit: µg·min/m³ (Integrated PM2.5 concentration multiplied by duration).
    """
    cfg = config or DEFAULT_CONFIG
    segments = segment_route(route, target_segment_length_m=cfg.SEGMENT_LENGTH_M)

    total_exposure = 0.0
    stations_used_set: set[str] = set()

    for idx, seg in enumerate(segments):
        # 1. Select up to 4 nearest stations within 25km
        nearest = select_nearest_stations(
            stations,
            seg.midpoint,
            max_stations=cfg.MAX_STATIONS,
            max_distance_km=cfg.MAX_STATION_DISTANCE_KM
        )
        for st in nearest:
            stations_used_set.add(st.station_id)

        # 2. Estimate PM2.5 at segment midpoint via IDW
        interpolated_pm25 = idw_interpolation(seg.midpoint, nearest)

        # 3. Apply transparent spatial proxy modifier
        ctx = spatial_contexts[idx] if spatial_contexts and idx < len(spatial_contexts) else None
        modifier = get_spatial_modifier(seg.midpoint, ctx, strength_multiplier=strength_multiplier, config=cfg)
        adjusted_pm25 = interpolated_pm25 * modifier

        # 4. Integrate exposure = PM2.5 concentration * time_in_minutes
        seg_exposure = adjusted_pm25 * seg.duration_min
        total_exposure += seg_exposure

    duration_min = route.duration_min
    average_pm25 = (total_exposure / duration_min) if duration_min > 0 else 0.0
    conf = determine_confidence(len(stations_used_set), config=cfg)

    return ExposureResult(
        route_id=route.route_id,
        exposure_index=100.0,  # Default, normalized later relative to fastest route
        estimated_integrated_pm25=total_exposure,
        average_pm25=average_pm25,
        confidence=conf,
        station_count_used=len(stations_used_set),
        segment_count=len(segments),
        is_robust=True
    )


def compute_relative_exposure_indices(
    exposure_results: dict[str, ExposureResult],
    fastest_route_id: str
) -> dict[str, ExposureResult]:
    """
    Normalize route exposure values to a relative index where the fastest route is 100.
    Example: Fastest = 1000, Alternative = 590 -> Alternative Index = 59 (41% lower).
    """
    fastest = exposure_results.get(fastest_route_id)
    if not fastest or fastest.estimated_integrated_pm25 <= 0:
        return exposure_results

    baseline = fastest.estimated_integrated_pm25
    normalized = {}

    for rid, exp in exposure_results.items():
        rel_index = (exp.estimated_integrated_pm25 / baseline) * 100.0
        normalized[rid] = ExposureResult(
            route_id=exp.route_id,
            exposure_index=rel_index,
            estimated_integrated_pm25=exp.estimated_integrated_pm25,
            average_pm25=exp.average_pm25,
            confidence=exp.confidence,
            station_count_used=exp.station_count_used,
            segment_count=exp.segment_count,
            is_robust=exp.is_robust
        )

    return normalized


def evaluate_robustness(
    routes: list[Route],
    stations: list[AQIStation],
    buffer_min: float,
    config: Optional[Config] = None
) -> tuple[bool, str]:
    """
    Evaluate if the lowest-exposure feasible route is robust against model parameter sensitivity.
    Runs optimization under 3 modifier strengths: DEFAULT (1.0x), HALF (0.5x), and 1.5x.
    Returns (is_robust, winning_route_id).
    """
    from backend.core.optimize import optimize_routes

    cfg = config or DEFAULT_CONFIG
    strengths = [cfg.DEFAULT_STRENGTH, cfg.HALF_STRENGTH, cfg.ONE_POINT_FIVE_STRENGTH]
    winning_ids = []

    for strength in strengths:
        exp_results = {}
        for r in routes:
            exp = compute_route_exposure(r, stations, config=cfg, strength_multiplier=strength)
            exp_results[r.route_id] = exp
        
        # Optimize
        opt = optimize_routes(routes, exp_results, buffer_min=buffer_min, config=cfg)
        winning_ids.append(opt.selected_route_id)

    # Robust if all 3 configurations pick the exact same winning route
    is_robust = (len(set(winning_ids)) == 1)
    primary_winner = winning_ids[0] if winning_ids else ""
    return is_robust, primary_winner
