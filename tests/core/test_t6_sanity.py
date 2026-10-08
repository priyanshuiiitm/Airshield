import pytest
from backend.core.exposure import compute_route_exposure
from backend.core.routes import Route
from backend.core.aqi import AQIStation
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from backend.core.config import Config

def test_t6_sanity_a_double_duration():
    stations = [AQIStation("1", 28.0, 77.0, 100)]
    route1 = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    route2 = Route("R2", 20, 5, [(28.0, 77.0, 20)]) # Same geometry, double duration
    
    compute_route_exposure(route1, stations)
    compute_route_exposure(route2, stations)
    assert pytest.approx(route2.exposure, 0.1) == route1.exposure * 2

def test_t6_sanity_b_lower_pm25():
    route = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    stations_high = [AQIStation("1", 28.0, 77.0, 100)]
    stations_low = [AQIStation("1", 28.0, 77.0, 50)]
    
    exp_high = compute_route_exposure(route, stations_high).exposure
    route.exposure = None # Reset
    exp_low = compute_route_exposure(route, stations_low).exposure
    
    assert exp_low < exp_high

def test_t6_sanity_c_identical_input():
    stations = [AQIStation("1", 28.0, 77.0, 100)]
    route1 = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    
    exp1 = compute_route_exposure(route1, stations).exposure
    route1.exposure = None
    exp2 = compute_route_exposure(route1, stations).exposure
    assert exp1 == exp2

def test_t6_sanity_d_identical_geometry():
    stations = [AQIStation("1", 28.0, 77.0, 100)]
    route1 = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    route2 = Route("R2", 10, 5, [(28.0, 77.0, 10)])
    
    compute_route_exposure(route1, stations)
    compute_route_exposure(route2, stations)
    
    opt = optimize_routes([route1, route2], 5)
    state, reduction = classify_trip(opt, len(stations))
    assert reduction == 0.0

def test_t6_sanity_e_tiny_difference():
    # 3% difference -> no safer route (LOW or UNAVOIDABLE_WITHIN_POLICY if absolute is better)
    stations = [AQIStation("1", 28.0, 77.0, 100)]
    route1 = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    route2 = Route("R2", 12, 5, [(28.0, 77.0, 10)]) # Slower
    
    route1.exposure = 100
    route2.exposure = 97 # 3% reduction
    
    opt = optimize_routes([route1, route2], 5)
    state, reduction = classify_trip(opt, 10)
    assert state in ["LOW", "UNAVOIDABLE_WITHIN_POLICY"]

def test_t6_sanity_f_no_stations():
    route1 = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    route1.exposure = 0
    opt = optimize_routes([route1], 5)
    state, _ = classify_trip(opt, 0)
    assert state == "INSUFFICIENT_DATA"

def test_t6_sanity_g_increase_buffer():
    route1 = Route("R1", 10, 5, [(28.0, 77.0, 10)])
    route2 = Route("R2", 20, 5, [(28.0, 77.0, 20)])
    route1.exposure = 100
    route2.exposure = 50
    
    opt1 = optimize_routes([route1, route2], 5)
    assert opt1["best_feasible_route"].route_id == "R1" # R2 is 10 mins slower, outside 5 min buffer
    
    opt2 = optimize_routes([route1, route2], 15)
    assert opt2["best_feasible_route"].route_id == "R2" # R2 is now inside the 15 min buffer
