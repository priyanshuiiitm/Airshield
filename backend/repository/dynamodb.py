"""
AirShield DynamoDB Repository.
Provides clean, structured access to:
- aqi_readings (Time-series air quality observations with TTL)
- trips (Audit record of route comparisons and recommendations)
- rewards (Idempotent worker micro-rewards and benefit records)
"""

from __future__ import annotations
import os
import time
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Any
import boto3
from botocore.exceptions import ClientError
from backend.core.config import DEFAULT_CONFIG

logger = logging.getLogger("airshield.dynamodb")


def _convert_floats_to_decimals(obj: Any) -> Any:
    """Helper to convert floats to Decimal for DynamoDB storage."""
    if isinstance(obj, float):
        return Decimal(str(round(obj, 6)))
    if isinstance(obj, dict):
        return {k: _convert_floats_to_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_floats_to_decimals(v) for v in obj]
    return obj


def _convert_decimals_to_floats(obj: Any) -> Any:
    """Helper to convert Decimals back to standard Python floats."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _convert_decimals_to_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_decimals_to_floats(v) for v in obj]
    return obj


class DynamoDBRepository:
    """Encapsulates all DynamoDB operations for AirShield."""

    def __init__(
        self,
        aqi_table_name: Optional[str] = None,
        trips_table_name: Optional[str] = None,
        rewards_table_name: Optional[str] = None,
        dynamodb_resource: Optional[Any] = None,
        dynamodb_client: Optional[Any] = None
    ):
        self.aqi_table_name = aqi_table_name or os.environ.get("AQI_TABLE", "airshield-aqi-readings-dev")
        self.trips_table_name = trips_table_name or os.environ.get("TRIPS_TABLE", "airshield-trips-dev")
        self.rewards_table_name = rewards_table_name or os.environ.get("REWARDS_TABLE", "airshield-rewards-dev")

        self.region = os.environ.get("AWS_REGION", "ap-south-1")
        self.resource = dynamodb_resource or boto3.resource("dynamodb", region_name=self.region)
        self.client = dynamodb_client or boto3.client("dynamodb", region_name=self.region)

    # ----------------------------------------------------
    # AQI READINGS TABLE
    # ----------------------------------------------------
    def put_aqi_reading(
        self,
        station_id: str,
        timestamp_iso: str,
        lat: float,
        lng: float,
        pm25: float,
        source: str = "openaq",
        snapshot_id: str = "live",
        ttl_hours: int = 48
    ) -> bool:
        """Write single AQI observation with TTL."""
        table = self.resource.Table(self.aqi_table_name)
        now_epoch = int(time.time())
        ttl_epoch = now_epoch + (ttl_hours * 3600)

        item = {
            "station_id": station_id,
            "timestamp": timestamp_iso,
            "lat": Decimal(str(round(lat, 5))),
            "lng": Decimal(str(round(lng, 5))),
            "pm25": Decimal(str(round(pm25, 2))),
            "source": source,
            "snapshot_id": snapshot_id,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
            "ttl_epoch": ttl_epoch
        }

        try:
            table.put_item(Item=item)
            return True
        except ClientError as e:
            logger.error(f"Failed to put AQI reading for {station_id}: {e}")
            return False

    def get_latest_station_readings(self, max_age_hours: float = 3.0) -> list[dict[str, Any]]:
        """Scan or query latest fresh AQI station readings."""
        table = self.resource.Table(self.aqi_table_name)
        try:
            resp = table.scan()
            items = resp.get("Items", [])
            return _convert_decimals_to_floats(items)
        except ClientError as e:
            logger.error(f"Failed to scan AQI table: {e}")
            return []

    # ----------------------------------------------------
    # TRIPS TABLE
    # ----------------------------------------------------
    def save_trip(self, trip_data: dict[str, Any]) -> bool:
        """Save structured trip decision audit record."""
        table = self.resource.Table(self.trips_table_name)
        item = _convert_floats_to_decimals(trip_data)
        if "created_at" not in item:
            item["created_at"] = datetime.now(timezone.utc).isoformat()

        try:
            table.put_item(Item=item)
            return True
        except ClientError as e:
            logger.error(f"Failed to save trip {trip_data.get('trip_id')}: {e}")
            return False

    def get_trip(self, trip_id: str) -> Optional[dict[str, Any]]:
        """Retrieve trip decision record by ID."""
        table = self.resource.Table(self.trips_table_name)
        try:
            resp = table.get_item(Key={"trip_id": trip_id})
            item = resp.get("Item")
            if item:
                return _convert_decimals_to_floats(item)
            return None
        except ClientError as e:
            logger.error(f"Failed to get trip {trip_id}: {e}")
            return None

    def update_trip_choice(self, trip_id: str, choice: str) -> bool:
        """Update trip record with worker choice (safer vs fastest)."""
        table = self.resource.Table(self.trips_table_name)
        try:
            table.update_item(
                Key={"trip_id": trip_id},
                UpdateExpression="SET chosen_action = :c, chosen_at = :t",
                ExpressionAttributeValues={
                    ":c": choice,
                    ":t": datetime.now(timezone.utc).isoformat()
                }
            )
            return True
        except ClientError as e:
            logger.error(f"Failed to update choice for trip {trip_id}: {e}")
            return False

    # ----------------------------------------------------
    # REWARDS TABLE (Idempotent)
    # ----------------------------------------------------
    def credit_reward_idempotent(
        self,
        worker_id: str,
        trip_id: str,
        amount_inr: int,
        reward_type: str = "reward",
        simulated: bool = True
    ) -> tuple[bool, str]:
        """
        Credit simulated reward with conditional write to guarantee strict idempotency.
        Returns (success, status_code):
        - (True, "CREDITED"): New reward successfully granted.
        - (True, "ALREADY_PROCESSED"): Reward was already credited previously (no duplicate).
        - (False, "ERROR"): DB failure.
        """
        table = self.resource.Table(self.rewards_table_name)
        item = {
            "worker_id": worker_id,
            "trip_id": trip_id,
            "amount_inr": amount_inr,
            "type": reward_type,
            "simulated": simulated,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(worker_id) AND attribute_not_exists(trip_id)"
            )
            return True, "CREDITED"
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.info(f"Reward already credited for worker={worker_id}, trip={trip_id}. Skipping duplicate.")
                return True, "ALREADY_PROCESSED"
            logger.error(f"Failed to credit reward for trip {trip_id}: {e}")
            return False, "ERROR"

    def get_wallet_summary(self, worker_id: str) -> dict[str, Any]:
        """Query all rewards for worker and compute simulated balance."""
        table = self.resource.Table(self.rewards_table_name)
        try:
            resp = table.query(
                KeyConditionExpression="worker_id = :wid",
                ExpressionAttributeValues={":wid": worker_id}
            )
            items = _convert_decimals_to_floats(resp.get("Items", []))

            total_balance = sum(r.get("amount_inr", 0) for r in items)
            reward_cnt = sum(1 for r in items if r.get("type") == "reward")
            benefit_cnt = sum(1 for r in items if r.get("type") == "benefit")

            return {
                "worker_id": worker_id,
                "balance_inr": int(total_balance),
                "trip_count": len(items),
                "reward_count": reward_cnt,
                "benefit_count": benefit_cnt,
                "simulated": True
            }
        except ClientError as e:
            logger.error(f"Failed to query wallet for worker {worker_id}: {e}")
            return {
                "worker_id": worker_id,
                "balance_inr": 0,
                "trip_count": 0,
                "reward_count": 0,
                "benefit_count": 0,
                "simulated": True
            }
