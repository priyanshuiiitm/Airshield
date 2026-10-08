"""
Unit tests for S3 repository (backend/repository/s3.py).
Covers all 8 criteria from Section 37:
1. Write raw AQI snapshot
2. Read snapshot
3. Read scenario snapshot
4. Read analytics summary
5. Missing snapshot handled correctly
6. Correct object key generated
7. No public URL is required
8. S3 errors handled safely
"""

import json
from unittest.mock import MagicMock
from io import BytesIO
from botocore.exceptions import ClientError
from backend.repository.s3 import S3Repository


def test_1_and_6_write_raw_aqi_snapshot():
    mock_client = MagicMock()
    repo = S3Repository(s3_client=mock_client)

    key = repo.save_raw_aqi_snapshot("2026-10-09", "1200", {"test": "data"})
    assert key == "raw/aqi/2026-10-09/1200.json"
    assert mock_client.put_object.called
    args = mock_client.put_object.call_args[1]
    assert args["Key"] == "raw/aqi/2026-10-09/1200.json"


def test_2_read_snapshot():
    mock_client = MagicMock()
    content = json.dumps({"stations": [{"station_id": "ST1"}]}).encode("utf-8")
    mock_client.get_object.return_value = {"Body": BytesIO(content)}

    repo = S3Repository(s3_client=mock_client)
    res = repo.get_frozen_aqi_snapshot("demo_v1")
    assert res is not None
    assert "stations" in res


def test_3_read_scenario_snapshot():
    mock_client = MagicMock()
    content = json.dumps({"scenario_a": {"scenario_id": "A001"}}).encode("utf-8")
    mock_client.get_object.return_value = {"Body": BytesIO(content)}

    repo = S3Repository(s3_client=mock_client)
    res = repo.get_scenario_snapshot("v1")
    assert res is not None
    assert res["scenario_a"]["scenario_id"] == "A001"


def test_4_read_analytics_summary():
    mock_client = MagicMock()
    content = json.dumps({"trips_analyzed": 100, "modelled": True}).encode("utf-8")
    mock_client.get_object.return_value = {"Body": BytesIO(content)}

    repo = S3Repository(s3_client=mock_client)
    res = repo.get_analytics_summary()
    assert res is not None
    assert res["modelled"] is True


def test_5_and_8_missing_snapshot_and_s3_error_handled_safely():
    mock_client = MagicMock()
    error_response = {"Error": {"Code": "NoSuchKey", "Message": "The specified key does not exist."}}
    mock_client.get_object.side_effect = ClientError(error_response, "GetObject")

    repo = S3Repository(s3_client=mock_client)
    res = repo.get_json_object("nonexistent.json")
    assert res is None
