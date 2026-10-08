"""
Exceptions for AirShieldAgent (Phase 4).
"""

from __future__ import annotations


class AgentException(Exception):
    """Base exception for AirShield agent errors."""
    def __init__(self, message: str, code: str = "AGENT_EXCEPTION"):
        super().__init__(message)
        self.code = code
        self.message = message


class AgentTimeoutError(AgentException):
    """Raised when the agent exceeds the configured execution timeout."""
    def __init__(self, message: str = "Agent execution timed out"):
        super().__init__(message, code="BEDROCK_TIMEOUT")


class BedrockUnavailableError(AgentException):
    """Raised when Bedrock service is unavailable or access is denied."""
    def __init__(self, message: str = "Bedrock service is unavailable"):
        super().__init__(message, code="BEDROCK_UNAVAILABLE")


class StructuredOutputError(AgentException):
    """Raised when structured output generation or parsing fails."""
    def __init__(self, message: str = "Failed to produce structured output"):
        super().__init__(message, code="STRUCTURED_OUTPUT_ERROR")


class ValidationError(AgentException):
    """Raised when agent decision fails strict deterministic validation."""
    def __init__(self, message: str, reason: str = "VALIDATION_FAILED"):
        super().__init__(message, code=reason)


class ToolExecutionError(AgentException):
    """Raised when an internal agent tool fails execution."""
    def __init__(self, message: str):
        super().__init__(message, code="TOOL_ERROR")


class AgentLoopLimitError(AgentException):
    """Raised when the agent exceeds maximum tool call iterations."""
    def __init__(self, message: str = "Agent exceeded maximum tool call iterations"):
        super().__init__(message, code="AGENT_LOOP_LIMIT")
