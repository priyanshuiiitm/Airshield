# AirShield: Pollution-Aware Route Decision System

> **Track 01 — Air | WeMakeDevs Environmental Hacks**  
> A deterministic, pollution-aware routing decision engine for outdoor delivery workers in Delhi NCR.

---

## 1. What Phase 1 Does

Phase 1 provides the **pure Python deterministic engine** for AirShield. Given a pickup and drop coordinate pair, a delivery time buffer, and ambient PM2.5 monitoring observations, it:
1. Deduplicates candidate routes and identifies the fastest route.
2. Segments each route into ~200m spatial chunks.
3. Estimates PM2.5 along each segment using **Inverse-Distance Weighting (IDW)** from fresh monitoring stations ($\le 25\text{ km}$).
4. Applies transparent spatial context modifiers (road proximity and green canopy coverage).
5. Integrates total route exposure ($E = \sum C_i^* \times t_i$ in $\mu\text{g}\cdot\text{min}/\text{m}^3$).
6. Performs **constrained optimization** to find the lowest-exposure route satisfying $t \le t_{\text{fastest}} + \text{buffer}$.
7. Performs **sensitivity robustness checks** across $0.5\times$, $1.0\times$, and $1.5\times$ parameter configurations.
8. Classifies the situation into exactly one of four operational states: `LOW`, `AVOIDABLE`, `UNAVOIDABLE`, `INSUFFICIENT_DATA`.

---

## 2. Mathematical Methodology & Formulas

### A. Route Segmentation & Temporal Allocation
Every candidate route is segmented into $N$ segments of length $\Delta s_i \approx 200\text{ m}$. Duration is allocated proportionally to preserve total traffic-aware trip duration:
$$t_i = T_{\text{route}} \times \frac{\Delta s_i}{S_{\text{total}}}$$

### B. Inverse-Distance Weighting (IDW)
For each segment midpoint, up to 4 nearest fresh monitoring stations ($\le 3\text{ hours old}$) within 25 km are selected:
$$C_i = \frac{\sum_{j=1}^{K} \frac{C_j}{d_{ij}^2 + \epsilon}}{\sum_{j=1}^{K} \frac{1}{d_{ij}^2 + \epsilon}}$$
* $C_j$: PM2.5 at station $j$ ($\mu\text{g}/\text{m}^3$)
* $d_{ij}$: Geodesic (Haversine) distance from segment midpoint $i$ to station $j$ (km)
* $\epsilon = 10^{-6}$: Prevents division by zero

### C. Contextual Spatial Proxies
To reflect micro-urban context without fabricating measurements:
$$C_i^* = C_i \times M_{\text{road}} \times M_{\text{green}}$$
* **Major Road Factor ($M_{\text{road}}$)**:
  * $\le 50\text{ m}$: $1.25$
  * $50 - 200\text{ m}$: $1.10$
  * $> 200\text{ m}$: $1.00$
* **Green Factor ($M_{\text{green}}$)**:
  * $M_{\text{green}} = 1.0 - 0.15 \times \text{green\_fraction}$

### D. Integrated Exposure Index
Total route exposure:
$$E_{\text{route}} = \sum_{i=1}^{N} C_i^* \times t_{i,\text{minutes}}$$

### E. Relative Exposure Normalization
To avoid scientific and medical over-claiming, exposure is reported as a relative decision-support index:
$$\text{Exposure Index}_{\text{fastest}} = 100$$
$$\text{Exposure Index}_{\text{alt}} = 100 \times \frac{E_{\text{alt}}}{E_{\text{fastest}}}$$
$$\text{Reduction \%} = \frac{E_{\text{fastest}} - E_{\text{alt}}}{E_{\text{fastest}}} \times 100\%$$

---

## 3. Four-State Classification Matrix

| State | Conditions | Worker Action | Financial Trigger |
| :--- | :--- | :--- | :--- |
| **`LOW`** | Baseline PM2.5 $< 60\,\mu\text{g}/\text{m}^3$ and reduction $< 15\%$ | Follow fastest route | None |
| **`AVOIDABLE`** | Baseline elevated, cleaner feasible route exists ($\ge 15\%$ reduction), robust, confidence $\neq$ LOW | Take safer route | ₹3 Simulated Reward |
| **`UNAVOIDABLE`** | Baseline elevated, no feasible route gives $\ge 15\%$ reduction within allowed buffer | Proceed on fastest route | ₹5 Health Benefit |
| **`INSUFFICIENT_DATA`** | $< 2$ nearby stations (LOW confidence) | No claims made | None |

---

## 4. Sensitivity & Robustness Checks

A route recommendation is labeled **Robust** only if the same route remains the minimum-exposure feasible option under three distinct modifier configurations:
1. **Default** ($1.0\times$)
2. **Half-Strength** ($0.5\times$)
3. **High-Strength** ($1.5\times$)

---

## 5. Installation & Setup

### Prerequisites
* Python 3.10+
* Git

```powershell
# Clone the repository
git clone https://github.com/priyanshuiiitm/Airshield.git
cd Airshield

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables (`.env`)
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=ap-south-1
AWS_LOCATION_CALCULATOR_NAME=AirShieldRouteCalculator
OPENAQ_API_KEY=your_openaq_api_key
```

---

## 6. Running Tests & Demo

### Run Full Test Suite (100% Offline & Deterministic)
```powershell
pytest -v
```

### Run Test Coverage
```powershell
pytest --cov=backend/core --cov-report=term-missing
```

### Run Local Interactive Demonstration
```powershell
python scripts/run_local_demo.py
```

---

## 7. Limitations & Scientific Disclaimer

> [!IMPORTANT]
> **Scientific & Medical Disclaimer**  
> This system produces a modeled relative pollution-exposure index for decision support. It is based on ambient monitoring observations and spatial proxies; it is not street-level pollution sensing and is not a medical measurement.

* **Station Sparsity**: Estimates rely on statutory ambient monitoring stations (e.g. CPCB/DPCC via OpenAQ) interpolated across space.
* **Traffic Integration**: Traffic-aware durations from Amazon Location Service are used directly to calculate time-in-transit. No secondary artificial congestion multipliers are applied to prevent double-counting.
* **Operational Buffer**: Unavoidable exposure is defined *relative to operational constraints* (e.g., 5-minute delivery window), not absolute impossibility.
