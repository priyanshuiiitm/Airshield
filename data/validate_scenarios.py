"""
AirShield Scenario Validator (Phase 2).
Validates that data/scenarios/scenarios_v1.json meets all strict criteria:
1. Scenario A classification == AVOIDABLE
2. Scenario A reduction >= configured threshold (15%)
3. Scenario A selected route within operational buffer (<= 5.0 min extra)
4. Scenario A robustness == True
5. Scenario A confidence != LOW
6. Scenario B classification == UNAVOIDABLE
7. Scenario B safer route outside buffer exists (>= 15% reduction, > buffer extra time)
8. Scenario B confidence != LOW
9. Required metadata and replay properties exist

Exit code 0 on success, non-zero on validation failure.
"""

from __future__ import annotations
import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
SCENARIO_FILE = PROJECT_ROOT / "data" / "scenarios" / "scenarios_v1.json"


def validate_scenarios(file_path: Path = SCENARIO_FILE) -> bool:
    print("=" * 60)
    print("VALIDATING AIRSHIELD SCENARIO ARTIFACT")
    print(f"File: {file_path}")
    print("=" * 60)

    if not file_path.exists():
        print(f"[FAIL] Scenario file not found: {file_path}")
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"[FAIL] Invalid JSON format: {e}")
            return False

    errors = []

    # 1. Root metadata checks
    required_root_keys = ["version", "city", "created_at", "random_seed", "snapshot_id", "config", "scenario_a", "scenario_b"]
    for k in required_root_keys:
        if k not in data or data[k] is None:
            errors.append(f"Missing root key or null value: '{k}'")

    if errors:
        for err in errors:
            print(f"  [ERROR] {err}")
        return False

    config = data.get("config", {})
    buf_min = config.get("buffer_minutes", 5.0)
    red_thresh = config.get("reduction_threshold", 0.15)
    red_thresh_pct = red_thresh * 100.0

    # 2. Validate Scenario A
    sc_a = data.get("scenario_a", {})
    print("\n--- Validating Scenario A (AVOIDABLE) ---")
    if sc_a.get("classification") != "AVOIDABLE":
        errors.append(f"Scenario A classification must be 'AVOIDABLE', got '{sc_a.get('classification')}'")
    else:
        print("  [PASS] Classification: AVOIDABLE")

    if sc_a.get("reduction_percent", 0.0) < red_thresh_pct - 0.01:
        errors.append(f"Scenario A reduction ({sc_a.get('reduction_percent')}%) < threshold ({red_thresh_pct}%)")
    else:
        print(f"  [PASS] Reduction: {sc_a.get('reduction_percent')}% (>= {red_thresh_pct}%)")

    if sc_a.get("additional_time_min", 999.0) > buf_min + 0.01:
        errors.append(f"Scenario A additional time ({sc_a.get('additional_time_min')}m) > buffer ({buf_min}m)")
    else:
        print(f"  [PASS] Extra Duration: +{sc_a.get('additional_time_min')}m (<= {buf_min}m buffer)")

    if not sc_a.get("is_robust", False):
        errors.append("Scenario A is not robust across model sensitivity perturbations")
    else:
        print("  [PASS] Robustness: YES")

    if sc_a.get("confidence") in ["LOW", None]:
        errors.append(f"Scenario A confidence insufficient: {sc_a.get('confidence')}")
    else:
        print(f"  [PASS] Spatial Confidence: {sc_a.get('confidence')}")

    if not sc_a.get("candidate_routes") or len(sc_a.get("candidate_routes", [])) < 2:
        errors.append("Scenario A must include at least 2 candidate routes with full replay data")
    else:
        print(f"  [PASS] Candidate Routes: {len(sc_a['candidate_routes'])} routes stored with geometries")

    # 3. Validate Scenario B
    sc_b = data.get("scenario_b", {})
    print("\n--- Validating Scenario B (UNAVOIDABLE) ---")
    if sc_b.get("classification") != "UNAVOIDABLE":
        errors.append(f"Scenario B classification must be 'UNAVOIDABLE', got '{sc_b.get('classification')}'")
    else:
        print("  [PASS] Classification: UNAVOIDABLE")

    if not sc_b.get("better_outside_buffer", False):
        errors.append("Scenario B must have a cleaner route existing outside buffer")
    else:
        print(f"  [PASS] Cleaner Route Outside Buffer Exists: YES (+{sc_b.get('extra_minutes_needed')}m needed)")

    if sc_b.get("outside_buffer_reduction_percent", 0.0) < red_thresh_pct - 0.01:
        errors.append(f"Scenario B outside-buffer reduction ({sc_b.get('outside_buffer_reduction_percent')}%) < threshold ({red_thresh_pct}%)")
    else:
        print(f"  [PASS] Outside-Buffer Reduction: {sc_b.get('outside_buffer_reduction_percent')}% (>= {red_thresh_pct}%)")

    if sc_b.get("extra_minutes_needed", 0.0) <= buf_min:
        errors.append(f"Scenario B outside cleaner route time ({sc_b.get('extra_minutes_needed')}m) must exceed buffer ({buf_min}m)")
    else:
        print(f"  [PASS] Outside Route Exceeds Buffer: +{sc_b.get('extra_minutes_needed')}m > +{buf_min}m")

    if sc_b.get("confidence") in ["LOW", None]:
        errors.append(f"Scenario B confidence insufficient: {sc_b.get('confidence')}")
    else:
        print(f"  [PASS] Spatial Confidence: {sc_b.get('confidence')}")

    if not sc_b.get("candidate_routes") or len(sc_b.get("candidate_routes", [])) < 2:
        errors.append("Scenario B must include at least 2 candidate routes with full replay data")
    else:
        print(f"  [PASS] Candidate Routes: {len(sc_b['candidate_routes'])} routes stored with geometries")

    print("\n" + "=" * 60)
    if errors:
        print(f"[FAIL] Validation FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        print("=" * 60 + "\n")
        return False
    else:
        print("[SUCCESS] All Scenario A and Scenario B validation criteria PASSED!")
        print("=" * 60 + "\n")
        return True


if __name__ == "__main__":
    success = validate_scenarios()
    sys.exit(0 if success else 1)
