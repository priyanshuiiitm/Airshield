# AirShield: Comprehensive System Specification & Architecture Reference

> **Document Type**: Exhaustive System Specification, Algorithmic Blueprint & Context Document  
> **Target Audience**: External Large Language Models (LLMs), AI Architects, Systems Engineers & Domain Experts  
> **Purpose**: Enables any external LLM or technical reviewer to completely understand the entire AirShield codebase, algorithmic mechanics, data pipelines, cloud architecture, and user interface without needing access to the live deployment or source code repository.  
> **Repository**: [https://github.com/priyanshuiiitm/Airshield](https://github.com/priyanshuiiitm/Airshield)  
> **Version**: 2.4.0 (Production / Live)  
> **Geographic Focus**: National Capital Region (Delhi NCR), India  
> **Primary Persona**: Outdoor Gig Economy Delivery Workers (Two-wheeler / Motorcycle couriers for Zomato, Swiggy, Zepto, Blinkit, etc.)  

---

## Table of Contents
1. [Executive Summary & Problem Domain](#1-executive-summary--problem-domain)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Mathematical Modeling & Algorithmic Formulation (Phase 1)](#3-mathematical-modeling--algorithmic-formulation-phase-1)
4. [Statutory Sensor Ingestion & Data Pipeline (Phase 2)](#4-statutory-sensor-ingestion--data-pipeline-phase-2)
5. [AWS Serverless Cloud Backend (Phase 3)](#5-aws-serverless-cloud-backend-phase-3)
6. [Agentic LLM & Bedrock Orchestration Layer (Phase 4)](#6-agentic-llm--bedrock-orchestration-layer-phase-4)
7. [Frontend Application & Interactive UI/UX (Phase 5)](#7-frontend-application--interactive-uiux-phase-5)
8. [Testing, Mathematical Invariants & Verification Suite](#8-testing-mathematical-invariants--verification-suite)
9. [Scientific Boundaries, Ethical Safeguards & Disclaimers](#9-scientific-boundaries-ethical-safeguards--disclaimers)
10. [Open Vectors & Strategic Questions for External LLM Ideation](#10-open-vectors--strategic-questions-for-external-llm-ideation)

---

## 1. Executive Summary & Problem Domain

### 1.1 The Delhi NCR Smog Crisis
During winter months (October through February), meteorological temperature inversions, regional agricultural stubble burning, industrial emissions, and vehicular exhaust trap severe particulate matter in Delhi NCR. Ambient concentrations of **Fine Particulate Matter (PM2.5)** frequently exceed:
* **$300 - 600\,\mu\text{g}/\text{m}^3$** (designated as *Severe* or *Emergency* under the statutory Graded Response Action Plan - GRAP).
* This is **$20\times\text{ to }40\times$** above the World Health Organization (WHO) 24-hour safe guideline limit ($15\,\mu\text{g}/\text{m}^3$).

### 1.2 The Vulnerable Persona: Gig Delivery Couriers
India's hyper-local delivery platforms (food, quick-commerce, courier services) employ hundreds of thousands of gig riders who spend **8 to 12 consecutive hours outdoors** navigating congested arterial corridors. Conventional navigation engines (Google Maps, Apple Maps, MapmyIndia) optimize strictly for **time-minimization** or **distance-minimization**, routinely routing couriers through hyper-polluted choke-points, ring-road bottlenecks, and heavy freight corridors where localized particulate exposure is highest.

### 1.3 The AirShield Solution
AirShield is a **deterministic, pollution-aware decision support system** that:
1. Calculates real-world traffic-aware candidate routes between any pickup and drop coordinate.
2. Segments each route into micro-spatial units ($\sim 200\text{ m}$) and estimates localized PM2.5 using spatial interpolation from statutory monitoring stations.
3. Applies peer-reviewed spatial modifiers (road proximity and green canopy coverage).
4. Solves a **constrained optimization problem** to identify whether a cleaner route exists within an operationally feasible time buffer (e.g., $+2\text{ to }+10\text{ minutes}$).
5. Classifies the scenario into a mathematically rigorous **4-State Decision Matrix** (`AVOIDABLE`, `UNAVOIDABLE`, `LOW`, `INSUFFICIENT_DATA`).
6. Delivers instantaneous, explainable recommendations in both English and Hindi via an obsidian glassmorphic interface, complete with full mathematical transparency, road-snapped maps, and isolated route views.

---

## 2. End-to-End System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Tier (Frontend - React 18 + Vite)"]
        UI[Landing Page & Live Simulator]
        MapLibre[MapLibre GL Map Canvas\n(OSM Tiles + OSRM Snapping)]
        Card[Decision Support Card\n(4 Reactive States)]
        Comp[Route Comparison Matrix]
        Transp[Mathematical Transparency Panel]
    end

    subgraph AWSCloud["AWS Serverless Cloud Tier (ap-south-1)"]
        APIGW[Amazon API Gateway HTTP API]
        
        subgraph Compute["Lambda Compute Layer"]
            LambdaRec[AWS Lambda: recommend\n(IDW Engine & Orchestrator)]
            LambdaIngest[AWS Lambda: ingest_aqi\n(Cron Ingestion Worker)]
        end
        
        subgraph Storage["Persistence & Caching Layer"]
            DynamoTrips[(DynamoDB: TripsTable)]
            DynamoAQI[(DynamoDB: AQIReadingsTable)]
            DynamoRewards[(DynamoDB: RewardsTable)]
            S3Bucket[(Amazon S3: AirShieldDataBucket\nSnapshots & GeoGrids)]
        end

        subgraph Spatial["AWS Spatial Services"]
            LocationSvc[Amazon Location Service\nRoute Calculator / Traffic Duration]
        end

        subgraph Agentic["Agentic AI Layer (Optional LLM Mode)"]
            Bedrock[Amazon Bedrock\nClaude 3 Haiku / Sonnet]
            Strands[AWS Strands Agents SDK\n+ Deterministic Tool Guardrails]
        end
    end

    subgraph External["External Services & Data Sources"]
        OpenAQ[OpenAQ API v3\nStatutory CPCB / DPCC CAAQMS]
        OSRM[OSRM Public Routing API\n(Real Street Polyline Snapping)]
        EventBridge[Amazon EventBridge\n(20-minute Cron Scheduler)]
    end

    UI --> APIGW
    UI --> OSRM
    APIGW --> LambdaRec
    LambdaRec --> LocationSvc
    LambdaRec --> DynamoTrips
    LambdaRec --> DynamoAQI
    LambdaRec --> S3Bucket
    LambdaRec -.-> Strands
    Strands -.-> Bedrock
    
    EventBridge --> LambdaIngest
    LambdaIngest --> OpenAQ
    LambdaIngest --> DynamoAQI
    LambdaIngest --> S3Bucket
```

---

## 3. Mathematical Modeling & Algorithmic Formulation (Phase 1)

The mathematical core of AirShield is located in `backend/core/` and executes deterministically with zero non-deterministic hallucinations.

### 3.1 Route Spatial Segmentation & Temporal Allocation
A candidate route $\mathcal{R}$ is represented by a sequence of geographic waypoints $[(lat_k, lng_k)]_{k=1}^M$ with total geodesic length $S_{\text{total}}$ and total duration $T_{\text{route}}$ (derived from real-world traffic data).
1. The route is divided into $N$ contiguous spatial segments of length $\Delta s_i \approx 200\text{ m}$.
2. The duration $t_i$ spent in segment $i$ is proportionally allocated to preserve traffic-aware dynamics without fabricating speed anomalies:
   $$t_i = T_{\text{route}} \times \frac{\Delta s_i}{S_{\text{total}}}$$

### 3.2 Inverse-Distance Weighting (IDW) Spatial Interpolation
For the geographic midpoint of each segment $i$, ambient PM2.5 is interpolated using statutory continuous monitoring stations:
$$C_i = \frac{\sum_{j=1}^{K} \frac{C_j}{d_{ij}^p + \epsilon}}{\sum_{j=1}^{K} \frac{1}{d_{ij}^p + \epsilon}}$$
* **Station Filtering Rules**:
  * Distance limit: $d_{ij} \le 25.0\text{ km}$ (using great-circle Haversine distance).
  * Data freshness limit: $\text{Age}_j \le 3.0\text{ hours}$.
  * Station count: $K \le 4$ nearest eligible stations.
* **Parameters**:
  * Power parameter: $p = 2.0$ (standard inverse-square spatial decay).
  * Smoothing constant: $\epsilon = 10^{-6}$ (guarantees numerical stability and prevents division by zero).

### 3.3 Micro-Urban Contextual Modifiers
Because ambient CAAQMS stations measure background air (typically at rooftop heights of 3 to 15 meters), two deterministic ground-level spatial modifiers adjust the baseline estimate:
$$C_i^* = C_i \times M_{\text{road}}(d_{\text{highway}, i}) \times M_{\text{green}}(f_{\text{green}, i})$$

#### A. Major Arterial Road Proximity Factor ($M_{\text{road}}$)
Reflects vehicular tailpipe emissions and primary particulate resuspension based on perpendicular distance to major arterials:
$$M_{\text{road}} = \begin{cases} 
1.25 & \text{if } d_{\text{highway}} \le 50\text{ m} \quad (\text{Heavy direct tailpipe plume}) \\
1.10 & \text{if } 50\text{ m} < d_{\text{highway}} \le 200\text{ m} \quad (\text{Roadside dispersion zone}) \\
1.00 & \text{if } d_{\text{highway}} > 200\text{ m} \quad (\text{Urban background level})
\end{cases}$$

#### B. Green Canopy & Ecological Buffer Factor ($M_{\text{green}}$)
Reflects particle dry-deposition, dispersion filtering, and thermal buffering provided by urban green corridors (e.g., Delhi Ridge, Lodhi Gardens, diplomatic green belts):
$$M_{\text{green}} = 1.0 - 0.15 \times f_{\text{green}}$$
Where $f_{\text{green}} \in [0.0, 1.0]$ represents the green coverage fraction along the segment. Maximum deposition reduction is capped at $15\%$ ($M_{\text{green}} \ge 0.85$) to prevent unrealistic claims.

### 3.4 Integrated Exposure Metric
The total cumulative particulate inhalation proxy along candidate route $\mathcal{R}$ is the Riemann integral of concentration over duration:
$$E_{\text{route}} = \sum_{i=1}^{N} C_i^* \times t_{i,\text{minutes}} \quad \left[\mu\text{g}\cdot\text{min}/\text{m}^3\right]$$
The average route concentration is:
$$\overline{C}_{\text{route}} = \frac{E_{\text{route}}}{T_{\text{route}}} = \frac{\sum_{i=1}^{N} C_i^* \times t_{i}}{\sum_{i=1}^{N} t_i} \quad \left[\mu\text{g}/\text{m}^3\right]$$

### 3.5 Relative Exposure Index (Non-Medical Reporting)
To adhere to strict scientific ethics and avoid medical claims regarding lung dosage, exposure is normalized relative to the fastest route:
$$\text{Exposure Index}_{\text{fastest}} = 100$$
$$\text{Exposure Index}_{\text{candidate}} = 100 \times \frac{E_{\text{candidate}}}{E_{\text{fastest}}}$$
$$\text{Relative Exposure Reduction \%} = \frac{E_{\text{fastest}} - E_{\text{candidate}}}{E_{\text{fastest}}} \times 100\%$$

### 3.6 Constrained Optimization
Let $\mathcal{R}_{\text{fastest}}$ be the route with minimal travel time $T_{\text{fastest}}$, and let $B$ be the courier's maximum permissible delivery buffer in minutes (default $B = 5\text{ min}$, selectable from $+2\text{m}, +5\text{m}, +8\text{m}, +10\text{m}$).
$$\min_{\mathcal{R} \in \mathcal{K}} E_{\text{route}} \quad \text{subject to} \quad T_{\text{route}} \le T_{\text{fastest}} + B$$
Where $\mathcal{K}$ is the set of all traffic-feasible candidate routes.

### 3.7 Sensitivity & Robustness Multiplier Check
A candidate route $\mathcal{R}_{\text{safe}}$ is classified as **Robust** if and only if it remains the mathematical optimum under three perturbation configurations:
1. **Half-Strength Modifiers ($0.5\times$)**: Road modifier weights and green factors halved.
2. **Standard Modifiers ($1.0\times$)**: Nominal parameters.
3. **High-Strength Modifiers ($1.5\times$)**: Road modifier weights and green factors increased by $50\%$.

If the recommended route switches under perturbation, `is_robust` is set to `False`.

### 3.8 The Four-State Classification Matrix
Every request is mapped into exactly one mutually exclusive operational state:

| State | Primary Conditions | Recommended Worker Action | Protective Health Advisory |
| :--- | :--- | :--- | :--- |
| **`AVOIDABLE`** | Baseline $\overline{C} \ge 60\,\mu\text{g}/\text{m}^3$, feasible cleaner route exists with $\ge 15\%$ exposure reduction, route is `Robust`, and data confidence $\neq \text{LOW}$. | **Take Safer Route** (Follows green clean-air corridor). | Inhalation Protection: $\downarrow X\%$ Estimated Exposure Avoided; Statutory CAAQMS-modeled. |
| **`UNAVOIDABLE`** | Baseline $\overline{C} \ge 60\,\mu\text{g}/\text{m}^3$, but NO feasible route achieves $\ge 15\%$ reduction within delivery buffer $B$. | **Proceed on Fastest Route** (Minimizes total minutes spent outdoors in uniform smog). | Time-in-Transit Minimization Advisory. |
| **`LOW`** | Baseline $\overline{C} < 60\,\mu\text{g}/\text{m}^3$ (acceptable ambient air per National Ambient Air Quality Standards). | **Follow Fastest Route** (No significant smog hazard to circumvent). | Ambient Air Quality Normal. |
| **`INSUFFICIENT_DATA`** | Fewer than 2 statutory stations within 25 km of the trip corridor (Confidence = `LOW`). | **Follow Fastest Route** (System refrains from speculative routing). | Insufficient Station Coverage Advisory. |

---

## 4. Statutory Sensor Ingestion & Data Pipeline (Phase 2)

### 4.1 Statutory Monitoring Stations in Delhi NCR
AirShield integrates with official Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by the **Central Pollution Control Board (CPCB)** and the **Delhi Pollution Control Committee (DPCC)** via OpenAQ API v3:

| Station Name | Latitude | Longitude | Typical Urban Environment | Primary Monitoring Agency |
| :--- | :--- | :--- | :--- | :--- |
| **Anand Vihar** | 28.6468 | 77.3160 | Inter-state bus terminal, rail hub, industrial border | DPCC / CPCB |
| **Punjabi Bagh** | 28.6740 | 77.1310 | Heavy commercial & Ring Road vehicular corridor | DPCC |
| **R K Puram** | 28.5632 | 77.1869 | Dense residential & South Delhi transit corridor | DPCC |
| **Mandir Marg** | 28.6360 | 77.2010 | Central Delhi institutional & green buffer zone | DPCC |
| **ITO** | 28.6319 | 77.2410 | High-density arterial junction & government corridor | CPCB |
| **Dwarka Sector 8** | 28.5710 | 77.0719 | Sub-city residential & airport flight corridor | DPCC |
| **Lodhi Road** | 28.5910 | 77.2270 | Low-density heritage park & diplomatic enclave | IMD / CPCB |
| **Bawana** | 28.7762 | 77.0510 | North Delhi industrial area | DPCC |
| **Jahangirpuri** | 28.7328 | 77.1706 | High-density mixed-use & highway bypass zone | DPCC |
| **Wazirpur** | 28.6997 | 77.1654 | Industrial estate & Ring Road node | DPCC |

### 4.2 Ingestion Schedule & Caching
* **EventBridge Cron**: An Amazon EventBridge rule triggers `AWS Lambda: ingest_aqi` every 20 minutes (`rate(20 minutes)`).
* **DynamoDB Table (`AQIReadingsTable`)**:
  * Partition Key: `station_id` (String).
  * Sort Key: `timestamp` (String, ISO 8601).
  * Time-To-Live (TTL): 24 hours on attribute `ttl_epoch`.
* **Zero-Latency Fallback Engine**: If the cloud API is offline or the client is operating without internet connectivity, the frontend and local Python runtime utilize `generateDynamicRoutes()` in `frontend/src/utils/delhiData.ts`, executing the complete IDW mathematical interpolation on statutory baseline measurements directly in the client.

---

## 5. AWS Serverless Cloud Backend (Phase 3)

The AWS infrastructure is declared in `infra/template.yaml` (AWS SAM) and deployed in region `ap-south-1` (Mumbai).

### 5.1 Infrastructure Components
* **Amazon API Gateway HTTP API**: Handles low-latency CORS-enabled REST calls.
* **AWS Lambda (`recommend`)**: Python 3.11 runtime, 512 MB memory, 10s timeout. Contains the deterministic optimization core and agent orchestrator.
* **AWS Lambda (`ingest_aqi`)**: Python 3.11 runtime, 256 MB memory, 30s timeout. Queries OpenAQ v3 and persists normalized readings.
* **Amazon Location Service**:
  * Resource: `AirShieldRouteCalculator`.
  * Provides real-time traffic-aware multi-point routing between any two coordinates in Delhi NCR.
* **Amazon DynamoDB Tables**:
  * `TripsTable`: Stores calculated recommendation payloads, worker decisions (`safer` vs `fastest`), and decision timestamps.
  * `AQIReadingsTable`: Historical and current CAAQMS sensor readings with 24-hour TTL.
  * `RewardsTable`: Tracks worker choices idempotently.
* **Amazon S3 (`AirShieldDataBucket`)**: Stores pre-computed evaluation scenarios, static Delhi NCR GeoJSON boundaries, and backup station snapshots.

### 5.2 API Specifications & Endpoints

#### Endpoint 1: `GET /health`
* **Purpose**: Subsystem health probe and cache validation.
* **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "2.4.0",
  "region": "ap-south-1",
  "subsystems": {
    "router": "ok",
    "dynamodb": "ok",
    "s3": "ok",
    "cache": "warm"
  }
}
```

#### Endpoint 2: `POST /recommend`
* **Purpose**: The primary routing optimization endpoint.
* **Request Body**:
```json
{
  "pickup": { "lat": 28.5474, "lng": 77.1959 },
  "drop": { "lat": 28.6515, "lng": 77.1911 },
  "buffer_min": 5.0,
  "language": "en",
  "worker_id": "worker-delhi-102",
  "mode": "snapshot",
  "debug": true
}
```
* **Response Body `200 OK`**:
```json
{
  "trip_id": "trip-delhi-7d8a9f0e",
  "timestamp": "2026-10-10T12:00:00Z",
  "classification": "AVOIDABLE",
  "recommendation": {
    "route_id": "route-ridge-corridor",
    "action": "RECOMMEND_SAFER",
    "additional_minutes": 2.0,
    "exposure_reduction_percent": 22.3,
    "reward_eligible": true,
    "confidence": "HIGH",
    "is_robust": true
  },
  "decision": {
    "fastest_route_id": "route-direct-arterial",
    "cleanest_route_id": "route-ridge-corridor",
    "buffer_minutes": 5.0,
    "classification": "AVOIDABLE"
  },
  "routes": [
    {
      "route_id": "route-direct-arterial",
      "duration_minutes": 38.3,
      "distance_km": 13.32,
      "average_pm25": 138.2,
      "estimated_integrated_pm25": 5293.0,
      "exposure_index": 100.0,
      "feasible": true,
      "confidence": "HIGH",
      "geometry": [
        { "lat": 28.5474, "lng": 77.1959 },
        { "lat": 28.6515, "lng": 77.1911 }
      ]
    },
    {
      "route_id": "route-ridge-corridor",
      "duration_minutes": 40.3,
      "distance_km": 14.10,
      "average_pm25": 102.1,
      "estimated_integrated_pm25": 4114.6,
      "exposure_index": 77.7,
      "feasible": true,
      "confidence": "HIGH",
      "geometry": [
        { "lat": 28.5474, "lng": 77.1959 },
        { "lat": 28.6515, "lng": 77.1911 }
      ]
    }
  ],
  "agent": {
    "explanation": "A safer route was found via Central Ridge. It adds 2.0 min and is estimated to reduce pollution exposure by 22.3%."
  }
}
```

#### Endpoint 3: `POST /trips/{trip_id}/choice`
* **Purpose**: Records courier route decision (`safer` vs `fastest`).
* **Request Body**:
```json
{
  "worker_id": "worker-delhi-102",
  "choice": "safer"
}
```
* **Response Body `200 OK`**:
```json
{
  "status": "success",
  "trip_id": "trip-delhi-7d8a9f0e",
  "choice_recorded": "safer",
  "inhalation_protection_acknowledged": true
}
```

---

## 6. Agentic LLM & Bedrock Orchestration Layer (Phase 4)

Located in `backend/agent/`, this layer demonstrates how an LLM agent can explain mathematical optimizations without violating mathematical determinism.

### 6.1 Framework & Model
* **SDK**: AWS Strands Agents SDK (`strands`).
* **Foundational Model**: Amazon Bedrock (`anthropic.claude-3-haiku` / `anthropic.claude-3-5-sonnet`).
* **Configuration**: Temperature $0.1$, Top-P $0.9$, Max Tokens $512$ (prevents rambling).

### 6.2 The 4 Deterministic Agent Tools
The agent does not calculate numbers in natural language. Instead, it interacts strictly via typed tool executions:
1. `get_routes(pickup, drop)`: Queries Amazon Location Service for traffic routes.
2. `get_aqi(station_ids, max_age_hours)`: Fetches verified CAAQMS observations.
3. `compute_exposure(routes, aqi_readings)`: Executes the IDW and spatial modifier calculations.
4. `optimize_route(exposures, buffer_min)`: Performs constrained optimization and checks sensitivity robustness.

### 6.3 Invariant Validation Guardrails (`backend/agent/validator.py`)
To prevent LLM hallucination, every agent decision must satisfy three mathematical invariants before reaching the client:
* **Invariant 1: Feasibility Preservation**: If the agent suggests route $\mathcal{R}^*$, its duration must strictly satisfy $T^* \le T_{\text{fastest}} + B$.
* **Invariant 2: Classification Fidelity**: The agent's natural-language classification (`AVOIDABLE`, `UNAVOIDABLE`, `LOW`, `INSUFFICIENT_DATA`) must match the output of `backend/core/classify.py`. The LLM cannot reclassify a trip.
* **Invariant 3: Ground Truth Parity**: Exposure reduction percentages quoted in natural language must match mathematical calculation within $\pm 1\%$.

### 6.4 Safety Fallback Engine (`backend/agent/fallback.py`)
If Bedrock experiences throttling, network latency exceeds $3000\text{ ms}$, or tool calling fails validation, the system automatically falls back to `backend.service.orchestrator`, which runs the pure Python deterministic engine and outputs structured template responses in $< 50\text{ ms}$.

---

## 7. Frontend Application & Interactive UI/UX (Phase 5)

The frontend is a single-page React application built with TypeScript, Vite, and MapLibre GL.

### 7.1 Design Tokens & Obsidian Cyberpunk Aesthetic
* **Theme**: Deep obsidian dark mode (`--bg-primary: #07090e`, `--bg-card: #0d121d`).
* **Accents**:
  * Neon Emerald (`--emerald-neon: #10b981`) for clean air corridors, inhalation protection, and recommended paths.
  * Cyberpunk Crimson (`--crimson-neon: #ef4444`) for high-AQI corridors and severe pollution zones.
  * Royal Cyan/Blue (`--cyan-neon: #06b6d4`, `--blue-royal: #2563eb`) for direct transit and fastest routes.
  * Amber Warning (`--amber-neon: #f59e0b`) for statutory CAAQMS sensor stations.
* **Glassmorphism**: Semi-transparent backgrounds (`rgba(13, 18, 29, 0.85)`), backdrop filters (`blur(16px)`), and subtle neon glow borders (`1px solid rgba(16, 185, 129, 0.2)`).

### 7.2 Interactive Delhi NCR Map Canvas (`MapView.tsx`)
* **Tile Provider**: OpenStreetMap raster tiles (100% keyless, zero watermarks, 100% uptime).
* **3-State Dynamic View Isolation**:
  1. **`"all"` Mode**: Displays both Route A (Red High-AQI corridor with a linear pollution gradient) and Route B (Blue Lower-AQI corridor) side-by-side with on-map midpoint badges.
  2. **`"safer"` Mode**: Isolates the recommended clean corridor in glowing **Neon Emerald Green** ($7.5\text{px}$ line width), hides the red corridor, and displays `🟢 Recommended Path (PM2.5 • Duration)`.
  3. **`"fastest"` Mode**: Isolates the fastest direct route in glowing **Royal Blue** ($7.5\text{px}$ line width), hides alternative corridors, and displays `🔵 Fastest Route (PM2.5 • Duration)`.
  4. **Toggle Controls**: Floating top bar includes `Show Both Routes (Red vs Blue)` to immediately restore comparison.
* **Live Statutory AQI Sensor Overlay**:
  * 10 live DPCC/CPCB monitoring stations plotted with pulsing rings color-coded by pollution severity.
  * Clicking any sensor pin opens a detailed modal showing station operator, real-time PM2.5, time of last reading, and source.
* **Interactive Pin Dropper**: Couriers can click "Pick on Map" to drop origin and destination pins anywhere in Delhi NCR.
* **OSRM Street Snapping**: Route coordinates are snapped to real Delhi road geometry using the Open Source Routing Machine (OSRM).

### 7.3 Decision Support Card (`DecisionCard.tsx`)
Renders the primary actionable recommendation tailored to the 4-state classification:
* **`AVOIDABLE` State**:
  * Displays time trade-off ($+2\text{ min}$) alongside exposure reduction ($\downarrow 20\%$).
  * Displays the **Inhalation Protection Banner**: `Inhalation Protection: ↓ 20.3% PM2.5 Intake Avoided | Statutory CAAQMS-verified clean air corridor`.
  * Action buttons: `Take safer route` (green) and `Keep fastest route` (secondary).
  * Clicking either isolates that specific route on the map and shows a confirmation banner with an instant toggle switch (`⇄ Switch to Fastest Route (Blue)` / `⇄ Switch to Safer Route (Green)`).
* **`UNAVOIDABLE` State**:
  * Displays the **Dose Minimization Advisory**: Explains that ambient pollution is uniformly elevated across all paths, and mathematically the optimal choice is to minimize time-in-transit by following the fastest route.
* **`LOW` State**: Confirms ambient air is within acceptable statutory limits.
* **`INSUFFICIENT_DATA` State**: Advises that sensor density is inadequate to recommend a diversion.

### 7.4 Route Exposure Comparison Grid (`RouteComparison.tsx`)
* Presents Route A (Direct Arterial), Route B (Green / Ridge Corridor), and Route C (Bypass Ring).
* Displays Exposure Index ($100$ vs $78$), Average PM2.5 ($138.2\,\mu\text{g}/\text{m}^3$ vs $102.1\,\mu\text{g}/\text{m}^3$), and Trip Time ($38.3\text{m}$ vs $40.3\text{m}$).
* Clicking any route card immediately focuses and isolates that route on the map.

### 7.5 Mathematical Transparency Panel (`TransparencyPanel.tsx`)
Provides a complete, unhidden audit trail:
1. **Mathematical Formulation**: Displays the exact Riemann sum formula and normalization equations.
2. **Spatial Modifiers Breakdown**: Explains the $M_{\text{road}}$ arterial proximity steps and $M_{\text{green}}$ canopy formula.
3. **Sensitivity Robustness Matrix**: Displays the $0.5\times, 1.0\times, 1.5\times$ modifier verification table.
4. **Data Citations**: Direct attribution to CPCB, DPCC, OpenAQ, and Amazon Location Service.

### 7.6 Animated Radar Landing Page (`LandingPage.tsx`)
* Features a high-tech **360° rotating radar perimeter sweep** with concentric sonar pulse rings.
* Live ticker displaying Delhi NCR emergency air quality metrics.
* Direct action button: `Launch Live Simulator` leading directly into the interactive workspace.

### 7.7 Bilingual Localization (`localization.ts`)
Complete parity between **English (EN)** and **Hindi (HI - हिन्दी)** across all UI elements, labels, mathematical explanations, and audio-ready prompts.

---

## 8. Testing, Mathematical Invariants & Verification Suite

### 8.1 100% Offline Deterministic Test Suite (`tests/`)
* **Unit Tests**:
  * `test_aqi.py`: Validates IDW interpolation accuracy, boundary conditions, zero distances, and station freshness filters.
  * `test_exposure.py`: Validates Riemann sum integration and spatial modifiers.
  * `test_optimize.py`: Verifies constrained optimization over delivery buffers $+2\text{m}, +5\text{m}, +10\text{m}$.
  * `test_classify.py`: Validates strict 4-state transitions without edge-case bleeding.
  * `test_models.py`: Validates Pydantic schema validation and JSON serialization.
* **Invariant Tests (`test_invariants.py`)**:
  * Proves mathematically that the recommended route never exceeds the fastest route duration by more than the specified buffer: $T_{\text{rec}} - T_{\text{fastest}} \le B + 10^{-5}$.
  * Proves that when PM2.5 is uniform across all routes, the system never classifies the state as `AVOIDABLE`.
* **Agent Tests (`tests/agent/`)**:
  * Validates agent tool invocation, prompt generation, structured output extraction, and fallback transitions.
* **AWS Verification (`tests/aws/`)**:
  * Schema contract validation matching Lambda event signatures and API Gateway specifications.

### 8.2 Execution Commands
```powershell
# Run full deterministic test suite
pytest -v

# Run with coverage report
pytest --cov=backend/core --cov-report=term-missing

# Run AWS deployed smoke test suite (verifies live endpoints in ap-south-1)
python scripts/smoke_test.py --api-url https://r2avtmy9q4.execute-api.ap-south-1.amazonaws.com

# Build and verify frontend TypeScript compilation
npm --prefix frontend run build
```

---

## 9. Scientific Boundaries, Ethical Safeguards & Disclaimers

AirShield incorporates explicit guardrails to maintain scientific integrity:

1. **Relative Decision Support vs Medical Dosage**:
   * The system outputs a relative **Exposure Index** and **Relative Reduction %**.
   * It **does not claim** to measure personal biological lung dose, internal blood particulate absorption, or clinical respiratory outcomes.
2. **Statutory Ambient Data vs Micro-Sensors**:
   * AirShield interpolates statutory CAAQMS rooftop measurements. It does not fabricate hyper-local street sensor measurements.
3. **No Double-Counting Congestion**:
   * Roadway delay is already incorporated in the travel duration $T_{\text{route}}$ provided by the navigation service. AirShield does not apply a secondary speed-penalty multiplier to avoid mathematical double-counting.
4. **Transparent Data Attribution**:
   * Statutory monitoring data is explicitly cited as belonging to the Central Pollution Control Board (CPCB) and Delhi Pollution Control Committee (DPCC).

---

## 10. Open Vectors & Strategic Questions for External LLM Ideation

> **Note for External LLMs & AI Reviewers**:  
> Now that you have complete context on AirShield's mathematical foundation, cloud backend, and frontend interface, you are invited to critique, evaluate, and propose advanced features. Below are the key strategic dimensions where high-impact additions can be explored:

### Vector A: Spatio-Temporal Predictive Modeling (ML / Deep Learning)
* *Current State*: Spatial interpolation (IDW) uses static recent station readings ($\le 3\text{ hours}$ old).
* *Brainstorming Queries*:
  1. How can we integrate **Spatio-Temporal Graph Neural Networks (ST-GNN)** or **Temporal Convolutional Networks (TCN)** to forecast PM2.5 shifts 30 to 90 minutes into the future along the delivery route?
  2. How can we incorporate real-time meteorological vectors (wind speed, wind direction from IMD, boundary layer mixing height, and relative humidity) to simulate dispersion plumes from known industrial point-sources (e.g., Anand Vihar, Okhla, Bawana)?

### Vector B: Wearable & IoT Edge Hardware Integration
* *Current State*: Software-only interpolation based on statutory rooftop monitors.
* *Brainstorming Queries*:
  1. How could couriers wearing low-cost optical particulate monitors (e.g., Plantower PMS5003 or Sensirion SPS30 mounted on delivery backpacks or helmets) stream BLE data into AirShield?
  2. How should we architect an **Extended Kalman Filter (EKF)** or Gaussian Process Regression (GPR) to fuse noisy low-cost mobile sensor readings with sparse high-accuracy statutory CAAQMS data?

### Vector C: B2B Enterprise Fleet & Gig Dispatch Optimization
* *Current State*: Courier-facing single-trip recommendation system.
* *Brainstorming Queries*:
  1. How can AirShield expose a batched **B2B Fleet Dispatch API** for platforms like Zomato, Swiggy, Zepto, or Blinkit that optimizes cumulative fleet inhalation exposure across thousands of concurrent couriers without breaching Service Level Agreements (SLAs)?
  2. How can platform dispatchers rotate couriers out of high-smog zones into cleaner sectors once their cumulative shift exposure reaches a predetermined threshold?

### Vector D: Personal Health Dosimetry & Shift Exposure Budgets
* *Current State*: Per-trip exposure evaluation.
* *Brainstorming Queries*:
  1. How can we build a persistent **Daily Cumulative Inhalation Ledger** that tracks a worker's cumulative exposure across their entire 8-hour or 10-hour shift?
  2. How can we integrate respiratory minute ventilation estimates based on courier velocity (e.g., bicycling vs motorized scooter) to estimate relative tidal volume?

### Vector E: Economic Incentives & Municipal Policy Integration
* *Current State*: Statutory inhalation protection verification badge.
* *Brainstorming Queries*:
  1. How could corporate CSR funds, carbon credit markets, or municipal green funds sponsor micro-incentives or health insurance premium subsidies for riders who take verified clean-air corridors?
  2. What anonymized heat-map analytics could be served to the Delhi Municipal Corporation (MCD) or Commission for Air Quality Management (CAQM) to identify corridors where road-washing or anti-smog guns are most urgently needed?

### Vector F: Offline-First Mobile PWA & Turn-by-Turn Voice Navigation
* *Current State*: Web simulator with interactive MapLibre map and visual routes.
* *Brainstorming Queries*:
  1. What architecture is needed to transform AirShield into a turn-by-turn voice-guided Progressive Web App (PWA) with audio warnings in Hindi when approaching severe pollution corridors?
  2. How can local SQLite/IndexedDB vector tiles enable zero-latency routing when 4G/5G mobile connectivity drops in underground passes or high-density markets?

---
*End of AirShield Comprehensive Specification Document.*
