"""
Unit tests for API input validation (backend/api/validation.py).
Covers all 17 required criteria from Section 34:
1. missing pickup
2. missing drop
3. invalid latitude
4. invalid longitude
5. NaN coordinate
6. infinity coordinate
7. outside Delhi NCR
8. buffer < 0
9. buffer > 15
10. invalid language
11. invalid mode
12. malformed JSON
13. missing body
14. very long worker ID
15. valid minimal request
16. valid snapshot request
17. valid live request
"""

import pytest
from backend.api.validation import (
    validate_recommend_request,
    validate_choice_request,
    ValidationError
)


def test_1_missing_pickup():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({"drop": {"lat": 28.60, "lng": 77.20}})
    assert exc.value.code == "MISSING_PICKUP"


def test_2_missing_drop():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({"pickup": {"lat": 28.60, "lng": 77.20}})
    assert exc.value.code == "MISSING_DROP"


def test_3_invalid_latitude():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 120.0, "lng": 77.20},
            "drop": {"lat": 28.60, "lng": 77.20}
        }, check_delhi_bounds=False)
    assert exc.value.code == "LATITUDE_OUT_OF_RANGE"


def test_4_invalid_longitude():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 28.60, "lng": 250.0},
            "drop": {"lat": 28.60, "lng": 77.20}
        }, check_delhi_bounds=False)
    assert exc.value.code == "LONGITUDE_OUT_OF_RANGE"


def test_5_nan_coordinate():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": float("nan"), "lng": 77.20},
            "drop": {"lat": 28.60, "lng": 77.20}
        })
    assert exc.value.code == "INVALID_COORDINATE_VALUE"


def test_6_infinity_coordinate():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": float("inf"), "lng": 77.20},
            "drop": {"lat": 28.60, "lng": 77.20}
        })
    assert exc.value.code == "INVALID_COORDINATE_VALUE"


def test_7_outside_delhi_ncr():
    # Mumbai coordinates
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 19.0760, "lng": 72.8777},
            "drop": {"lat": 19.1000, "lng": 72.9000}
        }, check_delhi_bounds=True)
    assert exc.value.code == "OUTSIDE_DELHI_NCR"


def test_8_buffer_below_zero():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 28.60, "lng": 77.20},
            "drop": {"lat": 28.65, "lng": 77.25},
            "buffer_min": -1.0
        })
    assert exc.value.code == "INVALID_BUFFER"


def test_9_buffer_above_fifteen():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 28.60, "lng": 77.20},
            "drop": {"lat": 28.65, "lng": 77.25},
            "buffer_min": 25.0
        })
    assert exc.value.code == "INVALID_BUFFER"


def test_10_invalid_language():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 28.60, "lng": 77.20},
            "drop": {"lat": 28.65, "lng": 77.25},
            "language": "fr"
        })
    assert exc.value.code == "INVALID_LANGUAGE"


def test_11_invalid_mode():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 28.60, "lng": 77.20},
            "drop": {"lat": 28.65, "lng": 77.25},
            "mode": "invalid_mode"
        })
    assert exc.value.code == "INVALID_MODE"


def test_12_malformed_json_body():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request("not a dictionary")
    assert exc.value.code == "INVALID_BODY"


def test_13_missing_body():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request(None)
    assert exc.value.code == "INVALID_BODY"


def test_14_very_long_worker_id():
    with pytest.raises(ValidationError) as exc:
        validate_recommend_request({
            "pickup": {"lat": 28.60, "lng": 77.20},
            "drop": {"lat": 28.65, "lng": 77.25},
            "worker_id": "a" * 100
        })
    assert exc.value.code == "INVALID_WORKER_ID"


def test_15_valid_minimal_request():
    req = {
        "pickup": {"lat": 28.60, "lng": 77.20},
        "drop": {"lat": 28.65, "lng": 77.25}
    }
    res = validate_recommend_request(req)
    assert res["pickup"].lat == 28.60
    assert res["drop"].lat == 28.65
    assert res["buffer_min"] == 5.0
    assert res["mode"] == "snapshot"
    assert res["language"] == "en"


def test_16_valid_snapshot_request():
    req = {
        "pickup": {"lat": 28.5474, "lng": 77.1959},
        "drop": {"lat": 28.6515, "lng": 77.1911},
        "buffer_min": 4.5,
        "mode": "snapshot",
        "snapshot_id": "demo_v1",
        "language": "hi",
        "worker_id": "test-worker"
    }
    res = validate_recommend_request(req)
    assert res["snapshot_id"] == "demo_v1"
    assert res["language"] == "hi"
    assert res["worker_id"] == "test-worker"


def test_17_valid_live_request():
    req = {
        "pickup": {"lat": 28.60, "lng": 77.20},
        "drop": {"lat": 28.65, "lng": 77.25},
        "mode": "live"
    }
    res = validate_recommend_request(req)
    assert res["mode"] == "live"
