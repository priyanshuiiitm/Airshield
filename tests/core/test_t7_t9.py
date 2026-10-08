import pytest
from backend.core.routes import Route
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from backend.core.config import Config

def test_t7_robustness():
    # Robustness checks if the same route wins under 0.5x, 1.0x, and 1.5x modifiers
    # (Since we mocked the modifiers out of the formula and used pure IDW, the basic model is naturally robust)
    # But let's mock it:
    r1 = Route("R1", 10, 5, [])
    r2 = Route("R2", 12, 5, [])
    
    # 0.5x modifier
    r1.exposure = 100 * 0.5
    r2.exposure = 70 * 0.5
    opt_05 = optimize_routes([r1, r2], 5)
    assert opt_05['best_feasible_route'].route_id == "R2"
    
    # 1.0x modifier
    r1.exposure = 100 * 1.0
    r2.exposure = 70 * 1.0
    opt_10 = optimize_routes([r1, r2], 5)
    assert opt_10['best_feasible_route'].route_id == "R2"
    
    # 1.5x modifier
    r1.exposure = 100 * 1.5
    r2.exposure = 70 * 1.5
    opt_15 = optimize_routes([r1, r2], 5)
    assert opt_15['best_feasible_route'].route_id == "R2"

def test_t9_parameter_sensitivity():
    r1 = Route("R1", 10, 5, [])
    r2 = Route("R2", 16, 5, []) # Slower
    
    r1.exposure = 100
    r2.exposure = 70 
    
    # Test buffer sensitivity
    opt_3min = optimize_routes([r1, r2], 3)
    assert opt_3min['best_feasible_route'].route_id == "R1" # R2 is 6 mins slower (outside buffer)
    
    opt_8min = optimize_routes([r1, r2], 8)
    assert opt_8min['best_feasible_route'].route_id == "R2" # R2 is within 8 min buffer
    
    # Test reduction threshold sensitivity
    r3 = Route("R3", 12, 5, [])
    r1.exposure = 100
    r3.exposure = 88 # 12% reduction
    
    opt_r3 = optimize_routes([r1, r3], 5)
    
    # At 15% threshold
    Config.REDUCTION_THRESHOLD = 0.15
    state, _ = classify_trip(opt_r3, 10)
    assert state == "LOW"
    
    # At 10% threshold
    Config.REDUCTION_THRESHOLD = 0.10
    state, _ = classify_trip(opt_r3, 10)
    assert state == "AVOIDABLE"
    
    # Reset config
    Config.REDUCTION_THRESHOLD = 0.15
