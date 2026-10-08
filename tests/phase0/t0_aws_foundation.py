import boto3
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def check_aws_credentials():
    print("Checking AWS credentials...")
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print(f"[OK] Authenticated as: {identity['Arn']}")
        return True
    except Exception as e:
        print(f"[FAIL] AWS credentials error: {e}")
        return False

def check_service(service_name, test_func):
    print(f"Checking {service_name}...")
    try:
        test_func()
        print(f"[OK] {service_name} is accessible")
        return True
    except Exception as e:
        print(f"[FAIL] {service_name} error: {e}")
        return False

def test_s3():
    s3 = boto3.client('s3')
    s3.list_buckets()

def test_dynamodb():
    dynamodb = boto3.client('dynamodb')
    dynamodb.list_tables()

def test_bedrock():
    bedrock = boto3.client('bedrock')
    bedrock.list_foundation_models()

def test_location():
    location = boto3.client('location')
    # We don't have a route calculator set up necessarily, but we can list them to check API access
    location.list_route_calculators()

def test_eventbridge():
    events = boto3.client('events')
    events.list_rules()

if __name__ == "__main__":
    print("Running T0: AWS Foundation Check\n")
    if not check_aws_credentials():
        print("Please configure AWS credentials using `aws configure` or environment variables.")
        sys.exit(1)
        
    services = [
        ("S3", test_s3),
        ("DynamoDB", test_dynamodb),
        ("Bedrock", test_bedrock),
        ("Amazon Location", test_location),
        ("EventBridge", test_eventbridge)
    ]
    
    all_passed = True
    for name, func in services:
        if not check_service(name, func):
            all_passed = False
            
    print("\n")
    if all_passed:
        print("[SUCCESS] TEST 0 PASSED: All foundational AWS services are accessible.")
        sys.exit(0)
    else:
        print("[FAIL] TEST 0 FAILED: One or more services are not accessible.")
        sys.exit(1)
