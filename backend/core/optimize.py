def optimize_routes(routes, buffer_min):
    """
    Finds the fastest route, the feasible routes within the buffer, 
    and the lowest-exposure route among the feasible ones.
    """
    if not routes:
        return None, None
        
    fastest = min(routes, key=lambda r: r.duration)
    
    feasible_routes = [
        r for r in routes
        if r.duration <= fastest.duration + buffer_min
    ]
    
    best_feasible = min(feasible_routes, key=lambda r: r.exposure)
    
    # Check if there is an even safer route OUTSIDE the buffer (for UNAVOIDABLE classification)
    absolute_safest = min(routes, key=lambda r: r.exposure)
    
    return {
        "fastest_route": fastest,
        "best_feasible_route": best_feasible,
        "absolute_safest_route": absolute_safest
    }
