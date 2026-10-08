"""
Comprehensive validator tests for AirShieldAgent (Phase 4).
Tests the full matrix of deterministic validation rules and guardrails.
"""

import pytest
from backend.agent.schemas import AgentDecision
from backend.agent.validator import validate_agent_decision


@pytest.fixture
def ground_truth_avoidable():
    return {
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


@pytest.fixture
def ground_truth_unavoidable():
    return {
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


def test_validator_valid_avoidable(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R2",
        action="TAKE_SAFER_ROUTE",
        explanation="Safer route adds 2 minutes and reduces exposure by 20%. You earn ₹3.",
        reward_eligible=True,
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is True
    assert reason is None


def test_validator_outcome_mismatch(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="LOW",  # Ground truth is AVOIDABLE
        reason_code="LOW_EXPOSURE",
        route_id="R1",
        action="CONTINUE_FASTEST",
        explanation="Air is good.",
        reward_eligible=False,
        reward_amount_inr=0.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is False
    assert "Outcome mismatch" in reason


def test_validator_route_mismatch(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R3",  # Expected R2
        action="TAKE_SAFER_ROUTE",
        explanation="Safer route adds 2 minutes and reduces exposure by 20%.",
        reward_eligible=True,
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is False
    assert "Selected route mismatch" in reason


def test_validator_percentage_mismatch(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R2",
        action="TAKE_SAFER_ROUTE",
        explanation="Safer route adds 2 minutes and reduces exposure by 75%.",  # 75% != 20.3%
        reward_eligible=True,
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is False
    assert "Unsupported percentage" in reason


def test_validator_minutes_mismatch(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R2",
        action="TAKE_SAFER_ROUTE",
        explanation="Safer route adds 15 minutes and reduces exposure by 20%.",  # 15 min != 2.1 min
        reward_eligible=True,
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is False
    assert "Unsupported minutes" in reason


def test_validator_reward_amount_mismatch(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R2",
        action="TAKE_SAFER_ROUTE",
        explanation="Safer route reduces exposure by 20%.",
        reward_eligible=True,
        reward_amount_inr=50.0,  # Expected 3.0
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is False
    assert "Reward amount mismatch" in reason


def test_validator_reward_claimed_when_not_eligible(ground_truth_unavoidable):
    dec = AgentDecision(
        outcome="UNAVOIDABLE",
        reason_code="NO_SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R1",
        action="CONTINUE_WITH_BENEFIT",
        explanation="No safer route within buffer.",
        reward_eligible=True,  # Ground truth is False
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_unavoidable)
    assert is_valid is False
    assert "Reward eligibility mismatch" in reason


def test_validator_confidence_elevation():
    gt = {
        "classification": "INSUFFICIENT_DATA",
        "recommendation": {"reward_eligible": False, "reward_amount_inr": 0},
        "confidence": "LOW",
        "robust": True
    }
    dec = AgentDecision(
        outcome="INSUFFICIENT_DATA",
        reason_code="INSUFFICIENT_AQI_DATA",
        route_id=None,
        action="INSUFFICIENT_DATA",
        explanation="Not enough data.",
        reward_eligible=False,
        reward_amount_inr=0.0,
        data_confidence="HIGH",  # Ground truth is LOW
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, gt)
    assert is_valid is False
    assert "Confidence elevation forbidden" in reason


def test_validator_medical_claim_guardrail(ground_truth_avoidable):
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R2",
        action="TAKE_SAFER_ROUTE",
        explanation="Taking this route is safe for your lungs and prevents respiratory disease.",
        reward_eligible=True,
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_avoidable)
    assert is_valid is False
    assert "Medical guardrail violation" in reason


def test_validator_unavoidable_outside_buffer_route_rejected(ground_truth_unavoidable):
    dec = AgentDecision(
        outcome="UNAVOIDABLE",
        reason_code="NO_SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R3",  # Outside-buffer route must not be recommended as operational route
        action="CONTINUE_WITH_BENEFIT",
        explanation="No safer route within buffer.",
        reward_eligible=False,
        reward_amount_inr=0.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    is_valid, reason = validate_agent_decision(dec, ground_truth_unavoidable)
    assert is_valid is False
    assert "UNAVOIDABLE cannot recommend outside-buffer route" in reason
