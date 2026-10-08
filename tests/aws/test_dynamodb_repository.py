"""
Unit tests for DynamoDB repository (backend/repository/dynamodb.py).
Covers all 10 criteria from Section 36:
1. AQI write
2. AQI read
3. Trip write
4. Trip retrieval
5. Reward write
6. Duplicate reward prevention
7. TTL attribute written
8. Missing trip
9. Missing worker
10. Conditional update behavior
"""

from unittest.mock import MagicMock
from decimal import Decimal
from botocore.exceptions import ClientError
from backend.repository.dynamodb import DynamoDBRepository


def test_1_aqi_write_and_7_ttl():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)
    success = repo.put_aqi_reading(
        station_id="ST_001",
        timestamp_iso="2026-10-08T12:00:00Z",
        lat=28.63,
        lng=77.22,
        pm25=150.0,
        ttl_hours=48
    )
    assert success is True
    call_args = mock_table.put_item.call_args[1]["Item"]
    assert call_args["station_id"] == "ST_001"
    assert "ttl_epoch" in call_args
    assert call_args["ttl_epoch"] > 0


def test_2_aqi_read():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table
    mock_table.scan.return_value = {
        "Items": [
            {"station_id": "ST_001", "pm25": Decimal("150.0"), "lat": Decimal("28.63"), "lng": Decimal("77.22")}
        ]
    }

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)
    readings = repo.get_latest_station_readings()
    assert len(readings) == 1
    assert readings[0]["pm25"] == 150.0


def test_3_trip_write_and_4_retrieval():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table
    mock_table.get_item.return_value = {
        "Item": {"trip_id": "trip_test", "classification": "AVOIDABLE", "reduction_percent": Decimal("25.0")}
    }

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)
    success = repo.save_trip({"trip_id": "trip_test", "classification": "AVOIDABLE", "reduction_percent": 25.0})
    assert success is True

    trip = repo.get_trip("trip_test")
    assert trip is not None
    assert trip["trip_id"] == "trip_test"
    assert trip["reduction_percent"] == 25.0


def test_5_reward_write_and_6_duplicate_prevention():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)

    # First write succeeds
    mock_table.put_item.return_value = {}
    succ1, status1 = repo.credit_reward_idempotent("worker_1", "trip_1", 3)
    assert succ1 is True
    assert status1 == "CREDITED"

    # Second write triggers ConditionalCheckFailedException -> returns ALREADY_PROCESSED
    error_response = {"Error": {"Code": "ConditionalCheckFailedException", "Message": "The conditional request failed"}}
    mock_table.put_item.side_effect = ClientError(error_response, "PutItem")
    succ2, status2 = repo.credit_reward_idempotent("worker_1", "trip_1", 3)
    assert succ2 is True
    assert status2 == "ALREADY_PROCESSED"


def test_8_missing_trip():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table
    mock_table.get_item.return_value = {}

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)
    trip = repo.get_trip("trip_nonexistent")
    assert trip is None


def test_9_missing_worker_wallet():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table
    mock_table.query.return_value = {"Items": []}

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)
    wallet = repo.get_wallet_summary("unknown_worker")
    assert wallet["balance_inr"] == 0
    assert wallet["trip_count"] == 0


def test_10_update_trip_choice():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)
    ok = repo.update_trip_choice("trip_123", "safer")
    assert ok is True
    assert mock_table.update_item.called
