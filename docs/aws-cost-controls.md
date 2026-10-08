# AirShield AWS Cost Controls & Resource Budgets (Phase 3)

AirShield follows a strict zero-idle-cost serverless architecture for the hackathon demonstration.

---

## 1. Cost Control Posture

| Resource | Architecture Decision | Monthly Idle Cost |
|---|---|---|
| **API Gateway** | HTTP API (Payload v2.0) instead of REST API | $0.00 (Pay per request) |
| **Lambda** | 512 MB memory, 29s timeout, standard runtime | $0.00 (within Free Tier) |
| **DynamoDB** | `PAY_PER_REQUEST` (On-Demand) across all 3 tables | $0.00 |
| **Amazon S3** | Single private bucket with prefix structure | < $0.05 |
| **EventBridge** | Scheduler invoking at `rate(20 minutes)` | $0.00 (72 invocations/day) |
| **NAT Gateway** | **NOT USED** (Lambdas run directly in AWS serverless environment) | $0.00 saved ($32/month saved) |
| **EC2 / RDS** | **NOT USED** | $0.00 |

---

## 2. Resource Retention & TTL Policies

- **DynamoDB `aqi_readings`**: `ttl_epoch` configured to expire and automatically purge station readings after 48 hours.
- **S3 Raw Responses**: Prefix `raw/aqi/` uses standard infrequent access / short lifecycle.
- **Zero Polling**: Background ingestion runs only once every 20 minutes (72 requests/day), well within the OpenAQ rate limits and AWS Free Tier.
