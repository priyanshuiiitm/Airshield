# AirShield

AirShield is a pollution-aware route decision system for delivery workers. It evaluates alternative delivery routes, calculates absolute pollution exposure (PM2.5) using Inverse-Distance Weighting from live OpenAQ sensors, and finds the lowest-exposure route that is *actually feasible* within the delivery platform's acceptable time buffer.

---

## 🏗️ How We Built It (Methodology)

1. **Strict Architecture Boundaries**: We did not build a generic "Google Maps". We built an optimizer that sits *on top* of existing routing data (mocked locally for now, designed for Amazon Location Service).
2. **Deterministic Core Math Engine**: 
   - We calculate route exposure using Inverse-Distance Weighting (IDW) interpolation from live AQI stations.
   - The engine strictly filters out routes that exceed a configured time buffer (e.g., +5 minutes).
   - The model mathematically guarantees the LLM cannot hallucinate arbitrary numbers.
3. **Four-State Classification**: 
   The core classifies every trip into one of four states based on the feasible route matrix:
   - 🟢 `LOW` (No meaningful difference)
   - 🟠 `AVOIDABLE` (We found a significantly safer route within the time buffer)
   - 🔴 `UNAVOIDABLE_WITHIN_POLICY` (There is a safer route, but it makes the delivery too late)
   - ⚪ `INSUFFICIENT_DATA` (Not enough sensors nearby to make a claim)
4. **Agentic Orchestration (Strands/Bedrock)**: We abstracted the Python math into a tool callable by an LLM agent, complete with fallback templates and hallucination validators to guarantee UI safety.
5. **Frontend (React + MapLibre)**: We translate the raw backend JSON output into a clean, actionable "Decision Card" UI designed specifically for a delivery worker's mobile interface.

---

## 🔍 Note to Judges / How to Cross-Verify Results

You can cross-verify that the mathematical exposure logic and the classification matrix actually work exactly as described by running our automated test suites. We have mapped the logic rigorously to ensure zero AI hallucinations in the final numbers.

### 1. Run the End-to-End Demo Script
Run the core engine test which connects to **live OpenAQ v3 data** for Delhi and executes a simulated hotspot routing scenario:

```bash
# Install dependencies using uv or pip
uv pip install -r requirements.txt # (or just requests, python-dotenv, shapely)

# Run the demo
uv run test_core_engine.py
```
**What to verify:** Watch the console output calculate exact IDW exposure numbers, optimize the fastest route vs the safest route, and output a valid JSON UI Card.

### 2. Run the Mathematical Test Suite (Pytest)
We wrote 13 rigorous sanity and mathematical tests that verify the boundary conditions of the architecture.

```bash
# Run the test suite
PYTHONPATH=. uv run pytest tests/core/
```
**What to verify:**
- `test_t6_sanity.py`: Proves the model logic (e.g., doubling the duration exactly doubles exposure; identical routes yield 0% reduction).
- `test_t7_t9.py`: Tests boundary conditions (e.g., changing the allowed ETA buffer changes the 'feasible' route winner).
- `test_t8_classification.py`: Proves the four-state classification system (`LOW`, `AVOIDABLE`, `UNAVOIDABLE_WITHIN_POLICY`, `INSUFFICIENT_DATA`) activates exactly when mathematically required.

### 3. Run the Frontend Visualization
```bash
cd frontend
npm install
npm run dev
```
**What to verify:** Open the localhost link to see how the mathematical output JSON accurately controls the rendering of the React MapLibre lines and the dynamic Worker Decision Card.
