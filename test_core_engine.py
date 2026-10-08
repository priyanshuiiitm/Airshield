from backend.core.routes import get_routes
from backend.core.aqi import get_aqi_data
from backend.core.exposure import compute_route_exposure
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from backend.core.config import Config

def test_engine():
    print("Testing Phase 1 Core Engine...\n")
    
    # 1. Fetch Mock Routes
    print("1. Fetching routes...")
    routes = get_routes(28.61, 77.20, 28.63, 77.25)
    print(f"   Returned {len(routes)} routes.")
    
    # 2. Fetch AQI Data
    print("\n2. Fetching AQI data (requires OpenAQ API Key in .env)...")
    stations = get_aqi_data(28.61, 77.20)
    print(f"   Found {len(stations)} stations.")
    
    if len(stations) == 0:
        print("   ❌ No stations found. Please check your OPENAQ_API_KEY.")
        return
        
    # --- HOTSPOT SIMULATION FOR DEMO ---
    # To prove the logic works, we'll force stations near Route 1 (center) to be highly polluted,
    # and stations near Route 2 to be much cleaner.
    for st in stations:
        # If closer to Route 1's center (28.615, 77.205) than Route 2 (28.595, 77.175)
        dist_to_r1 = (st.lat - 28.615)**2 + (st.lon - 77.205)**2
        dist_to_r2 = (st.lat - 28.595)**2 + (st.lon - 77.175)**2
        if dist_to_r1 < dist_to_r2:
            st.pm25 = 250.0 # High pollution hotspot
        else:
            st.pm25 = 60.0  # Much cleaner area
    # -----------------------------------
        
    # 3. Compute Exposure
    print("\n3. Computing exposure...")
    for route in routes:
        compute_route_exposure(route, stations)
        print(f"   Route {route.route_id} ({route.duration} min): Exposure {route.exposure:.1f}")
        
    # 4. Optimize
    print("\n4. Optimizing...")
    opt_result = optimize_routes(routes, Config.DEFAULT_BUFFER_MIN)
    print(f"   Fastest: {opt_result['fastest_route'].route_id}")
    print(f"   Best Feasible: {opt_result['best_feasible_route'].route_id}")
    
    # 5. Classify
    print("\n5. Classifying...")
    state, reduction = classify_trip(opt_result, len(stations))
    
    print(f"\n✅ Result: {state}")
    print(f"✅ Reduction: {reduction*100:.1f}%")
    
    # 6. Agent Fallback Test
    print("\n6. Running Agent orchestration (with fallback to templates)...")
    from backend.agent.agent import run_agent
    ui_card = run_agent(28.61, 77.20, 28.63, 77.25)
    
    print("\n=== FINAL WORKER UI PAYLOAD ===")
    import json
    print(json.dumps(ui_card, indent=2))
    
if __name__ == "__main__":
    test_engine()
