"""
Timeout and latency guardrail tests for AirShieldAgent (Phase 4).
"""

import time
from backend.agent.schemas import AgentRequest
from backend.agent.config import AgentSettings
from backend.agent.agent import AirShieldAgent
from backend.agent.runtime import run_agent


def test_agent_timeout_handling(monkeypatch):
    """Verify that a delayed agent execution triggers hard timeout and fallback."""
    def delayed_invoke(self, request, ground_truth=None, mock_override=None):
        time.sleep(0.5)
        return None

    monkeypatch.setattr(AirShieldAgent, "_execute_mock_agent", delayed_invoke)
    
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
    
    # Configure tiny timeout (0.1s)
    settings = AgentSettings(
        agent_provider="mock",
        enable_agent=True,
        agent_timeout_seconds=0.1
    )
    
    start_t = time.time()
    res = run_agent(req, gt, settings=settings)
    elapsed = time.time() - start_t
    
    assert res.status == "fallback"
    assert res.validation.fallback_used is True
    assert res.decision.source == "DETERMINISTIC_FALLBACK"
    assert res.decision.outcome == "AVOIDABLE"
    assert elapsed < 2.0  # Finished rapidly without blocking
