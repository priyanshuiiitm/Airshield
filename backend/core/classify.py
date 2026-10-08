from backend.core.config import Config

class ClassificationState:
    LOW = "LOW"
    AVOIDABLE = "AVOIDABLE"
    UNAVOIDABLE_WITHIN_POLICY = "UNAVOIDABLE_WITHIN_POLICY"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"

def classify_trip(optimization_result, stations_count):
    if stations_count < 5:
        return ClassificationState.INSUFFICIENT_DATA, 0.0
        
    fastest = optimization_result["fastest_route"]
    best_feasible = optimization_result["best_feasible_route"]
    absolute_safest = optimization_result["absolute_safest_route"]
    
    # Calculate reduction based on the best FEASIBLE route
    if fastest.exposure == 0:
        return ClassificationState.INSUFFICIENT_DATA, 0.0
        
    reduction = (fastest.exposure - best_feasible.exposure) / fastest.exposure
    
    if reduction >= Config.REDUCTION_THRESHOLD:
        return ClassificationState.AVOIDABLE, reduction
        
    # If we couldn't find a feasible route that drops exposure by 15%, 
    # but there IS a safer route outside the buffer...
    absolute_reduction = (fastest.exposure - absolute_safest.exposure) / fastest.exposure
    if absolute_reduction >= Config.REDUCTION_THRESHOLD:
        return ClassificationState.UNAVOIDABLE_WITHIN_POLICY, absolute_reduction
        
    return ClassificationState.LOW, 0.0
