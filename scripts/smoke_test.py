"""
AirShield End-to-End Post-Deployment Smoke Test (Phase 3).
Executes a full integration verification against the live deployed API Gateway HTTP API:
1. GET /health
2. POST /recommend (Scenario A: Hauz Khas -> Karol Bagh)
3. POST /trips/{trip_id}/choice (Choice = safer -> +₹3)
4. POST /trips/{trip_id}/choice (Duplicate check -> Idempotent, no extra reward)
5. GET /wallet/{worker_id}
6. POST /recommend (Scenario B: Karol Bagh -> Lajpat Nagar)
7. GET /analytics/summary
"""

from __future__ import annotations
import os
import sys
import json
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Optional
import boto3
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()

from backend.core.config import DEFAULT_CONFIG


def get_stack_api_url(stack_name: str = "airshield-api-dev", region: str = "ap-south-1") -> Optional[str]:
    """Retrieve API Gateway URL from CloudFormation stack outputs."""
    cf = boto3.client("cloudformation", region_name=region)
    try:
        resp = cf.describe_stacks(StackName=stack_name)
        stacks = resp.get("Stacks", [])
        if stacks:
            for out in stacks[0].get("Outputs", []):
                if out["OutputKey"] == "ApiUrl":
                    return out["OutputValue"].rstrip("/")
    except Exception as e:
        print(f"Notice: Could not resolve ApiUrl from CloudFormation: {e}")
    return None


def http_request(url: str, method: str = "GET", data: Optional[dict] = None) -> tuple[int, dict[str, Any]]:
    """Execute HTTP request using standard urllib."""
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    body_bytes = json.dumps(data).encode("utf-8") if data is not None else None

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            raw_body = resp.read().decode("utf-8")
            return status, json.loads(raw_body)
    except urllib.error.HTTPError as e:
        raw_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw_body)
        except Exception:
            return e.code, {"raw_error": raw_body}
    except Exception as e:
        return 500, {"error": str(e)}


def run_smoke_test(api_base_url: str) -> bool:
    print("\n" + "=" * 65)
    print("AIRSHIELD DEPLOYED API SMOKE TEST")
    print(f"Target API Base: {api_base_url}")
    print("=" * 65)

    tests = []

    # ----------------------------------------------------
    # 1. GET /health
    # ----------------------------------------------------
    print("\n[1/7] Testing GET /health...")
    status, res = http_request(f"{api_base_url}/health", method="GET")
    passed = (status == 200 and res.get("status") == "ok")
    tests.append(("GET /health", passed, f"Status: {status}, Body: {res}"))
    print(f"  Result: {'[PASS]' if passed else '[FAIL]'}")

    # ----------------------------------------------------
    # 2. POST /recommend (Scenario A)
    # ----------------------------------------------------
    print("\n[2/7] Testing POST /recommend (Scenario A: Hauz Khas -> Karol Bagh)...")
    payload_a = {
        "pickup": {"lat": 28.5474, "lng": 77.1959},
        "drop": {"lat": 28.6515, "lng": 77.1911},
        "buffer_min": 5.0,
        "worker_id": "smoke-worker-001",
        "mode": "snapshot",
        "snapshot_id": "demo_v1"
    }
    status, res_a = http_request(f"{api_base_url}/recommend", method="POST", data=payload_a)
    trip_a_id = res_a.get("trip_id")
    clf_a = res_a.get("classification")
    red_a = res_a.get("recommendation", {}).get("exposure_reduction_percent", 0.0)
    reward_eligible = res_a.get("recommendation", {}).get("reward_eligible", False)

    passed_a = (status == 200 and clf_a == "AVOIDABLE" and red_a >= 15.0 and reward_eligible is True)
    tests.append(("POST /recommend (Scenario A -> AVOIDABLE)", passed_a, f"Trip: {trip_a_id}, Red: {red_a}%, Eligible: {reward_eligible}"))
    print(f"  Result: {'[PASS]' if passed_a else '[FAIL]'} (Trip ID: {trip_a_id}, Classification: {clf_a}, Reduction: {red_a}%)")

    # ----------------------------------------------------
    # 3. POST /trips/{trip_id}/choice (Select Safer Route)
    # ----------------------------------------------------
    print(f"\n[3/7] Testing POST /trips/{trip_a_id}/choice (Choice = 'safer')...")
    status, res_choice = http_request(f"{api_base_url}/trips/{trip_a_id}/choice", method="POST", data={"choice": "safer"})
    reward_status = res_choice.get("reward_status")
    credited = res_choice.get("credited_amount_inr")
    passed_choice = (status == 200 and reward_status == "CREDITED" and credited == 3)
    tests.append(("POST /trips/{trip_id}/choice (First -> +INR 3)", passed_choice, f"Reward Status: {reward_status}, Credited: INR {credited}"))
    print(f"  Result: {'[PASS]' if passed_choice else '[FAIL]'} (Status: {reward_status}, Credited: INR {credited})")

    # ----------------------------------------------------
    # 4. POST /trips/{trip_id}/choice (Idempotency Check)
    # ----------------------------------------------------
    print(f"\n[4/7] Testing Duplicate POST /trips/{trip_a_id}/choice (Idempotency)...")
    status, res_dup = http_request(f"{api_base_url}/trips/{trip_a_id}/choice", method="POST", data={"choice": "safer"})
    dup_status = res_dup.get("reward_status")
    dup_credited = res_dup.get("credited_amount_inr")
    passed_dup = (status == 200 and dup_status == "ALREADY_PROCESSED" and dup_credited == 0)
    tests.append(("POST /trips/{trip_id}/choice (Duplicate -> No Extra INR)", passed_dup, f"Status: {dup_status}, Extra: INR {dup_credited}"))
    print(f"  Result: {'[PASS]' if passed_dup else '[FAIL]'} (Status: {dup_status}, Extra: INR {dup_credited})")

    # ----------------------------------------------------
    # 5. GET /wallet/{worker_id}
    # ----------------------------------------------------
    print(f"\n[5/7] Testing GET /wallet/smoke-worker-001...")
    status, res_wallet = http_request(f"{api_base_url}/wallet/smoke-worker-001", method="GET")
    balance = res_wallet.get("balance_inr", 0)
    passed_wallet = (status == 200 and balance >= 3)
    tests.append(("GET /wallet/{worker_id}", passed_wallet, f"Balance: INR {balance}"))
    print(f"  Result: {'[PASS]' if passed_wallet else '[FAIL]'} (Simulated Balance: INR {balance})")

    # ----------------------------------------------------
    # 6. POST /recommend (Scenario B)
    # ----------------------------------------------------
    print("\n[6/7] Testing POST /recommend (Scenario B: Karol Bagh -> Lajpat Nagar)...")
    payload_b = {
        "pickup": {"lat": 28.6508, "lng": 77.1899},
        "drop": {"lat": 28.5688, "lng": 77.2424},
        "buffer_min": 5.0,
        "worker_id": "smoke-worker-002",
        "mode": "snapshot",
        "snapshot_id": "demo_v1"
    }
    status, res_b = http_request(f"{api_base_url}/recommend", method="POST", data=payload_b)
    clf_b = res_b.get("classification")
    benefit_eligible = res_b.get("benefit", {}).get("eligible", False)
    passed_b = (status == 200 and clf_b == "UNAVOIDABLE" and benefit_eligible is True)
    tests.append(("POST /recommend (Scenario B -> UNAVOIDABLE)", passed_b, f"Classification: {clf_b}, Benefit Eligible: {benefit_eligible}"))
    print(f"  Result: {'[PASS]' if passed_b else '[FAIL]'} (Classification: {clf_b}, Protection Benefit: {benefit_eligible})")

    # ----------------------------------------------------
    # 7. GET /analytics/summary
    # ----------------------------------------------------
    print("\n[7/7] Testing GET /analytics/summary...")
    status, res_analytics = http_request(f"{api_base_url}/analytics/summary", method="GET")
    modelled = res_analytics.get("modelled", False)
    passed_analytics = (status == 200 and modelled is True)
    tests.append(("GET /analytics/summary", passed_analytics, f"Modelled: {modelled}"))
    print(f"  Result: {'[PASS]' if passed_analytics else '[FAIL]'} (Modelled Summary: {modelled})")

    print("\n" + "=" * 65)
    print("SMOKE TEST SUMMARY REPORT")
    print("=" * 65)
    all_passed = True
    for name, ok, detail in tests:
        mark = "[PASS]" if ok else "[FAIL]"
        print(f"  {mark:<8} {name:<45} | {detail}")
        if not ok:
            all_passed = False

    print("=" * 65)
    if all_passed:
        print("\n[SUCCESS] All 7 live AWS backend smoke tests PASSED perfectly!\n")
        return True
    else:
        print("\n[FAIL] Some live AWS backend smoke tests failed.\n")
        return False


def main():
    parser = argparse.ArgumentParser(description="AirShield Smoke Test")
    parser.add_argument("--api-url", type=str, default=None, help="Base API Gateway HTTP URL")
    args = parser.parse_args()

    api_url = args.api_url or os.environ.get("API_URL") or get_stack_api_url()
    if not api_url:
        print("Error: Could not resolve API URL. Pass --api-url or set API_URL environment variable.")
        sys.exit(1)

    success = run_smoke_test(api_url.rstrip("/"))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
