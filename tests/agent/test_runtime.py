"""
Unit tests for AirShieldAgent runtime execution and fallback orchestration (Phase 4).
"""

from backend.agent.schemas import AgentRequest
from backend.agent.config import AgentSettings
from backend.agent.runtime import run_agent


def test_runtime_success_mock():
    req = AgentRequest(
        pickup_lat=28.5474,
        pickup_lng=77.1959,
        drop_lat=28.6515,
        drop_lng=77.1911,
        buffer_min=5.0,
        language="en"
    )
    gt = {
        "classification": "AVOIDABLE",
        "fastest_route_id": "R1_FAST",
        "recommendation": {
            "selected_route_id": "R2_SAFER",
            "exposure_reduction_percent": 20.3,
            "additional_time_minutes": 2.1,
            "reward_eligible": True,
            "reward_amount_inr": 3.0
        },
        "confidence": "HIGH",
        "robust": True
    }
    settings = AgentSettings(agent_provider="mock", enable_agent=True)
    res = run_agent(req, gt, settings=settings)
    
    assert res.status == "success"
    assert res.validation.valid is True
    assert res.validation.fallback_used is False
    assert res.decision.outcome == "AVOIDABLE"
    assert res.decision.route_id == "R2_SAFER"
    assert len(res.tool_trace) >= 4


def test_runtime_disabled_killswitch():
    req = AgentRequest(
        pickup_lat=28.5474,
        pickup_lng=77.1959,
        drop_lat=28.6515,
        drop_lng=77.1911
    )
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
    settings = AgentSettings(enable_agent=False)
    res = run_agent(req, gt, settings=settings)
    
    assert res.status == "fallback"
    assert res.validation.fallback_used is True
    assert res.validation.failure_reason == "AGENT_DISABLED"
    assert res.decision.source == "DETERMINISTIC_FALLBACK"


def test_runtime_validation_failure_triggers_fallback():
    req = AgentRequest(
        pickup_lat=28.5474,
        pickup_lng=77.1959,
        drop_lat=28.6515,
        drop_lng=77.1911
    )
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
    # Injected invalid mock: claims 85% exposure reduction instead of 20.3%
    invalid_override = {
        "outcome": "AVOIDABLE",
        "reason_code": "SAFER_ROUTE_WITHIN_BUFFER",
        "route_id": "R2",
        "action": "TAKE_SAFER_ROUTE",
        "explanation": "Safer route reduces exposure by 85%.",
        "reward_eligible": True,
        "reward_amount_inr": 3.0,
        "data_confidence": "HIGH",
        "robust": True,
        "source": "AGENT"
    }
    settings = AgentSettings(agent_provider="mock", enable_agent=True)
    res = run_agent(req, gt, settings=settings, mock_override=invalid_override)
    
    assert res.status == "fallback"
    assert res.validation.valid is False
    assert res.validation.fallback_used is True
    assert "Unsupported percentage" in res.validation.failure_reason
    assert res.decision.source == "DETERMINISTIC_FALLBACK"
    assert "20%" in res.decision.explanation  # Fallback uses ground truth 20%
