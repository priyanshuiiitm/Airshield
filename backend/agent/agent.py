import json
from backend.agent.tools import analyze_trip_exposure
from backend.agent.templates import get_fallback_template
from backend.agent.validator import validate_agent_response

# Strands SDK would normally be used here to initialize the agent
# e.g., from strands import Agent, BedrockModel
# agent = Agent(model=BedrockModel("anthropic.claude-3-haiku-20240307-v1:0"), tools=[analyze_trip_exposure])

def run_agent(pickup_lat: float, pickup_lon: float, drop_lat: float, drop_lon: float) -> dict:
    """
    Orchestrates the LLM agent to analyze the trip and format the response.
    If the agent fails or hallucinates, falls back to deterministic templates.
    """
    
    # 1. Deterministic Engine Run (We run the tool manually first to get the ground truth)
    # The agent would normally do this, but we need the ground truth for the validator.
    raw_json = analyze_trip_exposure(pickup_lat, pickup_lon, drop_lat, drop_lon)
    engine_data = json.loads(raw_json)
    
    # 2. Agent Invocation (Mocked for now since Bedrock is unavailable)
    try:
        # response = agent.invoke(f"Analyze this trip: pickup({pickup_lat}, {pickup_lon}), drop({drop_lat}, {drop_lon})")
        # agent_output = json.loads(response.content)
        
        # Simulating an agent timeout or Bedrock failure (since AWS account is locked)
        raise Exception("Bedrock Timeout / Unavailable")
        
    except Exception as e:
        print(f"[Agent] Warning: LLM failed ({e}). Falling back to deterministic template.")
        return get_fallback_template(engine_data)
        
    # 3. Validation (If agent succeeded)
    if validate_agent_response(agent_output, engine_data):
        # We would format the final UI card here using the agent's output
        pass 
    
    # Fallback if validation fails
    print("[Agent] Warning: Agent hallucinated. Falling back to deterministic template.")
    return get_fallback_template(engine_data)
