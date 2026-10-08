"""
End-to-End consistency tests comparing deterministic engine and agent orchestration (Phase 4).
"""

import pytest
from unittest.mock import MagicMock
from backend.core.models import Coordinate
from backend.service.agent_orchestrator import AgentOrchestrator
from backend.agent.config import AgentSettings
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository


@pytest.fixture
def agent_orchestrator():
    settings = AgentSettings(agent_provider="mock", enable_agent=True, agent_debug=True)
    mock_db = MagicMock(spec=DynamoDBRepository)
    mock_s3 = MagicMock(spec=S3Repository)
    return AgentOrchestrator(
        dynamodb_repo=mock_db,
        s3_repo=mock_s3,
        settings=settings
    )


def test_consistency_scenario_a_avoidable(agent_orchestrator):
    """Verify Scenario A yields consistent AVOIDABLE decision."""
    params = {
        "pickup": Coordinate(lat=28.5474, lng=77.1959),
        "drop": Coordinate(lat=28.6515, lng=77.1911),
        "buffer_min": 5.0,
        "mode": "snapshot",
        "snapshot_id": "demo_v1",
        "worker_id": "test-worker-001"
    }
    res = agent_orchestrator.recommend(params)
    
    assert res["classification"] == "AVOIDABLE"
    assert res["recommendation"]["reward_eligible"] is True
    assert res["recommendation"]["reward_amount_inr"] == 3
    assert res["recommendation"]["exposure_reduction_percent"] >= 15.0
    
    assert "agent" in res
    assert res["agent"]["validation_passed"] is True
    assert res["agent"]["reason_code"] == "SAFER_ROUTE_WITHIN_BUFFER"
    assert res["agent"]["action"] == "TAKE_SAFER_ROUTE"
    assert "tool_trace" in res["agent"]
    assert len(res["agent"]["tool_trace"]) >= 4


def test_consistency_scenario_b_unavoidable(agent_orchestrator):
    """Verify Scenario B yields consistent UNAVOIDABLE decision."""
    params = {
        "pickup": Coordinate(lat=28.6508, lng=77.1899),
        "drop": Coordinate(lat=28.5688, lng=77.2424),
        "buffer_min": 5.0,
        "mode": "snapshot",
        "snapshot_id": "demo_v1",
        "worker_id": "test-worker-002"
    }
    res = agent_orchestrator.recommend(params)
    
    assert res["classification"] == "UNAVOIDABLE"
    assert res["recommendation"]["reward_eligible"] is False
    assert res["benefit"]["eligible"] is True
    
    assert "agent" in res
    assert res["agent"]["validation_passed"] is True
    assert res["agent"]["reason_code"] == "NO_SAFER_ROUTE_WITHIN_BUFFER"
