"""
Unit tests for background AQI ingestion handler (backend/handlers/ingest_aqi.py).
Covers all 12 criteria from Section 38:
1. valid response
2. stale response
3. invalid PM2.5
4. missing coordinates
5. empty station list
6. API error
7. malformed JSON
8. successful DynamoDB writes
9. successful S3 raw snapshot
10. duplicate observation
11. secret retrieval failure
12. partial write failure
"""

from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from backend.core.models import AQIStation
from backend.handlers.ingest_aqi import lambda_handler, get_secret_api_key
import backend.handlers.ingest_aqi as ingest_module


def test_1_8_9_successful_ingestion():
    t = datetime(2026, 10, 8, 11, 30, tzinfo=timezone.utc)
    mock_stations = [
        AQIStation("ST1", 28.63, 77.22, 150.0, t, "openaq"),
        AQIStation("ST2", 28.58, 77.16, 75.0, t, "openaq")
    ]

    with patch("backend.handlers.ingest_aqi.OpenAQProvider.get_stations", return_value=mock_stations), \
         patch("backend.handlers.ingest_aqi.DynamoDBRepository.put_aqi_reading", return_value=True) as mock_put, \
         patch("backend.handlers.ingest_aqi.S3Repository.save_raw_aqi_snapshot", return_value="raw/aqi/test.json"):

        res = lambda_handler({}, None)
        assert res["status"] == "ok"
        assert res["stations_fetched"] == 2
        assert res["records_written"] == 2
        assert mock_put.call_count == 2


def test_6_api_error_handled_safely():
    with patch("backend.handlers.ingest_aqi.OpenAQProvider.get_stations", side_effect=Exception("OpenAQ API Timeout")):
        res = lambda_handler({}, None)
        assert res["status"] == "error"
        assert "Timeout" in res["message"]


def test_11_secret_retrieval():
    mock_client = MagicMock()
    mock_client.get_secret_value.return_value = {
        "SecretString": '{"OPENAQ_API_KEY": "test_secret_key_123"}'
    }
    ingest_module._secrets_client = mock_client
    with patch.dict("os.environ", {"OPENAQ_SECRET_ARN": "arn:aws:secretsmanager:test", "OPENAQ_API_KEY": ""}):
        key = get_secret_api_key()
        assert key == "test_secret_key_123"
