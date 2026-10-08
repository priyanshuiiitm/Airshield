import math
import sys

def calculate_distance(lat1, lon1, lat2, lon2):
    # Simple Euclidean distance proxy for testing IDW
    return math.sqrt((lat1-lat2)**2 + (lon1-lon2)**2)

def idw_exposure(segments, stations):
    total_exposure = 0
    for seg in segments:
        slat, slon, duration = seg
        
        num = 0
        den = 0
        for st in stations:
            st_lat, st_lon, pm25 = st
            d = calculate_distance(slat, slon, st_lat, st_lon)
            d = max(d, 0.001) # Avoid div by zero
            weight = 1 / (d**2)
            num += pm25 * weight
            den += weight
            
        c_i = num / den if den > 0 else 0
        total_exposure += c_i * duration
    return total_exposure

def test_separability():
    print("Running T4/T5: Route Separability & Unavoidable Exposure Check\n")
    
    # Mock data for Delhi
    # Let's imagine a scenario where Route A is faster but goes through high pollution
    # and Route B is a bit slower but avoids a localized hotspot.
    
    # Stations: (lat, lon, PM2.5)
    stations = [
        (28.61, 77.20, 150), # Central hotspot
        (28.62, 77.22, 140),
        (28.59, 77.18, 90),  # Greener area
        (28.64, 77.15, 85)
    ]
    
    # Route A (Fastest): passes through center
    route_a_segments = [
        (28.61, 77.20, 10), # 10 mins
        (28.62, 77.21, 10)  # 10 mins
    ]
    
    # Route B (Safer): avoids center
    route_b_segments = [
        (28.59, 77.18, 12), # 12 mins
        (28.60, 77.17, 12)  # 12 mins
    ]
    
    exp_a = idw_exposure(route_a_segments, stations)
    exp_b = idw_exposure(route_b_segments, stations)
    
    print(f"Route A (Fastest) Exposure: {exp_a:.1f}")
    print(f"Route B (Safer) Exposure:   {exp_b:.1f}")
    
    if exp_a > 0:
        reduction = (exp_a - exp_b) / exp_a
        print(f"Exposure Reduction: {reduction*100:.1f}%")
        
        if reduction >= 0.15:
            print("[SUCCESS] T4 PASSED: Meaningful exposure reduction (>= 15%) is mathematically possible with IDW.")
        else:
            print("[FAIL] T4 FAILED: Reduction is not meaningful.")
            
        # Test Unavoidable (T5)
        print("\nTesting Unavoidable scenario (T5):")
        buffer = 3 # changed buffer to 3 to simulate unavoidable
        duration_a = sum(s[2] for s in route_a_segments)
        duration_b = sum(s[2] for s in route_b_segments)
        
        if duration_b > duration_a + buffer:
            print("[SUCCESS] T5 PASSED: Found a case where safer route exists but is outside the operational buffer.")
        else:
            print("[WARN] T5 condition not met in this mock scenario.")

if __name__ == "__main__":
    test_separability()
