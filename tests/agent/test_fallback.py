"""
Unit tests for deterministic fallback generator (Phase 4).
"""

from backend.agent.fallback import generate_fallback_decision, format_display_number


def test_format_display_number():
    assert format_display_number(2.14, 0) == "2"
    assert format_display_number(41.2, 0) == "41"
    assert format_display_number(2.14, 1) == "2.1"


def test_fallback_avoidable_en():
    gt = {
        "classification": "AVOIDABLE",
        "fastest_route_id": "R1",
        "recommendation": {
            "selected_route_id": "R2",
            "exposure_reduction_percent": 20.3,
            "additional_time_minutes": 2.1,
            "reward_eligible": True,
            "reward_amount_inr": 3.0
        },
        "confidence": "HIGH",
        "robust": True
    }
    dec = generate_fallback_decision(gt, language="en")
    assert dec.outcome == "AVOIDABLE"
    assert dec.route_id == "R2"
    assert dec.action == "TAKE_SAFER_ROUTE"
    assert dec.reason_code == "SAFER_ROUTE_WITHIN_BUFFER"
    assert dec.reward_eligible is True
    assert dec.reward_amount_inr == 3.0
    assert dec.source == "DETERMINISTIC_FALLBACK"
    assert "2 minutes" in dec.explanation
    assert "20%" in dec.explanation
    assert "₹3" in dec.explanation


def test_fallback_avoidable_hi():
    gt = {
        "classification": "AVOIDABLE",
        "fastest_route_id": "R1",
        "recommendation": {
            "selected_route_id": "R2",
            "exposure_reduction_percent": 20.3,
            "additional_time_minutes": 2.1,
            "reward_eligible": True,
            "reward_amount_inr": 3.0
        },
        "confidence": "HIGH",
        "robust": True
    }
    dec = generate_fallback_decision(gt, language="hi")
    assert dec.outcome == "AVOIDABLE"
    assert "सुरक्षित मार्ग" in dec.explanation
    assert "2 मिनट" in dec.explanation
    assert "20%" in dec.explanation
    assert "₹3" in dec.explanation


def test_fallback_unavoidable_en():
    gt = {
        "classification": "UNAVOIDABLE",
        "fastest_route_id": "R1",
        "recommendation": {
            "selected_route_id": "R1",
            "exposure_reduction_percent": 0.0,
            "additional_time_minutes": 0.0,
            "reward_eligible": False,
            "reward_amount_inr": 0.0
        },
        "confidence": "HIGH",
        "robust": True
    }
    dec = generate_fallback_decision(gt, language="en")
    assert dec.outcome == "UNAVOIDABLE"
    assert dec.action == "CONTINUE_WITH_BENEFIT"
    assert dec.reason_code == "NO_SAFER_ROUTE_WITHIN_BUFFER"
    assert "unavoidable" in dec.explanation.lower()


def test_fallback_low_en():
    gt = {
        "classification": "LOW",
        "fastest_route_id": "R1",
        "recommendation": {
            "selected_route_id": "R1",
            "reward_eligible": False,
            "reward_amount_inr": 0.0
        },
        "confidence": "HIGH",
        "robust": True
    }
    dec = generate_fallback_decision(gt, language="en")
    assert dec.outcome == "LOW"
    assert dec.action == "CONTINUE_FASTEST"
    assert dec.reason_code == "LOW_EXPOSURE"


def test_fallback_insufficient_data():
    gt = {
        "classification": "INSUFFICIENT_DATA",
        "fastest_route_id": "R1",
        "recommendation": {
            "selected_route_id": "R1",
            "reward_eligible": False,
            "reward_amount_inr": 0.0
        },
        "confidence": "LOW",
        "robust": True
    }
    dec = generate_fallback_decision(gt, language="en")
    assert dec.outcome == "INSUFFICIENT_DATA"
    assert dec.action == "INSUFFICIENT_DATA"
    assert dec.data_confidence == "LOW"
