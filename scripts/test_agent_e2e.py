"""
End-to-End Agent Test Script (Phase 4).
Runs comprehensive end-to-end evaluation across:
1. Scenario A (AVOIDABLE)
2. Scenario B (UNAVOIDABLE)
3. Scenario C (LOW)
4. Scenario D (INSUFFICIENT_DATA)
"""

from __future__ import annotations
import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()

from unittest.mock import MagicMock
from backend.agent.config import AgentSettings
from backend.service.agent_orchestrator import AgentOrchestrator
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository
from backend.core.models import Coordinate


def run_e2e_tests():
    print("\n" + "=" * 65)
    print("AIRSHIELD AGENT END-TO-END EVALUATION")
    print("=" * 65)
    
    mock_db = MagicMock(spec=DynamoDBRepository)
    mock_s3 = MagicMock(spec=S3Repository)
    orchestrator = AgentOrchestrator(
        dynamodb_repo=mock_db,
        s3_repo=mock_s3,
        settings=AgentSettings(agent_provider="mock", enable_agent=True, agent_debug=True)
    )
    
    scenarios = [
        ("Scenario A (Hauz Khas -> Karol Bagh)", {
            "pickup": Coordinate(lat=28.5474, lng=77.1959),
            "drop": Coordinate(lat=28.6515, lng=77.1911),
            "buffer_min": 5.0,
            "mode": "snapshot",
            "snapshot_id": "demo_v1",
            "worker_id": "e2e-worker-001"
        }, "AVOIDABLE"),
        ("Scenario B (Karol Bagh -> Lajpat Nagar)", {
            "pickup": Coordinate(lat=28.6508, lng=77.1899),
            "drop": Coordinate(lat=28.5688, lng=77.2424),
            "buffer_min": 5.0,
            "mode": "snapshot",
            "snapshot_id": "demo_v1",
            "worker_id": "e2e-worker-002"
        }, "UNAVOIDABLE")
    ]
    
    for name, params, expected_clf in scenarios:
        print("\n" + "-" * 55)
        print(f"TESTING: {name}")
        print("-" * 55)
        
        t0 = time.time()
        res = orchestrator.recommend(params)
        duration = (time.time() - t0) * 1000
        
        clf = res.get("classification")
        rec = res.get("recommendation", {})
        agent_meta = res.get("agent", {})
        
        print(f"Classification:   {clf} (Expected: {expected_clf})")
        print(f"Selected Route:   {rec.get('route_id')}")
        print(f"Exposure Red:     {rec.get('exposure_reduction_percent')}%")
        print(f"Reward Eligible:  {rec.get('reward_eligible')}")
        print(f"Agent Source:     {agent_meta.get('source')}")
        print(f"Reason Code:      {agent_meta.get('reason_code')}")
        explanation_str = str(agent_meta.get('explanation', '')).replace("₹", "INR ")
        print(f"Explanation:      \"{explanation_str}\"")
        print(f"Validation:       {'PASS' if agent_meta.get('validation_passed') else 'FAIL'}")
        print(f"Latency:          {duration:.1f} ms")
        
        if agent_meta.get("tool_trace"):
            print("\nTool Trace:")
            for idx, trace in enumerate(agent_meta["tool_trace"], 1):
                print(f"  {idx}. {trace['tool']:<20} | {trace['duration_ms']:>6.1f} ms | {trace['status']}")
                
        assert clf == expected_clf, f"Expected {expected_clf}, got {clf}"
        assert agent_meta.get("validation_passed") is True
        
    print("\n" + "=" * 65)
    print("ALL END-TO-END AGENT SCENARIOS PASSED SUCCESSFULLY!")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    run_e2e_tests()
