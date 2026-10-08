# AirShield Backend API Reference (Phase 3)

The AirShield HTTP API exposes the deterministic pollution-aware route optimization engine, worker micro-reward accounting, and batch analytics.

- **Protocol**: HTTPS
- **Payload Format**: API Gateway HTTP API (Payload v2.0)
- **Base URL**: `https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com` (or `http://localhost:5173` in local dev)
- **CORS**: Enabled for configured domain origins (`GET`, `POST`, `OPTIONS`).

---

## 1. POST `/recommend`

Generates an exposure-optimized route decision comparing candidate routes against the fastest delivery route.

### Request

```http
POST /recommend
Content-Type: application/json
```

```json
{
  "pickup": {
    "lat": 28.5474,
    "lng": 77.1959
  },
  "drop": {
    "lat": 28.6515,
    "lng": 77.1911
  },
  "buffer_min": 5.0,
  "language": "en",
  "worker_id": "demo-worker-001",
  "mode": "snapshot",
  "snapshot_id": "demo_v1"
}
```

### Parameters

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `pickup` | Object (`lat`, `lng`) | **Yes** | - | Doorstep pickup coordinates (Delhi NCR bounds) |
| `drop` | Object (`lat`, `lng`) | **Yes** | - | Destination drop coordinates (Delhi NCR bounds) |
| `buffer_min` | Float | No | `5.0` | Delivery-time buffer ($0 \le \text{buffer} \le 15$ minutes) |
| `language` | String | No | `"en"` | Response message language (`"en"` or `"hi"`) |
| `worker_id` | String | No | `"demo-worker"` | Anonymized delivery partner identifier |
| `mode` | String | No | `"snapshot"` | Operational mode (`"snapshot"` for demo, `"live"` for real-time) |
| `snapshot_id`| String | No | `"demo_v1"` | Identifier of frozen deterministic snapshot |

---

### Response (200 OK — Scenario A: AVOIDABLE)

```json
{
  "trip_id": "trip_a1b2c3d4e5f6",
  "classification": "AVOIDABLE",
  "recommendation": {
    "route_id": "R2_SAFER",
    "action": "TAKE_SAFER_ROUTE",
    "additional_minutes": 2.0,
    "exposure_reduction_percent": 21.8,
    "reward_eligible": true,
    "reward_amount_inr": 3
  },
  "routes": [
    {
      "route_id": "R1_FAST",
      "duration_minutes": 38.3,
      "distance_km": 13.32,
      "exposure_index": 100.0,
      "average_pm25": 138.1,
      "feasible": true,
      "confidence": "HIGH",
      "geometry": [
        {"lat": 28.5474, "lng": 77.1959},
        {"lat": 28.6001, "lng": 77.2085},
        {"lat": 28.6515, "lng": 77.1911}
      ]
    },
    {
      "route_id": "R2_SAFER",
      "duration_minutes": 40.3,
      "distance_km": 13.97,
      "exposure_index": 78.2,
      "average_pm25": 102.6,
      "feasible": true,
      "confidence": "HIGH",
      "geometry": [
        {"lat": 28.5474, "lng": 77.1959},
        {"lat": 28.5976, "lng": 77.1535},
        {"lat": 28.6515, "lng": 77.1911}
      ]
    }
  ],
  "decision": {
    "fastest_route_id": "R1_FAST",
    "selected_route_id": "R2_SAFER",
    "buffer_minutes": 5.0,
    "robust": true
  },
  "benefit": {
    "type": "simulated_reward",
    "amount_inr": 3,
    "eligible": true
  },
  "metadata": {
    "snapshot_id": "demo_v1",
    "model_version": "1.0.0",
    "data_mode": "snapshot",
    "modelled": true,
    "created_at": "2026-10-09T00:00:00Z"
  },
  "message": "A safer route was found. It adds 2.0 min and is estimated to reduce pollution exposure by 22%."
}
```

---

## 2. POST `/trips/{trip_id}/choice`

Records the worker's route choice and triggers idempotent micro-reward processing.

### Request

```http
POST /trips/trip_a1b2c3d4e5f6/choice
Content-Type: application/json
```

```json
{
  "choice": "safer"
}
```

### Response (200 OK)

```json
{
  "trip_id": "trip_a1b2c3d4e5f6",
  "worker_id": "demo-worker-001",
  "choice": "safer",
  "reward_status": "CREDITED",
  "credited_amount_inr": 3,
  "simulated": true
}
```

*Note: Repeated identical requests return `"reward_status": "ALREADY_PROCESSED"` and `"credited_amount_inr": 0` via DynamoDB conditional writes.*

---

## 3. GET `/wallet/{worker_id}`

Retrieves simulated micro-reward balance and cumulative trip counts for a delivery worker.

### Request

```http
GET /wallet/demo-worker-001
```

### Response (200 OK)

```json
{
  "worker_id": "demo-worker-001",
  "balance_inr": 18,
  "trip_count": 7,
  "reward_count": 6,
  "benefit_count": 0,
  "simulated": true
}
```

---

## 4. GET `/analytics/summary`

Returns precomputed batch model performance statistics across Delhi NCR routes.

### Request

```http
GET /analytics/summary
```

### Response (200 OK)

```json
{
  "city": "Delhi NCR",
  "trips_analyzed": 100,
  "avoidable_share": 4.0,
  "unavoidable_share": 95.0,
  "low_share": 0.0,
  "insufficient_data_share": 1.0,
  "median_exposure_reduction": 21.1,
  "median_extra_minutes": 2.0,
  "buffer_sweep": {
    "3.0_min": {"avoidable_pct": 6.1, "unavoidable_pct": 93.9, "median_red": 21.1},
    "5.0_min": {"avoidable_pct": 6.1, "unavoidable_pct": 93.9, "median_red": 21.1},
    "8.0_min": {"avoidable_pct": 8.2, "unavoidable_pct": 91.8, "median_red": 21.3},
    "10.0_min": {"avoidable_pct": 8.2, "unavoidable_pct": 91.8, "median_red": 21.3}
  },
  "total_simulated_benefits": 17,
  "modelled": true,
  "disclaimer": "AirShield exposure reductions and micro-rewards are simulated for the demonstration prototype."
}
```

---

## 5. GET `/health`

Lightweight health and readiness check.

### Request

```http
GET /health
```

### Response (200 OK)

```json
{
  "status": "ok",
  "router": "ok",
  "aqi_cache": "ok",
  "s3": "ok",
  "dynamodb": "ok",
  "data_mode": "snapshot"
}
```

---

## 6. Error Response Schema

All errors return structured JSON:

```json
{
  "error": {
    "code": "OUTSIDE_DELHI_NCR",
    "message": "Coordinates in 'pickup' (19.076, 72.8777) fall outside the configured Delhi NCR operating zone."
  }
}
```
