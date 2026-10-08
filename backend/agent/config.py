"""
Configuration for AirShieldAgent (Phase 4).
"""

from __future__ import annotations
import os
from pydantic import BaseModel, Field


class AgentSettings(BaseModel):
    """Configuration settings for AirShield Agent."""
    
    bedrock_model_id: str = Field(
        default_factory=lambda: os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
    )
    bedrock_region: str = Field(
        default_factory=lambda: os.environ.get("BEDROCK_REGION", os.environ.get("AWS_REGION", "ap-south-1"))
    )
    agent_timeout_seconds: float = Field(
        default_factory=lambda: float(os.environ.get("AGENT_TIMEOUT_SECONDS", "8.0"))
    )
    agent_max_tokens: int = Field(
        default_factory=lambda: int(os.environ.get("AGENT_MAX_OUTPUT_TOKENS", "300"))
    )
    agent_max_tool_calls: int = Field(
        default_factory=lambda: int(os.environ.get("AGENT_MAX_TOOL_CALLS", "6"))
    )
    agent_temperature: float = Field(
        default_factory=lambda: float(os.environ.get("AGENT_TEMPERATURE", "0.0"))
    )
    agent_mode: str = Field(
        default_factory=lambda: os.environ.get("AGENT_MODE", "full")  # "full" or "explain"
    )
    enable_agent: bool = Field(
        default_factory=lambda: os.environ.get("ENABLE_AGENT", "true").lower() in ("true", "1", "yes")
    )
    agent_provider: str = Field(
        default_factory=lambda: os.environ.get("AGENT_PROVIDER", "bedrock")  # "bedrock" or "mock"
    )
    agent_debug: bool = Field(
        default_factory=lambda: os.environ.get("AGENT_DEBUG", "false").lower() in ("true", "1", "yes")
    )


AGENT_CONFIG = AgentSettings()
