"""
Strict Pydantic schemas for AirShieldAgent inputs, outputs, and tools (Phase 4).
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Agent Input & Output Models
# ---------------------------------------------------------------------------

class AgentRequest(BaseModel):
    """Input payload to the agent runtime."""
    pickup_lat: float = Field(..., ge=-90.0, le=90.0, description="Pickup latitude")
    pickup_lng: float = Field(..., ge=-180.0, le=180.0, description="Pickup longitude")
    drop_lat: float = Field(..., ge=-90.0, le=90.0, description="Drop latitude")
    drop_lng: float = Field(..., ge=-180.0, le=180.0, description="Drop longitude")
    buffer_min: float = Field(5.0, ge=0.0, le=30.0, description="Delivery time buffer in minutes")
    language: Literal["en", "hi"] = Field("en", description="Explanation language")
    mode: Literal["live", "snapshot"] = Field("snapshot", description="AQI retrieval mode")
    snapshot_id: Optional[str] = Field("demo_v1", description="Identifier for frozen snapshot")
    worker_id: Optional[str] = Field("worker_demo", description="Worker anonymized identifier")


class AgentDecision(BaseModel):
    """Structured decision output produced by AirShieldAgent."""
    
    outcome: Literal[
        "LOW",
        "AVOIDABLE",
        "UNAVOIDABLE",
        "INSUFFICIENT_DATA"
    ] = Field(..., description="Operational decision state")
    
    reason_code: Literal[
        "NO_MEANINGFUL_INTERVENTION",
        "SAFER_ROUTE_WITHIN_BUFFER",
        "NO_SAFER_ROUTE_WITHIN_BUFFER",
        "INSUFFICIENT_AQI_DATA",
        "NO_ALTERNATIVE_ROUTE",
        "LOW_EXPOSURE"
    ] = Field(..., description="Structured justification code")
    
    route_id: Optional[str] = Field(
        None, description="Recommended route identifier, if applicable"
    )
    
    action: Literal[
        "CONTINUE_FASTEST",
        "TAKE_SAFER_ROUTE",
        "CONTINUE_WITH_BENEFIT",
        "INSUFFICIENT_DATA"
    ] = Field(..., description="Worker-facing recommended action")
    
    explanation: str = Field(
        ..., description="Concise, non-medical worker explanation in requested language"
    )
    
    reward_eligible: bool = Field(
        False, description="Whether worker is eligible for simulated micro-reward"
    )
    
    reward_amount_inr: float = Field(
        0.0, ge=0.0, description="Simulated reward amount in INR"
    )
    
    data_confidence: Literal["HIGH", "MEDIUM", "LOW"] = Field(
        "HIGH", description="Confidence level of underlying data"
    )
    
    robust: bool = Field(
        True, description="Whether decision is robust to spatial parameter perturbation"
    )
    
    source: Literal["AGENT", "DETERMINISTIC_FALLBACK"] = Field(
        "AGENT", description="Origin of the decision"
    )


# ---------------------------------------------------------------------------
# Telemetry & Validation Models
# ---------------------------------------------------------------------------

class ToolTraceItem(BaseModel):
    """Telemetry item recording a single tool invocation."""
    tool: str
    start_time: float
    end_time: float
    duration_ms: float
    status: Literal["success", "error", "insufficient_data"]
    error: Optional[str] = None


class AgentValidationResult(BaseModel):
    """Validation report verifying agent output against deterministic truth."""
    valid: bool
    fallback_used: bool
    failure_reason: Optional[str] = None


class AgentResponse(BaseModel):
    """Top-level agent runtime response."""
    status: Literal["success", "fallback"]
    decision: AgentDecision
    validation: AgentValidationResult
    tool_trace: List[ToolTraceItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Custom Tool Schemas
# ---------------------------------------------------------------------------

class RouteItem(BaseModel):
    route_id: str
    duration_sec: float
    distance_m: float
    free_flow_duration_sec: float
    geometry: List[List[float]] = Field(default_factory=list)


class RoutesToolInput(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    travel_mode: str = "Scooter"


class RoutesToolOutput(BaseModel):
    status: Literal["success", "error"]
    routes: List[Dict[str, Any]] = Field(default_factory=list)
    message: Optional[str] = None


class StationItem(BaseModel):
    station_id: str
    lat: float
    lng: float
    pm25: float
    timestamp: str
    source: str = "OpenAQ"


class AqiToolInput(BaseModel):
    lat: float
    lng: float
    snapshot_id: Optional[str] = None
    mode: str = "snapshot"


class AqiToolOutput(BaseModel):
    status: Literal["success", "insufficient_data", "error"]
    stations: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    message: Optional[str] = None


class ExposureToolInput(BaseModel):
    routes: List[Dict[str, Any]]
    stations: List[Dict[str, Any]]
    config_version: str = "v1"


class ExposureToolOutput(BaseModel):
    status: Literal["success", "error"]
    results: List[Dict[str, Any]] = Field(default_factory=list)
    message: Optional[str] = None


class OptimizeToolInput(BaseModel):
    routes: List[Dict[str, Any]]
    exposure_results: List[Dict[str, Any]]
    buffer_min: float = 5.0


class OptimizeToolOutput(BaseModel):
    status: Literal["success", "error"]
    decision: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
