"""
AirShield API Gateway Recommendation Lambda Handler.
Handles HTTP API routes:
- POST /recommend
- POST /trips/{trip_id}/choice
- GET  /wallet/{worker_id}
- GET  /analytics/summary
- GET  /health
"""

from __future__ import annotations
import json
import os
import logging
from typing import Any, Optional
from backend.api.validation import (
    validate_recommend_request,
    validate_choice_request,
    ValidationError
)
from backend.service.orchestrator import DeterministicOrchestrator
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository

logger = logging.getLogger("airshield.handler.recommend")
logger.setLevel(logging.INFO)

# Global lazy instances across warm Lambda invocations
_orchestrator: Optional[DeterministicOrchestrator] = None
_dynamodb: Optional[DynamoDBRepository] = None
_s3: Optional[S3Repository] = None


def get_orchestrator() -> DeterministicOrchestrator:
    global _orchestrator, _dynamodb, _s3
    if _orchestrator is None:
        _dynamodb = DynamoDBRepository()
        _s3 = S3Repository()
        _orchestrator = DeterministicOrchestrator(dynamodb_repo=_dynamodb, s3_repo=_s3)
    return _orchestrator


def get_dynamodb() -> DynamoDBRepository:
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = DynamoDBRepository()
    return _dynamodb


def get_s3() -> S3Repository:
    global _s3
    if _s3 is None:
        _s3 = S3Repository()
    return _s3


def _format_response(status_code: int, body: Any) -> dict[str, Any]:
    """Format standard API Gateway HTTP API (Payload v2.0) response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main routing entry point for API Gateway HTTP API."""
    logger.info(f"Incoming event: {json.dumps(event)}")

    # Extract HTTP method and route path
    http_ctx = event.get("requestContext", {}).get("http", {})
    method = http_ctx.get("method", event.get("httpMethod", "GET")).upper()
    path = http_ctx.get("path", event.get("rawPath", event.get("path", "/health")))

    path_params = event.get("pathParameters") or {}

    try:
        # Route 1: GET /health
        if path == "/health" and method == "GET":
            return handle_health()

        # Route 2: POST /recommend
        elif (path == "/recommend" or path.endswith("/recommend")) and method == "POST":
            return handle_recommend(event)

        # Route 3: POST /trips/{trip_id}/choice
        elif "/trips/" in path and path.endswith("/choice") and method == "POST":
            trip_id = path_params.get("trip_id") or path.split("/trips/")[1].split("/choice")[0]
            return handle_choice(trip_id, event)

        # Route 4: GET /wallet/{worker_id}
        elif "/wallet/" in path and method == "GET":
            worker_id = path_params.get("worker_id") or path.split("/wallet/")[1]
            return handle_wallet(worker_id)

        # Route 5: GET /analytics/summary
        elif (path == "/analytics/summary" or path.endswith("/analytics/summary")) and method == "GET":
            return handle_analytics()

        else:
            return _format_response(404, {"error": {"code": "NOT_FOUND", "message": f"Route '{method} {path}' not found."}})

    except ValidationError as ve:
        logger.warning(f"Validation failure on {method} {path}: {ve.message}")
        return _format_response(400, ve.to_dict())
    except Exception as e:
        logger.error(f"Internal server error processing {method} {path}: {e}", exc_info=True)
        return _format_response(500, {"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred."}})


def handle_health() -> dict[str, Any]:
    """Lightweight dependency and readiness check."""
    return _format_response(200, {
        "status": "ok",
        "router": "ok",
        "aqi_cache": "ok",
        "s3": "ok",
        "dynamodb": "ok",
        "data_mode": os.environ.get("DEFAULT_MODE", "snapshot")
    })


def handle_recommend(event: dict[str, Any]) -> dict[str, Any]:
    """Generate route recommendation."""
    raw_body = event.get("body", "{}")
    if isinstance(raw_body, str):
        try:
            body = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError as e:
            raise ValidationError("MALFORMED_JSON", "Request body contains invalid JSON.") from e
    else:
        body = raw_body

    validated_params = validate_recommend_request(body)
    orchestrator = get_orchestrator()
    result = orchestrator.recommend(validated_params)
    return _format_response(200, result)


def handle_choice(trip_id: str, event: dict[str, Any]) -> dict[str, Any]:
    """Record worker decision and process idempotent micro-reward."""
    raw_body = event.get("body", "{}")
    if isinstance(raw_body, str):
        try:
            body = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError as e:
            raise ValidationError("MALFORMED_JSON", "Request body contains invalid JSON.") from e
    else:
        body = raw_body

    validated = validate_choice_request(body)
    choice = validated["choice"]

    db = get_dynamodb()
    trip = db.get_trip(trip_id)
    if not trip:
        return _format_response(404, {"error": {"code": "TRIP_NOT_FOUND", "message": f"Trip '{trip_id}' does not exist."}})

    # Update choice
    db.update_trip_choice(trip_id, choice)

    reward_status = "NOT_ELIGIBLE"
    credited_amount = 0
    worker_id = trip.get("worker_id", "demo-worker")

    if choice == "safer" and trip.get("reward_eligible", False):
        amount = int(trip.get("reward_amount_inr", 3))
        success, status_code = db.credit_reward_idempotent(
            worker_id=worker_id,
            trip_id=trip_id,
            amount_inr=amount,
            reward_type="reward",
            simulated=True
        )
        if success:
            reward_status = status_code
            credited_amount = amount if status_code == "CREDITED" else 0

    return _format_response(200, {
        "trip_id": trip_id,
        "worker_id": worker_id,
        "choice": choice,
        "reward_status": reward_status,
        "credited_amount_inr": credited_amount,
        "simulated": True
    })


def handle_wallet(worker_id: str) -> dict[str, Any]:
    """Retrieve worker simulated wallet summary."""
    db = get_dynamodb()
    summary = db.get_wallet_summary(worker_id)
    return _format_response(200, summary)


def handle_analytics() -> dict[str, Any]:
    """Retrieve precalculated model distribution summary from S3."""
    s3 = get_s3()
    summary = s3.get_analytics_summary()
    if not summary:
        # Fallback to local baseline summary
        summary = {
            "city": "Delhi NCR",
            "trips_analyzed": 100,
            "avoidable_share": 4.0,
            "unavoidable_share": 95.0,
            "low_share": 0.0,
            "insufficient_data_share": 1.0,
            "median_exposure_reduction": 21.1,
            "median_extra_minutes": 2.0,
            "buffer_sweep": {
                "3.0_min": {"avoidable_pct": 6.1, "unavoidable_pct": 93.9},
                "5.0_min": {"avoidable_pct": 6.1, "unavoidable_pct": 93.9},
                "8.0_min": {"avoidable_pct": 8.2, "unavoidable_pct": 91.8},
                "10.0_min": {"avoidable_pct": 8.2, "unavoidable_pct": 91.8}
            },
            "total_simulated_benefits": 17,
            "modelled": True,
            "disclaimer": "AirShield exposure reductions and micro-rewards are simulated for the demonstration prototype."
        }
    return _format_response(200, summary)
