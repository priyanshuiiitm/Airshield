"""
Unit tests for classify.py.
Verifies all 4 operational decision states and audit metadata.
"""

from backend.core.models import (
    Coordinate,
    Route,
    ExposureResult,
    OptimizationResult,
    RouteOutcome,
    Confidence
)
from backend.core.classify import classify_trip


def make_dummy_route(route_id: str, duration_min: float, distance_km: float) -> Route:
    geom = [Coordinate(28.60, 77.20), Coordinate(28.61, 77.21)]
    return Route(
        route_id=route_id,
        geometry=geom,
        duration_sec=duration_min * 60.0,
        distance_m=distance_km * 1000.0,
        source="test"
    )


def make_exposure(
    route_id: str,
    exp_val: float,
    avg_pm25: float = 120.0,
    confidence: Confidence = Confidence.HIGH
) -> ExposureResult:
    return ExposureResult(
        route_id=route_id,
        exposure_index=100.0,
        estimated_integrated_pm25=exp_val,
        average_pm25=avg_pm25,
        confidence=confidence,
        station_count_used=4 if confidence == Confidence.HIGH else 1,
        segment_count=10,
        is_robust=True
    )


def test_case_1_low_baseline_exposure():
    # Clean day: PM2.5 = 40 µg/m³ (< 60)
    r1 = make_dummy_route("R1", 20.0, 5.0)
    e1 = make_exposure("R1", 800.0, avg_pm25=40.0, confidence=Confidence.HIGH)
    opt = OptimizationResult("R1", "R1", ["R1"], 0.0, 0.0, 800.0, 800.0)

    res = classify_trip(opt, e1, {"R1": e1}, [r1], is_robust=True, buffer_min=5.0)
    assert res.outcome == RouteOutcome.LOW
    assert res.reward_eligible is False
    assert res.benefit_eligible is False


def test_case_2_avoidable_safer_route_within_buffer():
    # Elevated PM2.5, feasible safer route with 41% reduction and robust
    r1 = make_dummy_route("R1", 24.0, 7.2)
    r2 = make_dummy_route("R2", 26.0, 7.5)
    e1 = make_exposure("R1", 1000.0, avg_pm25=120.0, confidence=Confidence.HIGH)
    e2 = make_exposure("R2", 590.0, avg_pm25=65.0, confidence=Confidence.HIGH)

    opt = OptimizationResult("R1", "R2", ["R1", "R2"], 0.41, 41.0, 1000.0, 590.0, additional_duration_sec=120.0)
    all_exp = {"R1": e1, "R2": e2}

    res = classify_trip(opt, e1, all_exp, [r1, r2], is_robust=True, buffer_min=5.0)
    assert res.outcome == RouteOutcome.AVOIDABLE
    assert res.reward_eligible is True
    assert res.benefit_eligible is False
    assert res.reason_code == "meaningful_exposure_reduction_within_buffer"


def test_case_3_unavoidable_safer_route_outside_buffer():
    # Elevated baseline, safer route exists (40% lower) but requires +8 min (buffer is 5)
    r1 = make_dummy_route("R1", 24.0, 7.2)
    r3 = make_dummy_route("R3", 32.0, 8.5)
    e1 = make_exposure("R1", 1000.0, avg_pm25=120.0, confidence=Confidence.HIGH)
    e3 = make_exposure("R3", 600.0, avg_pm25=60.0, confidence=Confidence.HIGH)

    opt = OptimizationResult("R1", "R1", ["R1"], 0.0, 0.0, 1000.0, 1000.0)
    all_exp = {"R1": e1, "R3": e3}

    res = classify_trip(opt, e1, all_exp, [r1, r3], is_robust=True, buffer_min=5.0)
    assert res.outcome == RouteOutcome.UNAVOIDABLE
    assert res.benefit_eligible is True
    assert res.reward_eligible is False
    assert res.better_outside_buffer is True
    assert res.extra_minutes_needed == 8.0
    assert res.outside_buffer_reduction_percent == 40.0


def test_case_4_unavoidable_feasible_reduction_below_threshold():
    # Feasible alternative has only 5% reduction (<15% threshold)
    r1 = make_dummy_route("R1", 20.0, 5.0)
    r2 = make_dummy_route("R2", 22.0, 5.2)
    e1 = make_exposure("R1", 1000.0, avg_pm25=120.0, confidence=Confidence.HIGH)
    e2 = make_exposure("R2", 950.0, avg_pm25=115.0, confidence=Confidence.HIGH)

    opt = OptimizationResult("R1", "R2", ["R1", "R2"], 0.05, 5.0, 1000.0, 950.0, additional_duration_sec=120.0)
    all_exp = {"R1": e1, "R2": e2}

    res = classify_trip(opt, e1, all_exp, [r1, r2], is_robust=True, buffer_min=5.0)
    assert res.outcome == RouteOutcome.UNAVOIDABLE
    assert res.benefit_eligible is True


def test_case_5_insufficient_data_when_confidence_low():
    # Low confidence must ALWAYS produce INSUFFICIENT_DATA
    r1 = make_dummy_route("R1", 20.0, 5.0)
    r2 = make_dummy_route("R2", 22.0, 5.2)
    e1 = make_exposure("R1", 1000.0, avg_pm25=120.0, confidence=Confidence.LOW)
    e2 = make_exposure("R2", 500.0, avg_pm25=60.0, confidence=Confidence.LOW)

    opt = OptimizationResult("R1", "R2", ["R1", "R2"], 0.50, 50.0, 1000.0, 500.0)
    all_exp = {"R1": e1, "R2": e2}

    res = classify_trip(opt, e1, all_exp, [r1, r2], is_robust=True, buffer_min=5.0)
    assert res.outcome == RouteOutcome.INSUFFICIENT_DATA
    assert res.reward_eligible is False
    assert res.benefit_eligible is False
    assert res.reason_code == "insufficient_monitoring_data"


def test_case_6_not_avoidable_when_not_robust():
    # 41% reduction but is_robust is False -> cannot declare AVOIDABLE
    r1 = make_dummy_route("R1", 24.0, 7.2)
    r2 = make_dummy_route("R2", 26.0, 7.5)
    e1 = make_exposure("R1", 1000.0, avg_pm25=120.0, confidence=Confidence.HIGH)
    e2 = make_exposure("R2", 590.0, avg_pm25=65.0, confidence=Confidence.HIGH)

    opt = OptimizationResult("R1", "R2", ["R1", "R2"], 0.41, 41.0, 1000.0, 590.0)
    all_exp = {"R1": e1, "R2": e2}

    res = classify_trip(opt, e1, all_exp, [r1, r2], is_robust=False, buffer_min=5.0)
    assert res.outcome == RouteOutcome.UNAVOIDABLE
    assert res.reward_eligible is False
