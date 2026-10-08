"""
AirShield Agent Orchestration Service (Phase 4).
Bridges the Lambda handler, deterministic ground-truth engine, and AirShieldAgent runtime.
"""

from __future__ import annotations
import logging
from typing import Dict, Any, Optional

from backend.service.orchestrator import DeterministicOrchestrator, BaseOrchestrator
from backend.agent.schemas import AgentRequest, AgentResponse
from backend.agent.runtime import run_agent
from backend.agent.config import AGENT_CONFIG, AgentSettings
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository

logger = logging.getLogger("airshield.service.agent_orchestrator")


class AgentOrchestrator(BaseOrchestrator):
    """
    Coordinates deterministic ground truth computation with AirShieldAgent
    explanation and tool orchestration.
    """

    def __init__(
        self,
        dynamodb_repo: Optional[DynamoDBRepository] = None,
        s3_repo: Optional[S3Repository] = None,
        settings: Optional[AgentSettings] = None
    ):
        self.deterministic_engine = DeterministicOrchestrator(
            dynamodb_repo=dynamodb_repo,
            s3_repo=s3_repo
        )
        self.settings = settings or AGENT_CONFIG

    def recommend(
        self,
        params: Dict[str, Any],
        mock_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        1. Executes deterministic ground-truth calculation and trip persistence.
        2. Executes AirShieldAgent runtime with strict validation.
        3. Enriches response with agent explanation, telemetry, and reason codes.
        """
        # Step 1: Calculate ground truth deterministically
        ground_truth_res = self.deterministic_engine.recommend(params)
        
        # Step 2: Build AgentRequest
        pickup = params["pickup"]
        drop = params["drop"]
        pickup_lat = pickup.lat if hasattr(pickup, "lat") else pickup["lat"]
        pickup_lng = pickup.lng if hasattr(pickup, "lng") else pickup["lng"]
        drop_lat = drop.lat if hasattr(drop, "lat") else drop["lat"]
        drop_lng = drop.lng if hasattr(drop, "lng") else drop["lng"]
        
        agent_req = AgentRequest(
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            drop_lat=drop_lat,
            drop_lng=drop_lng,
            buffer_min=params.get("buffer_min", 5.0),
            language=params.get("language", "en"),
            mode=params.get("mode", "snapshot"),
            snapshot_id=params.get("snapshot_id", "demo_v1"),
            worker_id=params.get("worker_id", "demo-worker")
        )
        
        # Step 3: Run Agent Runtime
        agent_res: AgentResponse = run_agent(
            request=agent_req,
            ground_truth=ground_truth_res,
            settings=self.settings,
            mock_override=mock_override
        )
        
        # Step 4: Enrich Response with Agent Metadata
        ground_truth_res["message"] = agent_res.decision.explanation
        
        agent_payload = {
            "enabled": self.settings.enable_agent,
            "source": agent_res.decision.source,
            "reason_code": agent_res.decision.reason_code,
            "action": agent_res.decision.action,
            "explanation": agent_res.decision.explanation,
            "validation_passed": agent_res.validation.valid,
            "fallback_used": agent_res.validation.fallback_used,
            "fallback_reason": agent_res.validation.failure_reason
        }
        
        if self.settings.agent_debug or params.get("debug", False):
            agent_payload["tool_trace"] = [t.model_dump() for t in agent_res.tool_trace]
            agent_payload["model_id"] = self.settings.bedrock_model_id
            
        ground_truth_res["agent"] = agent_payload
        
        return ground_truth_res
