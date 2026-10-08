"""
AirShieldAgent Core Implementation (Phase 4).
Wraps AWS Strands Agents SDK and Amazon Bedrock with custom tools and structured outputs.
"""

from __future__ import annotations
import os
import json
import logging
import concurrent.futures
from typing import Dict, Any, Optional

from strands import Agent
from strands.models import BedrockModel

from backend.agent.config import AGENT_CONFIG, AgentSettings
from backend.agent.schemas import AgentRequest, AgentDecision
from backend.agent.prompts import get_system_prompt
from backend.agent.tools import (
    get_routes,
    get_aqi,
    compute_exposure,
    optimize_route,
    get_tool_context,
    set_tool_context,
    ToolContext,
    execute_get_routes,
    execute_get_aqi,
    execute_compute_exposure,
    execute_optimize_route
)
from backend.agent.exceptions import (
    AgentTimeoutError,
    BedrockUnavailableError,
    StructuredOutputError,
    AgentException
)

logger = logging.getLogger("airshield.agent")


class AirShieldAgent:
    """
    AirShieldAgent coordinates deterministic tools via Strands SDK and Bedrock.
    """
    
    def __init__(self, settings: Optional[AgentSettings] = None):
        self.settings = settings or AGENT_CONFIG
        self.tools = [get_routes, get_aqi, compute_exposure, optimize_route]
        
    def _build_strands_agent(self, language: str = "en") -> Agent:
        """Initialize the Strands Agent instance configured with Bedrock."""
        system_prompt = get_system_prompt(language)
        
        bedrock_model = BedrockModel(
            model_id=self.settings.bedrock_model_id,
            region_name=self.settings.bedrock_region,
            temperature=self.settings.agent_temperature,
            max_tokens=self.settings.agent_max_tokens
        )
        
        return Agent(
            model=bedrock_model,
            tools=self.tools,
            system_prompt=system_prompt,
            structured_output_model=AgentDecision
        )

    def _execute_mock_agent(
        self,
        request: AgentRequest,
        ground_truth: Optional[Dict[str, Any]] = None,
        mock_override: Optional[Dict[str, Any]] = None
    ) -> AgentDecision:
        """
        Simulated deterministic agent execution for offline unit and integration tests.
        Calls the actual tools to demonstrate tool orchestration trace.
        """
        # 1. get_routes
        routes_res = execute_get_routes(
            pickup_lat=request.pickup_lat,
            pickup_lng=request.pickup_lng,
            drop_lat=request.drop_lat,
            drop_lng=request.drop_lng
        )
        routes = routes_res.get("routes", [])
        
        # 2. get_aqi
        aqi_res = execute_get_aqi(
            lat=request.pickup_lat,
            lng=request.pickup_lng,
            snapshot_id=request.snapshot_id,
            mode=request.mode
        )
        stations = aqi_res.get("stations", [])
        
        # 3. compute_exposure
        if routes and stations:
            exp_res = execute_compute_exposure(routes, stations)
            results = exp_res.get("results", [])
        else:
            results = []
            
        if mock_override:
            return AgentDecision(**mock_override)

        # 4. optimize_route
        if routes and results:
            opt_res = execute_optimize_route(routes, results, buffer_min=request.buffer_min)
            decision_data = opt_res.get("decision") or {}
        else:
            decision_data = {}

        if not decision_data:
            decision_data = {
                "classification": "INSUFFICIENT_DATA",
                "fastest_route_id": routes[0]["route_id"] if routes else None,
                "selected_route_id": None,
                "reduction_percent": 0.0,
                "additional_time_min": 0.0,
                "confidence": "LOW",
                "robust": True,
                "reward_eligible": False,
                "reward_amount_inr": 0.0
            }
            
        # Generate valid structured decision based on tool outputs
        clf = decision_data.get("classification", "INSUFFICIENT_DATA")
        if clf == "AVOIDABLE":
            red = int(round(decision_data.get("reduction_percent", 0.0)))
            mins = int(round(decision_data.get("additional_time_min", 0.0)))
            rew = int(round(decision_data.get("reward_amount_inr", 3.0)))
            if request.language == "hi":
                exp = f"एक सुरक्षित मार्ग मिला है। इसमें लगभग {mins} मिनट अधिक लगेंगे और अनुमानित प्रदूषण एक्सपोज़र {red}% कम हो सकता है। आपको ₹{rew} का लाभ मिलेगा।"
            else:
                exp = f"Safer route found. It adds {mins} minutes and is estimated to reduce pollution exposure by {red}%. You may earn ₹{rew}."
            return AgentDecision(
                outcome="AVOIDABLE",
                reason_code="SAFER_ROUTE_WITHIN_BUFFER",
                route_id=decision_data.get("selected_route_id"),
                action="TAKE_SAFER_ROUTE",
                explanation=exp,
                reward_eligible=True,
                reward_amount_inr=float(rew),
                data_confidence=decision_data.get("confidence", "HIGH"),
                robust=decision_data.get("robust", True),
                source="AGENT"
            )
        elif clf == "UNAVOIDABLE":
            if request.language == "hi":
                exp = "वर्तमान डिलीवरी समय सीमा के भीतर कोई सुरक्षित मार्ग नहीं मिला। इस नीति के तहत यह एक्सपोज़र अपरिहार्य माना गया है।"
            else:
                exp = "No meaningfully safer route was found within the current delivery-time limit. The exposure is classified as unavoidable under this policy."
            return AgentDecision(
                outcome="UNAVOIDABLE",
                reason_code="NO_SAFER_ROUTE_WITHIN_BUFFER",
                route_id=decision_data.get("fastest_route_id"),
                action="CONTINUE_WITH_BENEFIT",
                explanation=exp,
                reward_eligible=False,
                reward_amount_inr=0.0,
                data_confidence=decision_data.get("confidence", "HIGH"),
                robust=decision_data.get("robust", True),
                source="AGENT"
            )
        elif clf == "LOW":
            if request.language == "hi":
                exp = "इस मार्ग के लिए वायु प्रदूषण का स्तर अपेक्षाकृत कम है। किसी बदलाव की आवश्यकता नहीं है।"
            else:
                exp = "Air conditions are relatively low-risk for this route. No meaningful intervention is recommended."
            return AgentDecision(
                outcome="LOW",
                reason_code="LOW_EXPOSURE",
                route_id=decision_data.get("fastest_route_id"),
                action="CONTINUE_FASTEST",
                explanation=exp,
                reward_eligible=False,
                reward_amount_inr=0.0,
                data_confidence=decision_data.get("confidence", "HIGH"),
                robust=decision_data.get("robust", True),
                source="AGENT"
            )
        else:
            if request.language == "hi":
                exp = "इन मार्गों की तुलना करने के लिए पर्याप्त वायु गुणवत्ता डेटा उपलब्ध नहीं है।"
            else:
                exp = "We don't have enough air-quality data to confidently compare these routes."
            return AgentDecision(
                outcome="INSUFFICIENT_DATA",
                reason_code="INSUFFICIENT_AQI_DATA",
                route_id=decision_data.get("fastest_route_id"),
                action="INSUFFICIENT_DATA",
                explanation=exp,
                reward_eligible=False,
                reward_amount_inr=0.0,
                data_confidence="LOW",
                robust=True,
                source="AGENT"
            )

    def invoke(
        self,
        request: AgentRequest,
        ground_truth: Optional[Dict[str, Any]] = None,
        mock_override: Optional[Dict[str, Any]] = None
    ) -> AgentDecision:
        """
        Invoke the agent with hard timeout and error handling.
        """
        # Check provider
        provider = self.settings.agent_provider
        
        if provider == "mock":
            return self._execute_mock_agent(request, ground_truth, mock_override)
            
        # Full Bedrock Strands invocation with ThreadPoolExecutor timeout
        def _call_bedrock():
            try:
                agent = self._build_strands_agent(language=request.language)
                user_msg = (
                    f"Evaluate delivery route recommendation for pickup ({request.pickup_lat}, {request.pickup_lng}) "
                    f"to drop ({request.drop_lat}, {request.drop_lng}) with time buffer {request.buffer_min} minutes. "
                    f"Use snapshot mode '{request.mode}' (snapshot_id: '{request.snapshot_id}')."
                )
                res = agent(user_msg)
                
                if res.structured_output and isinstance(res.structured_output, AgentDecision):
                    return res.structured_output
                elif res.structured_output and isinstance(res.structured_output, dict):
                    return AgentDecision(**res.structured_output)
                else:
                    raise StructuredOutputError("Agent returned unstructured text instead of AgentDecision")
            except Exception as e:
                err_str = str(e)
                if "AccessDenied" in err_str or "UnrecognizedClientException" in err_str or "ValidationException" in err_str:
                    raise BedrockUnavailableError(f"Bedrock unavailable or access denied: {err_str}")
                raise AgentException(f"Agent execution error: {err_str}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_bedrock)
            try:
                return future.result(timeout=self.settings.agent_timeout_seconds)
            except concurrent.futures.TimeoutError:
                raise AgentTimeoutError(f"Agent exceeded hard timeout of {self.settings.agent_timeout_seconds}s")
