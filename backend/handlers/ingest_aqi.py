"""
AirShield Background AQI Ingestion Lambda Handler.
Invoked recurringly (every 20 minutes) via Amazon EventBridge Scheduler.
Responsibilities:
1. Retrieve OpenAQ API Key from AWS Secrets Manager.
2. Query live PM2.5 monitoring observations across Delhi NCR.
3. Validate and filter observations.
4. Write normalized items with TTL into DynamoDB (aqi_readings).
5. Persist immutable raw JSON response to S3 (raw/aqi/YYYY-MM-DD/HHMM.json).
6. Emit structured CloudWatch log audit summary.
"""

from __future__ import annotations
import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
import boto3
from botocore.exceptions import ClientError

from backend.core.models import Coordinate, AQIStation
from backend.core.aqi import OpenAQProvider, filter_fresh_stations
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository

logger = logging.getLogger("airshield.handler.ingest")
logger.setLevel(logging.INFO)

# Global clients
_secrets_client: Optional[Any] = None
_dynamodb: Optional[DynamoDBRepository] = None
_s3: Optional[S3Repository] = None


def get_secret_api_key() -> Optional[str]:
    """Retrieve OpenAQ API key from AWS Secrets Manager."""
    secret_arn = os.environ.get("OPENAQ_SECRET_ARN")
    direct_key = os.environ.get("OPENAQ_API_KEY")

    if direct_key:
        return direct_key

    if not secret_arn:
        logger.warning("Neither OPENAQ_SECRET_ARN nor OPENAQ_API_KEY configured.")
        return None

    global _secrets_client
    if _secrets_client is None:
        region = os.environ.get("AWS_REGION", "ap-south-1")
        _secrets_client = boto3.client("secretsmanager", region_name=region)

    try:
        resp = _secrets_client.get_secret_value(SecretId=secret_arn)
        if "SecretString" in resp:
            secret_str = resp["SecretString"]
            try:
                secret_dict = json.loads(secret_str)
                return secret_dict.get("OPENAQ_API_KEY", secret_dict.get("api_key", secret_str))
            except json.JSONDecodeError:
                return secret_str
    except ClientError as e:
        logger.error(f"Failed to retrieve OpenAQ secret from Secrets Manager: {e}")
        return None

    return None


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """EventBridge Scheduler entry point."""
    logger.info("Starting background AQI ingestion job...")
    now_utc = datetime.now(timezone.utc)
    date_str = now_utc.strftime("%Y-%m-%d")
    time_str = now_utc.strftime("%H%M")

    dynamodb = DynamoDBRepository()
    s3 = S3Repository()

    api_key = get_secret_api_key()
    provider = OpenAQProvider(api_key=api_key)

    center = Coordinate(28.6139, 77.2090)  # Delhi center
    try:
        # 1. Fetch live observations
        stations = provider.get_stations(center, max_distance_km=30.0)
    except Exception as e:
        logger.error(f"Failed to fetch live stations from OpenAQ: {e}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": now_utc.isoformat()
        }

    # 2. Write raw snapshot to S3
    raw_payload = {
        "ingestion_timestamp": now_utc.isoformat(),
        "source": "openaq",
        "station_count": len(stations),
        "stations": [
            {
                "station_id": s.station_id,
                "lat": s.lat,
                "lng": s.lng,
                "pm25": s.pm25,
                "timestamp": s.timestamp.isoformat(),
                "source": s.source
            }
            for s in stations
        ]
    }
    s3_key = s3.save_raw_aqi_snapshot(date_str, time_str, raw_payload)

    # 3. Write normalized records to DynamoDB
    written_count = 0
    for s in stations:
        success = dynamodb.put_aqi_reading(
            station_id=s.station_id,
            timestamp_iso=s.timestamp.isoformat(),
            lat=s.lat,
            lng=s.lng,
            pm25=s.pm25,
            source=s.source,
            snapshot_id="live",
            ttl_hours=48
        )
        if success:
            written_count += 1

    logger.info(f"AQI Ingestion Complete: {len(stations)} fetched, {written_count} written to DynamoDB. Raw S3: {s3_key}")

    return {
        "status": "ok",
        "timestamp": now_utc.isoformat(),
        "stations_fetched": len(stations),
        "records_written": written_count,
        "s3_raw_key": s3_key
    }
