"""
AirShield API Input Validation.
Performs server-side validation on all incoming API Gateway requests.
Rejects malformed JSON, NaN/Infinity coordinates, out-of-bounds locations, and invalid parameters.
"""

from __future__ import annotations
import math
from typing import Any, Optional
from backend.core.config import DEFAULT_CONFIG
from backend.core.models import Coordinate

# Allowed values
ALLOWED_LANGUAGES = {"en", "hi"}
ALLOWED_MODES = {"snapshot", "live"}
ALLOWED_CHOICES = {"safer", "fastest"}


class ValidationError(Exception):
    """Raised when an API request fails validation."""
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message
            }
        }


def validate_coordinate(data: Any, field_name: str, check_delhi_bounds: bool = True) -> Coordinate:
    """Validate latitude and longitude dictionary."""
    if not isinstance(data, dict):
        raise ValidationError("INVALID_COORDINATE", f"'{field_name}' must be an object with 'lat' and 'lng'.")

    if "lat" not in data or "lng" not in data:
        raise ValidationError("MISSING_COORDINATE_FIELDS", f"'{field_name}' must contain both 'lat' and 'lng'.")

    lat_raw = data["lat"]
    lng_raw = data["lng"]

    try:
        lat = float(lat_raw)
        lng = float(lng_raw)
    except (TypeError, ValueError) as e:
        raise ValidationError("NON_NUMERIC_COORDINATE", f"Coordinates in '{field_name}' must be numbers.") from e

    if math.isnan(lat) or math.isinf(lat) or math.isnan(lng) or math.isinf(lng):
        raise ValidationError("INVALID_COORDINATE_VALUE", f"Coordinates in '{field_name}' cannot be NaN or Infinity.")

    if not (-90.0 <= lat <= 90.0):
        raise ValidationError("LATITUDE_OUT_OF_RANGE", f"Latitude in '{field_name}' must be between -90 and 90.")

    if not (-180.0 <= lng <= 180.0):
        raise ValidationError("LONGITUDE_OUT_OF_RANGE", f"Longitude in '{field_name}' must be between -180 and 180.")

    if check_delhi_bounds:
        if not (DEFAULT_CONFIG.DELHI_LAT_MIN <= lat <= DEFAULT_CONFIG.DELHI_LAT_MAX) or not (
            DEFAULT_CONFIG.DELHI_LNG_MIN <= lng <= DEFAULT_CONFIG.DELHI_LNG_MAX
        ):
            raise ValidationError(
                "OUTSIDE_DELHI_NCR",
                f"Coordinates in '{field_name}' ({lat}, {lng}) fall outside the configured Delhi NCR operating zone."
            )

    return Coordinate(lat=round(lat, 5), lng=round(lng, 5))


def validate_recommend_request(body: Any, check_delhi_bounds: bool = True) -> dict[str, Any]:
    """Validate POST /recommend request payload."""
    if not isinstance(body, dict):
        raise ValidationError("INVALID_BODY", "Request body must be a valid JSON object.")

    if "pickup" not in body:
        raise ValidationError("MISSING_PICKUP", "Field 'pickup' is required.")
    if "drop" not in body:
        raise ValidationError("MISSING_DROP", "Field 'drop' is required.")

    pickup = validate_coordinate(body["pickup"], "pickup", check_delhi_bounds=check_delhi_bounds)
    drop = validate_coordinate(body["drop"], "drop", check_delhi_bounds=check_delhi_bounds)

    if pickup == drop:
        raise ValidationError("ZERO_DISTANCE", "Pickup and drop locations cannot be identical.")

    # Validate buffer_min
    buffer_min = body.get("buffer_min", DEFAULT_CONFIG.DEFAULT_BUFFER_MIN)
    try:
        buffer_val = float(buffer_min)
    except (TypeError, ValueError) as e:
        raise ValidationError("INVALID_BUFFER", "buffer_min must be a numeric value.") from e

    if math.isnan(buffer_val) or math.isinf(buffer_val) or not (
        DEFAULT_CONFIG.MIN_BUFFER_MIN <= buffer_val <= DEFAULT_CONFIG.MAX_BUFFER_MIN
    ):
        raise ValidationError(
            "INVALID_BUFFER",
            f"buffer_min must be between {DEFAULT_CONFIG.MIN_BUFFER_MIN} and {DEFAULT_CONFIG.MAX_BUFFER_MIN} minutes."
        )

    # Validate language
    language = body.get("language", "en")
    if not isinstance(language, str) or language.lower() not in ALLOWED_LANGUAGES:
        raise ValidationError("INVALID_LANGUAGE", f"language must be one of: {sorted(ALLOWED_LANGUAGES)}")

    # Validate mode
    mode = body.get("mode", "snapshot")
    if not isinstance(mode, str) or mode.lower() not in ALLOWED_MODES:
        raise ValidationError("INVALID_MODE", f"mode must be one of: {sorted(ALLOWED_MODES)}")

    # Validate worker_id
    worker_id = body.get("worker_id", "demo-worker")
    if not isinstance(worker_id, str) or len(worker_id) > 64 or len(worker_id.strip()) == 0:
        raise ValidationError("INVALID_WORKER_ID", "worker_id must be a non-empty string under 64 characters.")

    # Validate snapshot_id
    snapshot_id = body.get("snapshot_id", "demo_v1")
    if not isinstance(snapshot_id, str) or len(snapshot_id) > 64 or len(snapshot_id.strip()) == 0:
        raise ValidationError("INVALID_SNAPSHOT_ID", "snapshot_id must be a non-empty string under 64 characters.")

    return {
        "pickup": pickup,
        "drop": drop,
        "buffer_min": buffer_val,
        "language": language.lower(),
        "mode": mode.lower(),
        "worker_id": worker_id.strip(),
        "snapshot_id": snapshot_id.strip()
    }


def validate_choice_request(body: Any) -> dict[str, str]:
    """Validate POST /trips/{trip_id}/choice payload."""
    if not isinstance(body, dict):
        raise ValidationError("INVALID_BODY", "Request body must be a valid JSON object.")

    choice = body.get("choice")
    if not isinstance(choice, str) or choice.lower() not in ALLOWED_CHOICES:
        raise ValidationError("INVALID_CHOICE", f"choice must be one of: {sorted(ALLOWED_CHOICES)}")

    return {"choice": choice.lower()}
