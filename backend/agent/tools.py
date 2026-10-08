import json
from backend.core.routes import get_routes
from backend.core.aqi import get_aqi_data
from backend.core.exposure import compute_route_exposure
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from backend.core.config import Config

# In a real Strands implementation, you would import @tool from the Strands SDK
# e.g., from strands import tool
# For now, we mock the decorator to keep the code structure correct.
def tool(func):
    return func

@tool
def analyze_trip_exposure(pickup_lat: float, pickup_lon: float, drop_lat: float, drop_lon: float) -> str:
    """
    Analyzes a trip for pollution exposure and returns a JSON string with the classification,
    best route, exposure reduction, and time difference.
    """
    # 1. Routes
    routes = get_routes(pickup_lat, pickup_lon, drop_lat, drop_lon)
    if not routes:
        return json.dumps({"error": "No routes found"})
        
    # 2. AQI
    stations = get_aqi_data(pickup_lat, pickup_lon)
    if not stations:
        return json.dumps({"classification": "INSUFFICIENT_DATA", "reason": "No AQI stations"})
        
    # 3. Exposure
    for r in routes:
        compute_route_exposure(r, stations)
        
    # 4. Optimize
    opt_result = optimize_routes(routes, Config.DEFAULT_BUFFER_MIN)
    fastest = opt_result["fastest_route"]
    best_feasible = opt_result["best_feasible_route"]
    
    # 5. Classify
    state, reduction = classify_trip(opt_result, len(stations))
    
    # Construct structured output
    response = {
        "fastest_route_id": fastest.route_id,
        "best_feasible_route_id": best_feasible.route_id,
        "classification": state,
        "exposure_reduction_pct": round(reduction * 100, 1),
        "additional_time_min": best_feasible.duration - fastest.duration,
        "reward_amount": Config.REWARD_AVOIDABLE if state == "AVOIDABLE" else 0,
        "benefit_amount": Config.BENEFIT_UNAVOIDABLE if state == "UNAVOIDABLE_WITHIN_POLICY" else 0
    }
    
    return json.dumps(response)
