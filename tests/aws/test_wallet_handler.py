"""
Unit tests for GET /wallet/{worker_id}, GET /analytics/summary, and GET /health.
"""

import json
from unittest.mock import MagicMock
from backend.handlers.recommend import lambda_handler
import backend.handlers.recommend as recommend_module


def test_wallet_handler():
    mock_db = MagicMock()
    mock_db.get_wallet_summary.return_value = {
        "worker_id": "demo_worker",
        "balance_inr": 15,
        "trip_count": 6,
        "reward_count": 5,
        "benefit_count": 0,
        "simulated": True
    }
    recommend_module._dynamodb = mock_db

    event = {
        "requestContext": {"http": {"method": "GET", "path": "/wallet/demo_worker"}},
        "pathParameters": {"worker_id": "demo_worker"}
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["balance_inr"] == 15
    assert body["simulated"] is True


def test_analytics_handler():
    mock_s3 = MagicMock()
    mock_s3.get_analytics_summary.return_value = {
        "city": "Delhi NCR",
        "trips_analyzed": 100,
        "avoidable_share": 4.0,
        "unavoidable_share": 95.0,
        "modelled": True
    }
    recommend_module._s3 = mock_s3

    event = {
        "requestContext": {"http": {"method": "GET", "path": "/analytics/summary"}}
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["city"] == "Delhi NCR"
    assert body["modelled"] is True


def test_health_handler():
    event = {
        "requestContext": {"http": {"method": "GET", "path": "/health"}}
    }
    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["status"] == "ok"
    assert body["router"] == "ok"
    assert body["dynamodb"] == "ok"
    assert body["s3"] == "ok"
