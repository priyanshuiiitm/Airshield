def validate_agent_response(agent_output: dict, engine_data: dict) -> bool:
    """
    Ensures the LLM did not hallucinate numbers or classifications.
    If this returns False, the system falls back to the deterministic template.
    """
    try:
        # Check classification match
        if agent_output.get("classification") != engine_data.get("classification"):
            return False
            
        # Check numbers match (LLMs often hallucinate digits)
        if agent_output.get("exposure_reduction_pct") != engine_data.get("exposure_reduction_pct"):
            return False
            
        if agent_output.get("additional_time_min") != engine_data.get("additional_time_min"):
            return False
            
        return True
    except Exception:
        return False
