import pytest
from backend.core.routes import Route
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip

def test_t8_case1_low_baseline():
    r1 = Route("R1", 10, 5, [])
    r2 = Route("R2", 12, 5, [])
    r1.exposure = 50
    r2.exposure = 48 # <15% reduction
    opt = optimize_routes([r1, r2], 5)
    state, red = classify_trip(opt, 10)
    assert state == "LOW"

def test_t8_case2_avoidable():
    r1 = Route("R1", 10, 5, [])
    r2 = Route("R2", 12, 5, []) # +2 min (within 5)
    r1.exposure = 100
    r2.exposure = 70 # 30% reduction
    opt = optimize_routes([r1, r2], 5)
    state, red = classify_trip(opt, 10)
    assert state == "AVOIDABLE"

def test_t8_case3_unavoidable():
    r1 = Route("R1", 10, 5, [])
    r2 = Route("R2", 17, 5, []) # +7 min (outside 5)
    r1.exposure = 100
    r2.exposure = 60 # 40% reduction
    opt = optimize_routes([r1, r2], 5)
    state, red = classify_trip(opt, 10)
    assert state == "UNAVOIDABLE_WITHIN_POLICY"

def test_t8_case5_insufficient_data():
    r1 = Route("R1", 10, 5, [])
    r2 = Route("R2", 12, 5, []) 
    r1.exposure = 100
    r2.exposure = 80 # 20% reduction
    opt = optimize_routes([r1, r2], 5)
    state, red = classify_trip(opt, 2) # Stations < 5
    assert state == "INSUFFICIENT_DATA"
