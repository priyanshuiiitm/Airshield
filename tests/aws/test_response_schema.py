"""
Unit tests verifying strict compliance of API responses against canonical AirShield response schema.
"""

import json
from backend.handlers.recommend import lambda_handler


def test_recommend_response_schema():
    event = {
        "requestContext": {"http": {"method": "POST", "path": "/recommend"}},
        "body": json.dumps({
            "pickup": {"lat": 28.5474, "lng": 77.1959},
            "drop": {"lat": 28.6515, "lng": 77.1911},
            "buffer_min": 5.0,
            "mode": "snapshot"
        })
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    # Required top-level keys
    required_keys = [
        "trip_id", "classification", "recommendation", "routes",
        "decision", "benefit", "metadata", "message"
    ]
    for key in required_keys:
        assert key in body, f"Missing required top-level key: {key}"

    # Recommendation sub-schema
    rec = body["recommendation"]
    assert "route_id" in rec
    assert "action" in rec
    assert "additional_minutes" in rec
    assert "exposure_reduction_percent" in rec
    assert "reward_eligible" in rec

    # Routes array sub-schema
    assert len(body["routes"]) >= 1
    r0 = body["routes"][0]
    assert "route_id" in r0
    assert "duration_minutes" in r0
    assert "distance_km" in r0
    assert "exposure_index" in r0
    assert "average_pm25" in r0
    assert "feasible" in r0
    assert "confidence" in r0
    assert "geometry" in r0
    assert len(r0["geometry"]) >= 2
    assert "lat" in r0["geometry"][0] and "lng" in r0["geometry"][0]
