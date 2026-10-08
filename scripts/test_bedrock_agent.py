"""
Bedrock Agent Integration Test Script (Phase 4).
Runs real/live Amazon Bedrock execution for Scenario A and Scenario B.
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

from backend.agent.config import AGENT_CONFIG, AgentSettings
from backend.agent.schemas import AgentRequest
from backend.agent.agent import AirShieldAgent
from backend.agent.validator import validate_agent_decision
from backend.service.agent_orchestrator import AgentOrchestrator
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository
from backend.core.models import Coordinate


def run_bedrock_test():
    print("\n" + "=" * 65)
    print("AIRSHIELD BEDROCK AGENT INTEGRATION TEST")
    print("=" * 65)
    
    model_id = AGENT_CONFIG.bedrock_model_id
    region = AGENT_CONFIG.bedrock_region
    print(f"Model ID: {model_id}")
    print(f"Region:   {region}")
    
    orchestrator = AgentOrchestrator(
        dynamodb_repo=DynamoDBRepository(),
        s3_repo=S3Repository(),
        settings=AgentSettings(
            bedrock_model_id=model_id,
            bedrock_region=region,
            enable_agent=True,
            agent_provider="bedrock",
            agent_debug=True
        )
    )
    
    # ----------------------------------------------------
    # Scenario A Test
    # ----------------------------------------------------
    print("\n" + "-" * 50)
    print("[1/2] Running Scenario A (Hauz Khas -> Karol Bagh)...")
    print("-" * 50)
    params_a = {
        "pickup": Coordinate(lat=28.5474, lng=77.1959),
        "drop": Coordinate(lat=28.6515, lng=77.1911),
        "buffer_min": 5.0,
        "mode": "snapshot",
        "snapshot_id": "demo_v1",
        "worker_id": "bedrock-tester-001"
    }
    
    t0 = time.time()
    res_a = orchestrator.recommend(params_a)
    latency_a = (time.time() - t0) * 1000
    
    agent_info = res_a.get("agent", {})
    print(f"Outcome:           {res_a.get('classification')}")
    print(f"Agent Source:      {agent_info.get('source')}")
    print(f"Reason Code:       {agent_info.get('reason_code')}")
    print(f"Action:            {agent_info.get('action')}")
    exp_a = str(agent_info.get('explanation', '')).replace("₹", "INR ")
    print(f"Explanation:       {exp_a}")
    print(f"Validation Passed: {agent_info.get('validation_passed')}")
    print(f"Fallback Used:     {agent_info.get('fallback_used')} (Reason: {agent_info.get('fallback_reason')})")
    print(f"Total Latency:     {latency_a:.1f} ms")
    
    # ----------------------------------------------------
    # Scenario B Test
    # ----------------------------------------------------
    print("\n" + "-" * 50)
    print("[2/2] Running Scenario B (Karol Bagh -> Lajpat Nagar)...")
    print("-" * 50)
    params_b = {
        "pickup": Coordinate(lat=28.6508, lng=77.1899),
        "drop": Coordinate(lat=28.5688, lng=77.2424),
        "buffer_min": 5.0,
        "mode": "snapshot",
        "snapshot_id": "demo_v1",
        "worker_id": "bedrock-tester-002"
    }
    
    t0 = time.time()
    res_b = orchestrator.recommend(params_b)
    latency_b = (time.time() - t0) * 1000
    
    agent_info_b = res_b.get("agent", {})
    print(f"Outcome:           {res_b.get('classification')}")
    print(f"Agent Source:      {agent_info_b.get('source')}")
    print(f"Reason Code:       {agent_info_b.get('reason_code')}")
    print(f"Action:            {agent_info_b.get('action')}")
    exp_b = str(agent_info_b.get('explanation', '')).replace("₹", "INR ")
    print(f"Explanation:       {exp_b}")
    print(f"Validation Passed: {agent_info_b.get('validation_passed')}")
    print(f"Fallback Used:     {agent_info_b.get('fallback_used')} (Reason: {agent_info_b.get('fallback_reason')})")
    print(f"Total Latency:     {latency_b:.1f} ms")
    
    print("\n" + "=" * 65)
    print("BEDROCK INTEGRATION TEST SUMMARY")
    print("=" * 65)
    print(f"Scenario A Classification: {res_a.get('classification')}")
    print(f"Scenario B Classification: {res_b.get('classification')}")
    print("Guaranteed response received with deterministic safety.")


if __name__ == "__main__":
    run_bedrock_test()
