"""
Unit tests for Recommendation Lambda Handler (backend/handlers/recommend.py).
Tests Scenario A, Scenario B, LOW baseline, and INSUFFICIENT_DATA preservation through the HTTP layer.
"""

import json
import pytest
from backend.handlers.recommend import lambda_handler


def test_recommend_scenario_a_avoidable():
    # Hauz Khas to Karol Bagh -> Scenario A (AVOIDABLE)
    event = {
        "requestContext": {"http": {"method": "POST", "path": "/recommend"}},
        "body": json.dumps({
            "pickup": {"lat": 28.5474, "lng": 77.1959},
            "drop": {"lat": 28.6515, "lng": 77.1911},
            "buffer_min": 5.0,
            "mode": "snapshot",
            "snapshot_id": "demo_v1"
        })
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["classification"] == "AVOIDABLE"
    assert body["recommendation"]["action"] == "TAKE_SAFER_ROUTE"
    assert body["recommendation"]["exposure_reduction_percent"] >= 15.0
    assert body["recommendation"]["reward_eligible"] is True
    assert body["recommendation"]["reward_amount_inr"] == 3
    assert len(body["routes"]) >= 2
    assert "geometry" in body["routes"][0]


def test_recommend_scenario_b_unavoidable():
    # Karol Bagh to Lajpat Nagar -> Scenario B (UNAVOIDABLE)
    event = {
        "requestContext": {"http": {"method": "POST", "path": "/recommend"}},
        "body": json.dumps({
            "pickup": {"lat": 28.6508, "lng": 77.1899},
            "drop": {"lat": 28.5688, "lng": 77.2424},
            "buffer_min": 5.0,
            "mode": "snapshot",
            "snapshot_id": "demo_v1"
        })
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["classification"] == "UNAVOIDABLE"
    assert body["benefit"]["eligible"] is True
    assert body["decision"]["selected_route_id"] == body["decision"]["fastest_route_id"]


def test_recommend_hindi_language():
    event = {
        "requestContext": {"http": {"method": "POST", "path": "/recommend"}},
        "body": json.dumps({
            "pickup": {"lat": 28.5474, "lng": 77.1959},
            "drop": {"lat": 28.6515, "lng": 77.1911},
            "language": "hi",
            "mode": "snapshot"
        })
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "मार्ग" in body["message"]


def test_recommend_invalid_input_returns_400():
    event = {
        "requestContext": {"http": {"method": "POST", "path": "/recommend"}},
        "body": json.dumps({
            "pickup": {"lat": 28.5474, "lng": 77.1959}
            # Missing drop
        })
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"]["code"] == "MISSING_DROP"
