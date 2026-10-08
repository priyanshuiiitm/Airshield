# AirShield AWS Data Model & Storage Architecture (Phase 3)

AirShield uses a dual persistence architecture combining **Amazon DynamoDB** (for low-latency operational data and idempotent micro-reward ledgers) and **Amazon S3** (for immutable raw responses, static spatial overlays, and batch scenario snapshots).

---

## 1. DynamoDB Tables

### Table 1: `aqi_readings`
Stores normalized, time-series PM2.5 monitoring observations across Delhi NCR.

- **Billing Mode**: `PAY_PER_REQUEST` (On-Demand)
- **Partition Key (PK)**: `station_id` (String) — Unique station code (e.g., `ST_CENTRAL_DELHI`)
- **Sort Key (SK)**: `timestamp` (String) — ISO 8601 observation timestamp (e.g., `2026-10-09T00:10:00Z`)
- **Time-to-Live (TTL)**: `ttl_epoch` (Unix timestamp, 48 hours retention)

#### Attributes:
| Attribute | Type | Description |
|---|---|---|
| `station_id` | `S` | Unique monitoring station identifier |
| `timestamp` | `S` | Observation timestamp in UTC ISO format |
| `lat` | `N` | Station latitude coordinate |
| `lng` | `N` | Station longitude coordinate |
| `pm25` | `N` | Validated PM2.5 reading in $\mu g/m^3$ |
| `source` | `S` | Data source (`openaq`, `cpcb`, `fixture`) |
| `snapshot_id`| `S` | Identifier (`live` or `demo_v1`) |
| `ingested_at`| `S` | Ingestion timestamp |
| `ttl_epoch` | `N` | TTL epoch expiration timestamp (48h) |

---

### Table 2: `trips`
Maintains immutable audit records for route comparison requests and worker decisions.

- **Billing Mode**: `PAY_PER_REQUEST`
- **Partition Key (PK)**: `trip_id` (String) — e.g., `trip_a1b2c3d4e5f6`

#### Attributes:
| Attribute | Type | Description |
|---|---|---|
| `trip_id` | `S` | Unique trip recommendation ID |
| `worker_id` | `S` | Anonymized delivery worker ID |
| `pickup_rounded` | `M` | Rounded lat/lng (3 decimals to preserve privacy) |
| `drop_rounded` | `M` | Rounded destination coordinates |
| `buffer_minutes` | `N` | Configured delivery allowance buffer |
| `classification` | `S` | Decision outcome (`AVOIDABLE`, `UNAVOIDABLE`, `LOW`, `INSUFFICIENT_DATA`) |
| `fastest_route_id` | `S` | Identifier of fastest arterial route |
| `selected_route_id` | `S` | Identifier of recommended route |
| `reduction_percent` | `N` | Percentage exposure reduction achieved |
| `reward_eligible` | `BOOL`| Whether trip qualifies for healthy route reward |
| `reward_amount_inr` | `N` | Micro-reward amount (default ₹3) |
| `chosen_action` | `S` | Worker decision (`safer` vs `fastest`) |
| `created_at` | `S` | Creation timestamp |

---

### Table 3: `rewards`
Idempotent ledger tracking credited simulated worker rewards and benefits.

- **Billing Mode**: `PAY_PER_REQUEST`
- **Partition Key (PK)**: `worker_id` (String) — e.g., `demo-worker-001`
- **Sort Key (SK)**: `trip_id` (String) — e.g., `trip_a1b2c3d4e5f6`

#### Attributes:
| Attribute | Type | Description |
|---|---|---|
| `worker_id` | `S` | Delivery partner identifier |
| `trip_id` | `S` | Trip ID associated with reward |
| `amount_inr` | `N` | Credited reward or benefit amount |
| `type` | `S` | `reward` (healthy route) or `benefit` (unavoidable risk protection) |
| `simulated` | `BOOL`| Always `true` to distinguish demo accounting from real transactions |
| `created_at` | `S` | Grant timestamp |

---

## 2. Amazon S3 Bucket Structure (`airshield-data-<account>-dev`)

The private S3 bucket is organized into structured, immutable prefixes:

```
airshield-data/
├── raw/
│   └── aqi/
│       └── YYYY-MM-DD/
│           └── HHMM.json           # Raw OpenAQ API responses
├── scenarios/
│   └── scenarios_v1.json          # Precomputed Phase 2 demonstration scenarios
├── snapshots/
│   └── demo_v1.json               # Frozen deterministic Delhi AQI station snapshot
├── features/
│   └── delhi_grid.json            # Static spatial modifiers and arterial weights
└── analytics/
    └── summary.json               # Batch 100-trip model performance distribution
```
