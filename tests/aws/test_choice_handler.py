"""
Unit tests for POST /trips/{trip_id}/choice and reward processing.
"""

import json
from unittest.mock import MagicMock
from backend.handlers.recommend import lambda_handler
import backend.handlers.recommend as recommend_module


def test_choice_safer_credited():
    # Mock DynamoDB
    mock_db = MagicMock()
    mock_db.get_trip.return_value = {
        "trip_id": "trip_123",
        "worker_id": "worker_test",
        "reward_eligible": True,
        "reward_amount_inr": 3
    }
    mock_db.update_trip_choice.return_value = True
    mock_db.credit_reward_idempotent.return_value = (True, "CREDITED")

    recommend_module._dynamodb = mock_db

    event = {
        "requestContext": {"http": {"method": "POST", "path": "/trips/trip_123/choice"}},
        "pathParameters": {"trip_id": "trip_123"},
        "body": json.dumps({"choice": "safer"})
    }

    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["reward_status"] == "CREDITED"
    assert body["credited_amount_inr"] == 3


def test_choice_fastest_no_reward():
    mock_db = MagicMock()
    mock_db.get_trip.return_value = {
        "trip_id": "trip_456",
        "worker_id": "worker_test",
        "reward_eligible": True,
        "reward_amount_inr": 3
    }
    mock_db.update_trip_choice.return_value = True

    recommend_module._dynamodb = mock_db

    event = {
        "requestContext": {"http": {"method": "POST", "path": "/trips/trip_456/choice"}},
        "pathParameters": {"trip_id": "trip_456"},
        "body": json.dumps({"choice": "fastest"})
    }

    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["reward_status"] == "NOT_ELIGIBLE"
    assert body["credited_amount_inr"] == 0


def test_choice_missing_trip_returns_404():
    mock_db = MagicMock()
    mock_db.get_trip.return_value = None
    recommend_module._dynamodb = mock_db

    event = {
        "requestContext": {"http": {"method": "POST", "path": "/trips/trip_nonexistent/choice"}},
        "pathParameters": {"trip_id": "trip_nonexistent"},
        "body": json.dumps({"choice": "safer"})
    }

    resp = lambda_handler(event, None)
    assert resp["statusCode"] == 404
