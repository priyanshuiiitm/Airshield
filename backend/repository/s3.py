"""
AirShield S3 Repository.
Provides clean access to S3 data storage:
- raw/aqi/YYYY-MM-DD/HHMM.json (Immutable raw OpenAQ API responses)
- scenarios/scenarios_v1.json (Precomputed demonstration scenarios)
- snapshots/demo_v1.json (Frozen deterministic station snapshot)
- features/delhi_grid.json (Static spatial feature overlays)
- analytics/summary.json (Precalculated model distribution statistics)
"""

from __future__ import annotations
import os
import json
import logging
from typing import Optional, Any
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger("airshield.s3")


class S3Repository:
    """Encapsulates all S3 data access for AirShield."""

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        s3_client: Optional[Any] = None
    ):
        self.bucket_name = bucket_name or os.environ.get("DATA_BUCKET", "airshield-data-dev")
        self.region = os.environ.get("AWS_REGION", "ap-south-1")
        self.client = s3_client or boto3.client("s3", region_name=self.region)

    def put_json_object(self, key: str, data: Any) -> bool:
        """Serialize data to JSON and upload to S3."""
        try:
            json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=json_bytes,
                ContentType="application/json"
            )
            return True
        except ClientError as e:
            logger.error(f"Failed to put S3 object {key}: {e}")
            return False

    def get_json_object(self, key: str) -> Optional[dict[str, Any]]:
        """Retrieve and parse JSON object from S3."""
        try:
            resp = self.client.get_object(Bucket=self.bucket_name, Key=key)
            body = resp["Body"].read().decode("utf-8")
            return json.loads(body)
        except ClientError as e:
            logger.warning(f"Failed to get S3 object {key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing S3 JSON for {key}: {e}")
            return None

    def save_raw_aqi_snapshot(self, date_str: str, time_str: str, raw_data: Any) -> Optional[str]:
        """Save raw OpenAQ response to immutable partitioned prefix."""
        key = f"raw/aqi/{date_str}/{time_str}.json"
        success = self.put_json_object(key, raw_data)
        return key if success else None

    def get_scenario_snapshot(self, scenario_version: str = "v1") -> Optional[dict[str, Any]]:
        """Fetch scenarios_v1.json artifact."""
        key = f"scenarios/scenarios_{scenario_version}.json"
        return self.get_json_object(key)

    def get_frozen_aqi_snapshot(self, snapshot_id: str = "demo_v1") -> Optional[dict[str, Any]]:
        """Fetch frozen deterministic AQI stations snapshot."""
        key = f"snapshots/{snapshot_id}.json"
        return self.get_json_object(key)

    def get_analytics_summary(self) -> Optional[dict[str, Any]]:
        """Fetch precomputed batch analytics summary."""
        return self.get_json_object("analytics/summary.json")

    def upload_file(self, local_path: Path, key: str, content_type: str = "application/json") -> bool:
        """Upload a local file directly to S3."""
        try:
            with open(local_path, "rb") as f:
                self.client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=f.read(),
                    ContentType=content_type
                )
            return True
        except Exception as e:
            logger.error(f"Failed to upload local file {local_path} to s3://{self.bucket_name}/{key}: {e}")
            return False
