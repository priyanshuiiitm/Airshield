# AirShieldAgent Architecture & Specifications

> **Phase 4 — Agentic Orchestration & Structured Explanation Layer**  
> Powered by AWS Strands Agents SDK & Amazon Bedrock.

---

## 1. Why AirShield Uses an Agent

AirShield uses an AI agent as an **orchestrator** and **explainer**, not as an unconstrained calculator. Outdoor delivery workers require:
1. Clear, concise explanations in English or Hindi explaining *why* a particular route is recommended.
2. Transparent trade-offs (e.g. `+2 min`, `20% lower exposure`, `Earn ₹3`).
3. Autonomous coordination of routing, ambient monitoring observations, and optimization tools.

---

## 2. The Golden Rule: Agent vs. Deterministic Ground Truth

> [!IMPORTANT]
> **THE AGENT MAY EXPLAIN THE DECISION. THE AGENT MAY NOT CHANGE THE DECISION.**

* **The deterministic engine decides**: Candidate routes, PM2.5 IDW interpolation, route exposure integration, constrained time-buffer optimization, sensitivity robustness, and the 4-state classification (`LOW`, `AVOIDABLE`, `UNAVOIDABLE`, `INSUFFICIENT_DATA`).
* **The agent orchestrates and explains**: Invokes deterministic tools, explains why the route was chosen, formats reason codes, and generates worker-facing messages.
* **If the agent deviates**: The strict deterministic validator rejects the agent output and instantly activates the deterministic fallback template.

---

## 3. Tool Set

AirShieldAgent is equipped with exactly four custom deterministic tools:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CUSTOM TOOL SET                                 │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ Tool                 │ Responsibility                                       │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ get_routes()         │ Retrieves candidate routes from Amazon Location /    │
│                      │ snapshot fixtures with geometries and durations.     │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ get_aqi()            │ Retrieves ambient PM2.5 observations from DynamoDB   │
│                      │ / OpenAQ snapshot cache with freshness check.        │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ compute_exposure()   │ Calculates integrated exposure using Phase 1 IDW     │
│                      │ and spatial canopy/road modifiers.                   │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ optimize_route()     │ Executes constrained optimization and 4-state        │
│                      │ operational classification.                          │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 4. Agent Architecture & Execution Flow

```
                     HTTP Request (POST /recommend)
                                  │
                                  ▼
                         [ Recommend Lambda ]
                                  │
                                  ▼
                     [ Deterministic Ground Truth ]
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
                ▼                                   ▼
        [ AirShieldAgent ]                [ Ground Truth State ]
        (Strands + Bedrock)                         │
                │                                   │
     ┌──────────┼──────────┐                        │
     ▼          ▼          ▼                        │
get_routes   get_aqi   compute_exp                  │
     │          │          │                        │
     └──────────┼──────────┘                        │
                ▼                                   │
         optimize_route                             │
                │                                   │
                ▼                                   │
         [ AgentDecision ]                          │
                │                                   │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                       [ Strict Validator ]
                                  │
                ┌─────────────────┴─────────────────┐
                ▼                                   ▼
             [ PASS ]                        [ FAIL / TIMEOUT ]
                │                                   │
                ▼                                   ▼
       Agent Explanation                   Deterministic Fallback
                │                                 Template
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                           [ API Response ]
```

---

## 5. Structured Output Schema (`AgentDecision`)

```python
class AgentDecision(BaseModel):
    outcome: Literal["LOW", "AVOIDABLE", "UNAVOIDABLE", "INSUFFICIENT_DATA"]
    reason_code: Literal[
        "NO_MEANINGFUL_INTERVENTION",
        "SAFER_ROUTE_WITHIN_BUFFER",
        "NO_SAFER_ROUTE_WITHIN_BUFFER",
        "INSUFFICIENT_AQI_DATA",
        "NO_ALTERNATIVE_ROUTE",
        "LOW_EXPOSURE"
    ]
    route_id: Optional[str]
    action: Literal[
        "CONTINUE_FASTEST",
        "TAKE_SAFER_ROUTE",
        "CONTINUE_WITH_BENEFIT",
        "INSUFFICIENT_DATA"
    ]
    explanation: str
    reward_eligible: bool
    reward_amount_inr: float
    data_confidence: Literal["HIGH", "MEDIUM", "LOW"]
    robust: bool
    source: Literal["AGENT", "DETERMINISTIC_FALLBACK"]
```

---

## 6. Strict Deterministic Validator Rules

The validator compares the agent's output against ground truth facts:
1. **Outcome Equality**: `decision.outcome == ground_truth.classification`.
2. **Selected Route Equality**: For `AVOIDABLE`, `decision.route_id == ground_truth.recommendation.selected_route_id`.
3. **Unavoidable Safety**: For `UNAVOIDABLE`, the agent cannot recommend an outside-buffer route as the operational choice.
4. **Financial Consistency**: `reward_eligible` and `reward_amount_inr` must match ground truth.
5. **Confidence & Robustness**: Agent cannot elevate `data_confidence` if ground truth is `LOW`.
6. **Numeric Claim Verification**: Any percentages, minutes, or currency in `explanation` must match ground truth within rounding limits.
7. **Medical-Claim Guardrail**: Rejects forbidden phrases like *"safe for lungs"*, *"prevents disease"*, or *"100% clean air"*.

---

## 7. Deterministic Fallback Templates

If Bedrock times out or validation fails, deterministic templates instantly format the ground-truth facts:

* **English (`en`)**:
  - `AVOIDABLE`: *"Safer route found. It adds {minutes} minutes and is estimated to reduce pollution exposure by {reduction}%. You may earn ₹{reward}."*
  - `UNAVOIDABLE`: *"No meaningfully safer route was found within the current delivery-time limit. The exposure is classified as unavoidable under this policy."*
  - `LOW`: *"Air conditions are relatively low-risk for this route. No meaningful intervention is recommended."*
  - `INSUFFICIENT_DATA`: *"We don't have enough air-quality data to confidently compare these routes."*

* **Hindi (`hi`)**:
  - `AVOIDABLE`: *"एक सुरक्षित मार्ग मिला है। इसमें लगभग {minutes} मिनट अधिक लगेंगे और अनुमानित प्रदूषण एक्सपोज़र {reduction}% कम हो सकता है। आपको ₹{reward} का लाभ मिलेगा।"*
  - `UNAVOIDABLE`: *"वर्तमान डिलीवरी समय सीमा के भीतर कोई सुरक्षित मार्ग नहीं मिला। इस नीति के तहत यह एक्सपोज़र अपरिहार्य माना गया है।"*

---

## 8. Hard Timeout & Cost Controls

1. **Timeout**: Configured to `8.0s` (maximum `12.0s`). If execution exceeds the limit, a fallback decision is immediately returned without failing the HTTP request.
2. **Max Tokens**: Capped at `300` tokens.
3. **Max Tool Calls**: Capped at `6` calls to prevent execution loops.
4. **Killswitch**: Set `ENABLE_AGENT=false` to bypass the agent layer entirely and return instant deterministic results.

---

## 9. Testing & Verification

1. **Unit & Guardrail Tests**:
   ```powershell
   pytest tests/agent -v
   ```
2. **End-to-End Orchestration Evaluation**:
   ```powershell
   python scripts/test_agent_e2e.py
   ```
3. **Live Amazon Bedrock Integration**:
   ```powershell
   python scripts/test_bedrock_agent.py
   ```
