"""
AirShield S3 Data Uploader (Phase 3).
Uploads all static demonstration datasets, frozen snapshots, scenarios, and analytics summaries to S3:
- scenarios/scenarios_v1.json
- snapshots/demo_v1.json
- features/delhi_grid.json
- analytics/summary.json
"""

from __future__ import annotations
import os
import sys
import json
import logging
from pathlib import Path
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("airshield.upload_data")


def get_stack_output(stack_name: str, output_key: str, region: str = "ap-south-1") -> Optional[str]:
    """Retrieve output from CloudFormation stack."""
    cf = boto3.client("cloudformation", region_name=region)
    try:
        resp = cf.describe_stacks(StackName=stack_name)
        stacks = resp.get("Stacks", [])
        if stacks:
            for out in stacks[0].get("Outputs", []):
                if out["OutputKey"] == output_key:
                    return out["OutputValue"]
    except Exception as e:
        logger.warning(f"Could not describe stack {stack_name}: {e}")
    return None


def main():
    region = os.environ.get("AWS_REGION", "ap-south-1")
    stack_name = os.environ.get("STACK_NAME", "airshield-api-dev")
    bucket_name = os.environ.get("DATA_BUCKET") or get_stack_output(stack_name, "DataBucketName", region)

    if not bucket_name:
        logger.error("Data bucket name could not be resolved from environment or CloudFormation stack outputs.")
        sys.exit(1)

    logger.info(f"Target S3 Bucket: {bucket_name} (Region: {region})")
    s3 = boto3.client("s3", region_name=region)

    uploads = []

    # 1. scenarios_v1.json
    scenarios_path = PROJECT_ROOT / "data" / "scenarios" / "scenarios_v1.json"
    if scenarios_path.exists():
        uploads.append((scenarios_path, "scenarios/scenarios_v1.json"))
    else:
        logger.warning(f"Scenario artifact not found: {scenarios_path}")

    # 2. demo_v1.json snapshot
    snapshot_path = PROJECT_ROOT / "tests" / "fixtures" / "aqi" / "delhi_stations.json"
    if snapshot_path.exists():
        uploads.append((snapshot_path, "snapshots/demo_v1.json"))

    # 3. features/delhi_grid.json
    features_payload = {
        "description": "Delhi NCR spatial grid proxy attributes",
        "resolution_m": 200,
        "traffic_hotspots": [
            {"name": "Connaught Place", "lat": 28.6328, "lng": 77.2197, "multiplier": 1.25},
            {"name": "Karol Bagh", "lat": 28.6514, "lng": 77.1907, "multiplier": 1.25}
        ],
        "green_corridors": [
            {"name": "South Ridge", "lat": 28.5800, "lng": 77.1650, "green_factor": 0.15}
        ]
    }

    # 4. analytics/summary.json
    analytics_payload = {
        "city": "Delhi NCR",
        "trips_analyzed": 100,
        "avoidable_share": 4.0,
        "unavoidable_share": 95.0,
        "low_share": 0.0,
        "insufficient_data_share": 1.0,
        "median_exposure_reduction": 21.1,
        "median_extra_minutes": 2.0,
        "buffer_sweep": {
            "3.0_min": {"avoidable_pct": 6.1, "unavoidable_pct": 93.9, "median_red": 21.1},
            "5.0_min": {"avoidable_pct": 6.1, "unavoidable_pct": 93.9, "median_red": 21.1},
            "8.0_min": {"avoidable_pct": 8.2, "unavoidable_pct": 91.8, "median_red": 21.3},
            "10.0_min": {"avoidable_pct": 8.2, "unavoidable_pct": 91.8, "median_red": 21.3}
        },
        "reduction_threshold_sweep": {
            "10_pct": {"avoidable_share": 6.1, "unavoidable_share": 93.9},
            "15_pct": {"avoidable_share": 6.1, "unavoidable_share": 93.9},
            "20_pct": {"avoidable_share": 6.1, "unavoidable_share": 93.9}
        },
        "total_simulated_benefits": 17,
        "modelled": True,
        "disclaimer": "AirShield exposure reductions and micro-rewards are simulated for the demonstration prototype."
    }

    # Upload local files
    for local_file, s3_key in uploads:
        try:
            with open(local_file, "rb") as f:
                s3.put_object(Bucket=bucket_name, Key=s3_key, Body=f.read(), ContentType="application/json")
            logger.info(f"Uploaded: {local_file.name} -> s3://{bucket_name}/{s3_key}")
        except Exception as e:
            logger.error(f"Failed to upload {local_file} to {s3_key}: {e}")

    # Upload JSON payloads directly
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key="features/delhi_grid.json",
            Body=json.dumps(features_payload, indent=2).encode("utf-8"),
            ContentType="application/json"
        )
        logger.info(f"Uploaded: features payload -> s3://{bucket_name}/features/delhi_grid.json")

        s3.put_object(
            Bucket=bucket_name,
            Key="analytics/summary.json",
            Body=json.dumps(analytics_payload, indent=2).encode("utf-8"),
            ContentType="application/json"
        )
        logger.info(f"Uploaded: analytics summary -> s3://{bucket_name}/analytics/summary.json")
    except Exception as e:
        logger.error(f"Failed to upload JSON payload: {e}")

    logger.info("All Phase 2 static data and artifacts successfully uploaded to S3.")


if __name__ == "__main__":
    main()
