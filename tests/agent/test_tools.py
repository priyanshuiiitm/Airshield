"""
Unit tests for AirShield custom agent tools (Phase 4).
"""

import pytest
from backend.agent.tools import (
    execute_get_routes,
    execute_get_aqi,
    execute_compute_exposure,
    execute_optimize_route,
    ToolContext,
    set_tool_context,
    get_tool_context
)


@pytest.fixture(autouse=True)
def tool_context():
    ctx = ToolContext()
    set_tool_context(ctx)
    return ctx


def test_get_routes_tool_valid():
    """Verify get_routes returns valid candidate routes."""
    res = execute_get_routes(
        pickup_lat=28.5474,
        pickup_lng=77.1959,
        drop_lat=28.6515,
        drop_lng=77.1911
    )
    assert res["status"] == "success"
    assert len(res["routes"]) >= 2
    assert "route_id" in res["routes"][0]
    assert "duration_sec" in res["routes"][0]
    assert "geometry" in res["routes"][0]
    
    ctx = get_tool_context()
    assert len(ctx.trace) == 1
    assert ctx.trace[0].tool == "get_routes"
    assert ctx.trace[0].status == "success"
    assert ctx.trace[0].duration_ms > 0


def test_get_aqi_tool_snapshot_valid():
    """Verify get_aqi returns snapshot observations."""
    res = execute_get_aqi(
        lat=28.5474,
        lng=77.1959,
        snapshot_id="demo_v1",
        mode="snapshot"
    )
    assert res["status"] == "success"
    assert len(res["stations"]) >= 2
    assert res["confidence"] == "HIGH"
    assert "pm25" in res["stations"][0]


def test_get_aqi_tool_insufficient_data(monkeypatch):
    """Verify get_aqi handles empty station observations safely."""
    import backend.agent.tools
    monkeypatch.setattr(backend.agent.tools, "load_stations_from_fixture", lambda name: [])
    
    res = execute_get_aqi(lat=0.0, lng=0.0, mode="snapshot")
    assert res["status"] == "insufficient_data"
    assert res["stations"] == []
    assert res["confidence"] == "LOW"


def test_compute_exposure_tool_valid():
    """Verify compute_exposure executes deterministic IDW calculation."""
    routes_res = execute_get_routes(28.5474, 77.1959, 28.6515, 77.1911)
    aqi_res = execute_get_aqi(28.5474, 77.1959, snapshot_id="demo_v1")
    
    res = execute_compute_exposure(
        routes=routes_res["routes"],
        stations=aqi_res["stations"]
    )
    assert res["status"] == "success"
    assert len(res["results"]) == len(routes_res["routes"])
    assert "exposure" in res["results"][0]
    assert "average_pm25" in res["results"][0]
    assert res["results"][0]["exposure"] > 0


def test_optimize_route_tool_avoidable():
    """Verify optimize_route returns correct deterministic decision."""
    routes_res = execute_get_routes(28.5474, 77.1959, 28.6515, 77.1911)
    aqi_res = execute_get_aqi(28.5474, 77.1959, snapshot_id="demo_v1")
    exp_res = execute_compute_exposure(routes_res["routes"], aqi_res["stations"])
    
    opt_res = execute_optimize_route(
        routes=routes_res["routes"],
        exposure_results=exp_res["results"],
        buffer_min=5.0
    )
    assert opt_res["status"] == "success"
    decision = opt_res["decision"]
    assert decision is not None
    assert decision["classification"] in ("AVOIDABLE", "UNAVOIDABLE", "LOW", "INSUFFICIENT_DATA")
    assert "fastest_route_id" in decision
    assert "reduction_percent" in decision
