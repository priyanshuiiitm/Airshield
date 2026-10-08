import math

def calculate_distance(lat1, lon1, lat2, lon2):
    # Simple Euclidean distance for IDW
    return math.sqrt((lat1-lat2)**2 + (lon1-lon2)**2)

def compute_route_exposure(route, stations):
    """
    Computes total exposure for a route using Inverse Distance Weighting (IDW)
    across its segments.
    """
    total_exposure = 0
    
    for seg_lat, seg_lon, seg_duration in route.segments:
        num = 0
        den = 0
        
        # Find nearest 4 stations for interpolation
        sorted_stations = sorted(
            stations, 
            key=lambda s: calculate_distance(seg_lat, seg_lon, s.lat, s.lon)
        )[:4]
        
        for st in sorted_stations:
            d = calculate_distance(seg_lat, seg_lon, st.lat, st.lon)
            d = max(d, 0.001)
            weight = 1 / (d**2)
            num += st.pm25 * weight
            den += weight
            
        c_i = num / den if den > 0 else 0
        total_exposure += c_i * seg_duration
        
    route.exposure = total_exposure
    return route
