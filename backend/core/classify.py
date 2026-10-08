"""
AirShield 4-State Classifier.
Converts optimizer & exposure metrics into exactly one decision outcome:
1. LOW
2. AVOIDABLE
3. UNAVOIDABLE
4. INSUFFICIENT_DATA

Includes audit metadata when cleaner routes exist outside the operational time buffer.
"""

from __future__ import annotations
import logging
from typing import Optional

from backend.core.models import (
    Route,
    ExposureResult,
    OptimizationResult,
    ClassificationResult,
    RouteOutcome,
    Confidence
)
from backend.core.config import Config, DEFAULT_CONFIG

logger = logging.getLogger("airshield.classify")


def classify_trip(
    opt_result: OptimizationResult,
    fastest_exposure_result: ExposureResult,
    all_exposure_results: dict[str, ExposureResult],
    all_routes: list[Route],
    is_robust: bool,
    buffer_min: float = 5.0,
    config: Optional[Config] = None
) -> ClassificationResult:
    """
    Classify the trip into one of four mutually exclusive operational states.
    
    RULE 1: INSUFFICIENT_DATA -> Monitoring confidence is LOW.
    RULE 2: LOW -> Baseline PM2.5 is below acceptable threshold (<60 µg/m³) and no intervention needed.
    RULE 3: AVOIDABLE -> Baseline elevated, feasible safer route gives >=15% reduction and is robust.
    RULE 4: UNAVOIDABLE -> Baseline elevated, no feasible route satisfies >=15% reduction within buffer.
    """
    cfg = config or DEFAULT_CONFIG
    confidence = fastest_exposure_result.confidence
    baseline_avg_pm25 = fastest_exposure_result.average_pm25
    reduction = opt_result.reduction_fraction

    # ----------------------------------------------------
    # Check if a cleaner route exists OUTSIDE the buffer
    # ----------------------------------------------------
    fastest_route = next((r for r in all_routes if r.route_id == opt_result.fastest_route_id), all_routes[0])
    infeasible_candidates = [
        r for r in all_routes
        if r.route_id not in opt_result.feasible_route_ids
    ]
    
    better_outside_buffer = False
    extra_minutes_needed = 0.0
    outside_buffer_reduction_percent = 0.0

    if infeasible_candidates:
        # Find best route outside buffer
        best_outside = min(
            infeasible_candidates,
            key=lambda r: all_exposure_results[r.route_id].estimated_integrated_pm25
        )
        best_outside_exp = all_exposure_results[best_outside.route_id].estimated_integrated_pm25
        if opt_result.fastest_exposure > 0:
            outside_red = (opt_result.fastest_exposure - best_outside_exp) / opt_result.fastest_exposure
            if outside_red >= cfg.REDUCTION_THRESHOLD:
                better_outside_buffer = True
                extra_minutes_needed = max(0.0, best_outside.duration_min - fastest_route.duration_min)
                outside_buffer_reduction_percent = outside_red * 100.0

    # ----------------------------------------------------
    # RULE 1 — INSUFFICIENT_DATA
    # ----------------------------------------------------
    if confidence == Confidence.LOW:
        logger.info("Trip classified as INSUFFICIENT_DATA due to low station coverage.")
        return ClassificationResult(
            outcome=RouteOutcome.INSUFFICIENT_DATA,
            reason_code="insufficient_monitoring_data",
            optimization=opt_result,
            confidence=confidence,
            better_outside_buffer=better_outside_buffer,
            extra_minutes_needed=extra_minutes_needed,
            outside_buffer_reduction_percent=outside_buffer_reduction_percent,
            reward_eligible=False,
            benefit_eligible=False,
            metadata={"explanation": "Air quality monitoring coverage is insufficient to reliably compare routes."}
        )

    # ----------------------------------------------------
    # RULE 2 — LOW (Clean day / acceptable conditions)
    # ----------------------------------------------------
    if baseline_avg_pm25 < cfg.LOW_PM25_THRESHOLD and reduction < cfg.REDUCTION_THRESHOLD:
        logger.info(f"Trip classified as LOW (Baseline PM2.5: {baseline_avg_pm25:.1f} < {cfg.LOW_PM25_THRESHOLD}).")
        return ClassificationResult(
            outcome=RouteOutcome.LOW,
            reason_code="ambient_air_acceptable",
            optimization=opt_result,
            confidence=confidence,
            better_outside_buffer=better_outside_buffer,
            extra_minutes_needed=extra_minutes_needed,
            outside_buffer_reduction_percent=outside_buffer_reduction_percent,
            reward_eligible=False,
            benefit_eligible=False,
            metadata={"explanation": "Air quality is within acceptable range; no routing intervention required."}
        )

    # ----------------------------------------------------
    # RULE 3 — AVOIDABLE
    # ----------------------------------------------------
    if (
        opt_result.selected_route_id != opt_result.fastest_route_id
        and reduction >= cfg.REDUCTION_THRESHOLD
        and is_robust
        and confidence != Confidence.LOW
    ):
        logger.info(f"Trip classified as AVOIDABLE (Reduction: {opt_result.reduction_percent:.1f}% >= 15%).")
        return ClassificationResult(
            outcome=RouteOutcome.AVOIDABLE,
            reason_code="meaningful_exposure_reduction_within_buffer",
            optimization=opt_result,
            confidence=confidence,
            better_outside_buffer=better_outside_buffer,
            extra_minutes_needed=extra_minutes_needed,
            outside_buffer_reduction_percent=outside_buffer_reduction_percent,
            reward_eligible=True,
            benefit_eligible=False,
            metadata={"explanation": f"Safer route found with {opt_result.reduction_percent:.1f}% estimated exposure reduction."}
        )

    # ----------------------------------------------------
    # RULE 4 — UNAVOIDABLE (within policy)
    # ----------------------------------------------------
    logger.info("Trip classified as UNAVOIDABLE within operational policy buffer.")
    return ClassificationResult(
        outcome=RouteOutcome.UNAVOIDABLE,
        reason_code="no_feasible_safer_route_within_buffer",
        optimization=opt_result,
        confidence=confidence,
        better_outside_buffer=better_outside_buffer,
        extra_minutes_needed=extra_minutes_needed,
        outside_buffer_reduction_percent=outside_buffer_reduction_percent,
        reward_eligible=False,
        benefit_eligible=True,
        metadata={
            "explanation": "No meaningful safer route is available within the allowed delivery time window.",
            "better_outside_buffer": better_outside_buffer,
            "extra_minutes_needed": round(extra_minutes_needed, 1)
        }
    )
