"""
Unit tests for Scenario Discovery (Phase 2).
Covers all 20 required acceptance criteria from Section 31:
1. Random seed produces deterministic candidate points.
2. Invalid candidate coordinates are rejected.
3. Distance filter works.
4. Duplicate route alternatives do not create false scenarios.
5. A valid Scenario A fixture is detected.
6. A valid Scenario B fixture is detected.
7. Scenario A rejects <15% reduction.
8. Scenario A rejects alternatives outside the buffer.
9. Scenario B rejects low-exposure trips.
10. Scenario B rejects safer alternatives inside the buffer.
11. Scenario B requires confidence != LOW.
12. Scenario B records best route outside the buffer.
13. Ranking prefers larger reduction with similar time.
14. Ranking prefers smaller time cost when reductions are similar.
15. Snapshot replay is deterministic.
16. No Scenario A causes a clear failure rather than fabricated output.
17. No Scenario B causes a clear failure rather than fabricated output.
18. Cached route is reused.
19. Same candidate pair does not trigger duplicate routing requests.
20. Buffer sweep does not mutate production configuration.
"""

from datetime import datetime, timezone
import json
import pytest
from pathlib import Path
from backend.core.models import (
    Coordinate,
    Route,
    AQIStation,
    ExposureResult,
    OptimizationResult,
    ClassificationResult,
    RouteOutcome,
    Confidence
)
from backend.core.config import DEFAULT_CONFIG, Config
from data.find_scenarios import (
    generate_candidate_pairs,
    synthesize_candidate_routes_snapshot,
    evaluate_candidate_pair,
    score_scenario_a,
    score_scenario_b,
    find_scenarios,
    replay_scenario,
    get_cache_key,
    get_cached_routes,
    save_cached_routes,
    CACHE_DIR
)
from data.validate_scenarios import validate_scenarios


@pytest.fixture
def mock_stations() -> list[AQIStation]:
    t = datetime(2026, 10, 8, 11, 30, tzinfo=timezone.utc)
    return [
        AQIStation("ST_CENTRAL", 28.6300, 77.2200, 180.0, t, "mock"),
        AQIStation("ST_RIDGE", 28.5800, 77.1650, 65.0, t, "mock"),
        AQIStation("ST_SOUTH", 28.5400, 77.1500, 70.0, t, "mock")
    ]


# ====================================================================
# TEST 1: Random seed produces deterministic candidate points
# ====================================================================
def test_1_deterministic_candidate_points():
    pairs1 = generate_candidate_pairs(sample_count=20, random_seed=42)
    pairs2 = generate_candidate_pairs(sample_count=20, random_seed=42)
    assert len(pairs1) == 20
    assert len(pairs2) == 20
    for (p1_a, p2_a, n1_a, n2_a), (p1_b, p2_b, n1_b, n2_b) in zip(pairs1, pairs2):
        assert p1_a == p1_b
        assert p2_a == p2_b
        assert n1_a == n1_b
        assert n2_a == n2_b


# ====================================================================
# TEST 2: Invalid candidate coordinates are rejected
# ====================================================================
def test_2_invalid_coordinates_rejected(mock_stations):
    # Pickup equals Drop -> zero distance
    same_coord = Coordinate(28.6300, 77.2200)
    res = evaluate_candidate_pair(same_coord, same_coord, mock_stations)
    assert res["status"] == "rejected"
    assert res["reason"] == "zero_distance"


# ====================================================================
# TEST 3: Distance filter works
# ====================================================================
def test_3_distance_filter():
    pairs = generate_candidate_pairs(sample_count=30, min_dist_km=4.0, max_dist_km=8.0, random_seed=123)
    from backend.core.routes import haversine_distance
    for p1, p2, _, _ in pairs:
        dist_km = haversine_distance(p1, p2) / 1000.0
        assert 4.0 <= dist_km <= 8.0


# ====================================================================
# TEST 4: Duplicate route alternatives do not create false scenarios
# ====================================================================
def test_4_duplicate_routes_deduplicated():
    p = Coordinate(28.6300, 77.2200)
    d = Coordinate(28.5800, 77.1650)
    routes = synthesize_candidate_routes_snapshot(p, d)
    # routes includes R4_DUPLICATE_R1 which has >95% overlap with R1
    from backend.core.routes import deduplicate_routes
    unique = deduplicate_routes(routes)
    route_ids = [r.route_id for r in unique]
    assert "R4_DUPLICATE_R1" not in route_ids
    assert len(unique) < len(routes)


# ====================================================================
# TEST 5: Valid Scenario A fixture is detected
# ====================================================================
def test_5_valid_scenario_a_detected():
    p = Coordinate(28.5474, 77.1959)
    d = Coordinate(28.6515, 77.1911)
    t = datetime(2026, 10, 8, 11, 30, tzinfo=timezone.utc)
    stations = [
        AQIStation("ST_CENTRAL", 28.6300, 77.2200, 185.0, t, "fixture"),
        AQIStation("ST_RIDGE", 28.5800, 77.1650, 65.0, t, "fixture")
    ]
    eval_res = evaluate_candidate_pair(p, d, stations, buffer_min=5.0)
    assert eval_res["status"] == "valid"
    assert eval_res["classification"].outcome == RouteOutcome.AVOIDABLE
    assert eval_res["optimization"].reduction_percent >= 15.0
    assert eval_res["optimization"].additional_duration_min <= 5.0
    assert eval_res["quality_a"] > 0


# ====================================================================
# TEST 6: Valid Scenario B fixture is detected
# ====================================================================
def test_6_valid_scenario_b_detected():
    p = Coordinate(28.6508, 77.1899)
    d = Coordinate(28.5688, 77.2424)
    t = datetime(2026, 10, 8, 11, 30, tzinfo=timezone.utc)
    stations = [
        AQIStation("ST_CENTRAL", 28.6300, 77.2200, 185.0, t, "fixture"),
        AQIStation("ST_RIDGE", 28.5800, 77.1650, 65.0, t, "fixture")
    ]
    eval_res = evaluate_candidate_pair(p, d, stations, buffer_min=5.0)
    assert eval_res["status"] == "valid"
    assert eval_res["classification"].outcome == RouteOutcome.UNAVOIDABLE
    assert eval_res["classification"].better_outside_buffer is True
    assert eval_res["classification"].extra_minutes_needed > 5.0
    assert eval_res["quality_b"] > 0


# ====================================================================
# TEST 7: Scenario A rejects <15% reduction
# ====================================================================
def test_7_scenario_a_rejects_low_reduction():
    opt = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.10,  # 10% < 15% threshold
        reduction_percent=10.0,
        fastest_exposure=100.0,
        selected_exposure=90.0,
        additional_duration_sec=100.0
    )
    clf = ClassificationResult(
        outcome=RouteOutcome.UNAVOIDABLE,
        reason_code="no_cleaner_route_available",
        optimization=opt,
        confidence=Confidence.HIGH,
        better_outside_buffer=False,
        extra_minutes_needed=0.0,
        outside_buffer_reduction_percent=0.0,
        reward_eligible=False,
        benefit_eligible=True,
        metadata={}
    )
    routes = [Route("R1", [Coordinate(28.6, 77.2), Coordinate(28.5, 77.2)], 1000.0, 5000.0, source="test")]
    score = score_scenario_a(opt, clf, routes, {})
    assert score == -1.0


# ====================================================================
# TEST 8: Scenario A rejects alternatives outside the buffer
# ====================================================================
def test_8_scenario_a_rejects_outside_buffer():
    # If the only safer route is at +7 min (outside 5 min buffer), optimizer selects fastest (R1)
    opt = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R1",
        feasible_route_ids=["R1"],
        reduction_fraction=0.0,
        reduction_percent=0.0,
        fastest_exposure=100.0,
        selected_exposure=100.0,
        additional_duration_sec=0.0
    )
    clf = ClassificationResult(
        outcome=RouteOutcome.UNAVOIDABLE,
        reason_code="alternative_exceeds_buffer",
        optimization=opt,
        confidence=Confidence.HIGH,
        better_outside_buffer=True,
        extra_minutes_needed=7.0,
        outside_buffer_reduction_percent=35.0,
        reward_eligible=False,
        benefit_eligible=True,
        metadata={}
    )
    score = score_scenario_a(opt, clf, [], {})
    assert score == -1.0


# ====================================================================
# TEST 9: Scenario B rejects low-exposure trips
# ====================================================================
def test_9_scenario_b_rejects_low_exposure_trips():
    opt = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R1",
        feasible_route_ids=["R1"],
        reduction_fraction=0.0,
        reduction_percent=0.0,
        fastest_exposure=40.0,  # low baseline
        selected_exposure=40.0,
        additional_duration_sec=0.0
    )
    clf = ClassificationResult(
        outcome=RouteOutcome.LOW,  # Classified as LOW
        reason_code="ambient_air_acceptable",
        optimization=opt,
        confidence=Confidence.HIGH,
        better_outside_buffer=False,
        extra_minutes_needed=0.0,
        outside_buffer_reduction_percent=0.0,
        reward_eligible=False,
        benefit_eligible=False,
        metadata={}
    )
    score = score_scenario_b(opt, clf, [], {})
    assert score == -1.0


# ====================================================================
# TEST 10: Scenario B rejects safer alternatives inside the buffer
# ====================================================================
def test_10_scenario_b_rejects_inside_buffer_alternatives():
    # If cleaner alternative is inside buffer -> it is AVOIDABLE, not UNAVOIDABLE
    opt = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.40,
        reduction_percent=40.0,
        fastest_exposure=100.0,
        selected_exposure=60.0,
        additional_duration_sec=120.0
    )
    clf = ClassificationResult(
        outcome=RouteOutcome.AVOIDABLE,
        reason_code="safer_alternative_available",
        optimization=opt,
        confidence=Confidence.HIGH,
        better_outside_buffer=False,
        extra_minutes_needed=0.0,
        outside_buffer_reduction_percent=0.0,
        reward_eligible=True,
        benefit_eligible=False,
        metadata={}
    )
    score = score_scenario_b(opt, clf, [], {})
    assert score == -1.0


# ====================================================================
# TEST 11: Scenario B requires confidence != LOW
# ====================================================================
def test_11_scenario_b_rejects_low_confidence():
    opt = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R1",
        feasible_route_ids=["R1"],
        reduction_fraction=0.0,
        reduction_percent=0.0,
        fastest_exposure=100.0,
        selected_exposure=100.0,
        additional_duration_sec=0.0
    )
    clf = ClassificationResult(
        outcome=RouteOutcome.INSUFFICIENT_DATA,
        reason_code="insufficient_monitoring_data",
        optimization=opt,
        confidence=Confidence.LOW,
        better_outside_buffer=True,
        extra_minutes_needed=7.0,
        outside_buffer_reduction_percent=30.0,
        reward_eligible=False,
        benefit_eligible=False,
        metadata={}
    )
    score = score_scenario_b(opt, clf, [], {})
    assert score == -1.0


# ====================================================================
# TEST 12: Scenario B records best route outside the buffer
# ====================================================================
def test_12_scenario_b_records_outside_route(mock_stations):
    p = Coordinate(28.6508, 77.1899)
    d = Coordinate(28.5688, 77.2424)
    eval_res = evaluate_candidate_pair(p, d, mock_stations, buffer_min=5.0)
    clf = eval_res["classification"]
    assert clf.better_outside_buffer is True
    assert clf.extra_minutes_needed > 5.0
    assert clf.outside_buffer_reduction_percent >= 15.0


# ====================================================================
# TEST 13: Ranking prefers larger reduction with similar time
# ====================================================================
def test_13_ranking_prefers_larger_reduction():
    opt1 = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.40,  # 40% reduction
        reduction_percent=40.0,
        fastest_exposure=100.0,
        selected_exposure=60.0,
        additional_duration_sec=120.0
    )
    clf1 = ClassificationResult(RouteOutcome.AVOIDABLE, "safer", opt1, Confidence.HIGH, False, 0.0, 0.0, True, False, {})

    opt2 = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.20,  # 20% reduction
        reduction_percent=20.0,
        fastest_exposure=100.0,
        selected_exposure=80.0,
        additional_duration_sec=120.0
    )
    clf2 = ClassificationResult(RouteOutcome.AVOIDABLE, "safer", opt2, Confidence.HIGH, False, 0.0, 0.0, True, False, {})

    score1 = score_scenario_a(opt1, clf1, [], {})
    score2 = score_scenario_a(opt2, clf2, [], {})
    assert score1 > score2


# ====================================================================
# TEST 14: Ranking prefers smaller time cost when reductions are similar
# ====================================================================
def test_14_ranking_prefers_smaller_time_cost():
    opt_fast = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.30,
        reduction_percent=30.0,
        fastest_exposure=100.0,
        selected_exposure=70.0,
        additional_duration_sec=60.0   # +1.0 min
    )
    clf_fast = ClassificationResult(RouteOutcome.AVOIDABLE, "safer", opt_fast, Confidence.HIGH, False, 0.0, 0.0, True, False, {})

    opt_slow = OptimizationResult(
        fastest_route_id="R1",
        selected_route_id="R2",
        feasible_route_ids=["R1", "R2"],
        reduction_fraction=0.30,
        reduction_percent=30.0,
        fastest_exposure=100.0,
        selected_exposure=70.0,
        additional_duration_sec=240.0  # +4.0 min
    )
    clf_slow = ClassificationResult(RouteOutcome.AVOIDABLE, "safer", opt_slow, Confidence.HIGH, False, 0.0, 0.0, True, False, {})

    score_fast = score_scenario_a(opt_fast, clf_fast, [], {})
    score_slow = score_scenario_a(opt_slow, clf_slow, [], {})
    assert score_fast > score_slow


# ====================================================================
# TEST 15: Snapshot replay is deterministic
# ====================================================================
def test_15_replay_is_deterministic(tmp_path):
    res = find_scenarios(mode="snapshot", sample_count=50, random_seed=42)
    from data.find_scenarios import save_scenarios_json
    test_json = tmp_path / "test_scenarios.json"
    save_scenarios_json(test_json, res)

    assert replay_scenario("A001", test_json) is True
    assert replay_scenario("B001", test_json) is True


# ====================================================================
# TEST 16: No Scenario A causes a clear failure rather than fabricated output
# ====================================================================
def test_16_no_scenario_a_fails_clearly():
    # If reduction threshold is impossible (e.g. 99% reduction), best_scenario_a must be None
    res = find_scenarios(
        mode="snapshot",
        sample_count=10,
        random_seed=42,
        config_dict={"reduction_threshold": 0.99, "max_detour_ratio": 2.5}
    )
    assert res["best_scenario_a"] is None


# ====================================================================
# TEST 17: No Scenario B causes a clear failure rather than fabricated output
# ====================================================================
def test_17_no_scenario_b_fails_clearly():
    # If reduction threshold is impossible (99%), no route outside buffer can satisfy it
    res = find_scenarios(
        mode="snapshot",
        sample_count=10,
        random_seed=42,
        config_dict={"reduction_threshold": 0.99, "max_detour_ratio": 2.5}
    )
    assert res["best_scenario_b"] is None


# ====================================================================
# TEST 18: Cached route is reused
# ====================================================================
def test_18_cache_reuse():
    p = Coordinate(28.6000, 77.2000)
    d = Coordinate(28.5500, 77.1800)
    key = get_cache_key(p, d)

    mock_routes = [
        Route("MOCK_1", [p, d], duration_sec=500.0, distance_m=3000.0, source="cache_test")
    ]
    save_cached_routes(key, mock_routes)

    cached = get_cached_routes(key)
    assert cached is not None
    assert len(cached) == 1
    assert cached[0].route_id == "MOCK_1"
    assert cached[0].duration_sec == 500.0


# ====================================================================
# TEST 19: Same candidate pair does not trigger duplicate routing requests
# ====================================================================
def test_19_no_duplicate_routing_requests(mock_stations):
    p = Coordinate(28.6100, 77.2100)
    d = Coordinate(28.5600, 77.1700)
    key = get_cache_key(p, d)

    # First evaluation writes cache
    res1 = evaluate_candidate_pair(p, d, mock_stations)
    assert res1["status"] == "valid"
    cache_file = CACHE_DIR / f"{key}.json"
    assert cache_file.exists()

    # Second evaluation reads from cache
    res2 = evaluate_candidate_pair(p, d, mock_stations)
    assert res2["status"] == "valid"
    assert res1["optimization"].selected_route_id == res2["optimization"].selected_route_id


# ====================================================================
# TEST 20: Buffer sweep does not mutate production configuration
# ====================================================================
def test_20_buffer_sweep_does_not_mutate_config():
    initial_buffer = DEFAULT_CONFIG.DEFAULT_BUFFER_MIN
    discovery_res = {"random_seed": 42}
    from data.find_scenarios import run_buffer_sweep
    run_buffer_sweep(discovery_res)
    assert DEFAULT_CONFIG.DEFAULT_BUFFER_MIN == initial_buffer
