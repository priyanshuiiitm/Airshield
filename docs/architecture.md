# AirShield System Architecture (Phase 3)

AirShield is designed as a modular, serverless architecture that separates high-frequency client route queries from background air quality monitoring data ingestion.

```
                    React Frontend (Future Phase 5)
                                  │
                                  │ HTTPS (Payload v2.0)
                                  ▼
                    ┌───────────────────────────┐
                    │    API Gateway HTTP API   │
                    │       (Native CORS)       │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │     recommend Lambda      │
                    │   (Validation & Service)  │
                    └──────┬──────┬──────┬──────┘
                           │      │      │
            ┌──────────────┘      │      └──────────────┐
            ▼                     ▼                     ▼
     ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
     │  Amazon     │       │  Phase 1/2  │       │  DynamoDB   │
     │  Location   │       │  Pure Core  │       │  (Trips &   │
     │  Service    │       │  Engine     │       │   Rewards)  │
     └─────────────┘       └─────────────┘       └─────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │  Amazon S3  │
                           │  (Snapshots │
                           │  & Scenarios│
                           └─────────────┘

========================================================================
BACKGROUND INGESTION PIPELINE (Every 20 Minutes)
========================================================================

    ┌───────────────────────────┐
    │   EventBridge Scheduler   │  rate(20 minutes)
    └─────────────┬─────────────┘
                  │
                  ▼
    ┌───────────────────────────┐
    │     ingest_aqi Lambda     │
    └─────────────┬─────────────┘
                  │
                  ├──► Fetches OpenAQ API Key from AWS Secrets Manager
                  ├──► Queries OpenAQ PM2.5 monitoring stations (Delhi NCR)
                  │
                  ├──► DynamoDB `aqi_readings` (Normalized time-series with TTL)
                  └──► S3 `raw/aqi/YYYY-MM-DD/HHMM.json` (Raw immutable audit)
```

---

## Key Design Principles

1. **Pure Deterministic Separation**:
   The mathematical core (`exposure.py`, `optimize.py`, `classify.py`) executes independently of AWS infrastructure, ensuring 100% test reproducibility offline.
2. **Deterministic Fallback**:
   If live routing or OpenAQ APIs experience transient latency, the recommendation pipeline seamlessly utilizes deterministic snapshot caches without fabricating numbers.
3. **Idempotent Rewards**:
   DynamoDB conditional expressions guarantee that repeated trip submissions can never credit duplicate rewards.
4. **Least-Privilege Security**:
   Lambda functions have granular IAM policies restricted strictly to the required DynamoDB tables, S3 bucket prefixes, and Secrets Manager secret ARN.
