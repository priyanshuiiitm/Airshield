"""
Unit tests for agent Pydantic schemas (Phase 4).
"""

import pytest
from pydantic import ValidationError as PydanticValidationError
from backend.agent.schemas import AgentRequest, AgentDecision, ToolTraceItem


def test_agent_request_valid():
    req = AgentRequest(
        pickup_lat=28.5474,
        pickup_lng=77.1959,
        drop_lat=28.6515,
        drop_lng=77.1911,
        buffer_min=5.0,
        language="en"
    )
    assert req.pickup_lat == 28.5474
    assert req.language == "en"


def test_agent_request_invalid_coords():
    with pytest.raises(PydanticValidationError):
        AgentRequest(
            pickup_lat=120.0,  # Invalid latitude > 90
            pickup_lng=77.0,
            drop_lat=28.0,
            drop_lng=77.0
        )


def test_agent_decision_valid():
    dec = AgentDecision(
        outcome="AVOIDABLE",
        reason_code="SAFER_ROUTE_WITHIN_BUFFER",
        route_id="R2",
        action="TAKE_SAFER_ROUTE",
        explanation="Safer route reduces exposure by 20%.",
        reward_eligible=True,
        reward_amount_inr=3.0,
        data_confidence="HIGH",
        robust=True,
        source="AGENT"
    )
    assert dec.outcome == "AVOIDABLE"
    assert dec.reward_amount_inr == 3.0


def test_agent_decision_invalid_outcome():
    with pytest.raises(PydanticValidationError):
        AgentDecision(
            outcome="MODERATELY_AVOIDABLE",  # Invalid outcome literal
            reason_code="SAFER_ROUTE_WITHIN_BUFFER",
            route_id="R2",
            action="TAKE_SAFER_ROUTE",
            explanation="Invalid",
            reward_eligible=True,
            reward_amount_inr=3.0,
            data_confidence="HIGH",
            robust=True,
            source="AGENT"
        )


def test_agent_decision_invalid_action():
    with pytest.raises(PydanticValidationError):
        AgentDecision(
            outcome="AVOIDABLE",
            reason_code="SAFER_ROUTE_WITHIN_BUFFER",
            route_id="R2",
            action="INVALID_ACTION_CODE",
            explanation="Invalid",
            reward_eligible=True,
            reward_amount_inr=3.0,
            data_confidence="HIGH",
            robust=True,
            source="AGENT"
        )
