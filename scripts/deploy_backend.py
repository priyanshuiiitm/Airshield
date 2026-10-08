"""
AirShield Backend Automated Deployment Script (Phase 3).
Loads AWS credentials from .env, runs SAM build, validates, and deploys the CloudFormation stack.
"""

import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def main():
    print("=" * 60)
    print("AIRSHIELD AWS BACKEND DEPLOYMENT")
    print("=" * 60)

    region = os.environ.get("AWS_REGION", "ap-south-1")
    stack_name = os.environ.get("STACK_NAME", "airshield-api-dev")
    env = os.environ.get("ENVIRONMENT", "dev")
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173")

    env_vars = os.environ.copy()
    env_vars["AWS_DEFAULT_REGION"] = region
    env_vars["SAM_CLI_TELEMETRY"] = "0"

    print(f"\n1. Building SAM application...")
    build_cmd = ["sam", "build", "-t", "infra/template.yaml", "--region", region]
    res = subprocess.run(build_cmd, cwd=str(PROJECT_ROOT), env=env_vars)
    if res.returncode != 0:
        print("[FAIL] SAM build failed.")
        sys.exit(res.returncode)

    print(f"\n2. Deploying SAM stack '{stack_name}' to region '{region}'...")
    deploy_cmd = [
        "sam", "deploy",
        "--stack-name", stack_name,
        "--region", region,
        "--capabilities", "CAPABILITY_IAM", "CAPABILITY_NAMED_IAM",
        "--resolve-s3",
        "--no-confirm-changeset",
        "--parameter-overrides",
        f"Environment={env} AllowedOrigin={allowed_origin} DefaultBufferMinutes=5.0 SnapshotId=demo_v1 DefaultMode=snapshot"
    ]

    res_deploy = subprocess.run(deploy_cmd, cwd=str(PROJECT_ROOT), env=env_vars)
    if res_deploy.returncode != 0:
        print("[FAIL] SAM deploy failed.")
        sys.exit(res_deploy.returncode)

    print("\n[SUCCESS] CloudFormation stack deployed successfully!")


if __name__ == "__main__":
    main()
