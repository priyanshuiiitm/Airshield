"""
Agent Runtime Module for AirShield (Phase 4).
Single entry point providing execution, validation, fallback handling, and telemetry.
"""

from __future__ import annotations
import logging
from typing import Dict, Any, Optional

from backend.agent.config import AGENT_CONFIG, AgentSettings
from backend.agent.schemas import (
    AgentRequest,
    AgentDecision,
    AgentResponse,
    AgentValidationResult
)
from backend.agent.agent import AirShieldAgent
from backend.agent.tools import ToolContext, set_tool_context, get_tool_context
from backend.agent.validator import validate_agent_decision
from backend.agent.fallback import generate_fallback_decision
from backend.agent.exceptions import AgentException

logger = logging.getLogger("airshield.agent.runtime")


def run_agent(
    request: AgentRequest,
    ground_truth: Dict[str, Any],
    settings: Optional[AgentSettings] = None,
    mock_override: Optional[Dict[str, Any]] = None
) -> AgentResponse:
    """
    Execute AirShieldAgent with deterministic ground truth verification and fallback guarantees.
    """
    cfg = settings or AGENT_CONFIG
    ctx = ToolContext()
    set_tool_context(ctx)
    
    # 1. Killswitch check
    if not cfg.enable_agent:
        logger.info("Agent disabled via ENABLE_AGENT=false, using deterministic fallback")
        fallback_decision = generate_fallback_decision(ground_truth, language=request.language)
        return AgentResponse(
            status="fallback",
            decision=fallback_decision,
            validation=AgentValidationResult(
                valid=True,
                fallback_used=True,
                failure_reason="AGENT_DISABLED"
            ),
            tool_trace=ctx.trace
        )
        
    try:
        agent = AirShieldAgent(settings=cfg)
        raw_decision = agent.invoke(
            request=request,
            ground_truth=ground_truth,
            mock_override=mock_override
        )
        
        # 2. Strict Deterministic Validation
        is_valid, failure_reason = validate_agent_decision(raw_decision, ground_truth)
        
        if is_valid:
            return AgentResponse(
                status="success",
                decision=raw_decision,
                validation=AgentValidationResult(
                    valid=True,
                    fallback_used=False
                ),
                tool_trace=ctx.trace
            )
        else:
            logger.warning(f"Agent validation failed: {failure_reason}. Activating deterministic fallback.")
            fallback_decision = generate_fallback_decision(ground_truth, language=request.language)
            return AgentResponse(
                status="fallback",
                decision=fallback_decision,
                validation=AgentValidationResult(
                    valid=False,
                    fallback_used=True,
                    failure_reason=failure_reason
                ),
                tool_trace=ctx.trace
            )
            
    except AgentException as e:
        logger.warning(f"Agent exception ({e.code}): {e.message}. Activating deterministic fallback.")
        fallback_decision = generate_fallback_decision(ground_truth, language=request.language)
        return AgentResponse(
            status="fallback",
            decision=fallback_decision,
            validation=AgentValidationResult(
                valid=False,
                fallback_used=True,
                failure_reason=e.code
            ),
            tool_trace=ctx.trace
        )
    except Exception as e:
        logger.error(f"Unexpected agent runtime error: {e}. Activating deterministic fallback.")
        fallback_decision = generate_fallback_decision(ground_truth, language=request.language)
        return AgentResponse(
            status="fallback",
            decision=fallback_decision,
            validation=AgentValidationResult(
                valid=False,
                fallback_used=True,
                failure_reason="AGENT_EXCEPTION"
            ),
            tool_trace=ctx.trace
        )
