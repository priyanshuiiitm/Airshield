"""
Strict deterministic validator for AirShieldAgent decisions (Phase 4).
Validates agent decisions against authoritative ground truth and enforces guardrails.
"""

from __future__ import annotations
import re
from typing import Dict, Any, Tuple, Optional
from backend.agent.schemas import AgentDecision


# Medical and over-claiming forbidden keywords/phrases
FORBIDDEN_MEDICAL_TERMS = [
    "safe for your lungs",
    "lung safety",
    "lung damage",
    "respiratory disease",
    "prevents disease",
    "prevents illness",
    "prevents health damage",
    "health damage",
    "medically safe",
    "medical protection",
    "toxic pollution",
    "avoids asthma",
    "asthma cure",
    "guarantees clean air",
    "100% clean",
    "free from pollution"
]


def extract_percentages(text: str) -> list[float]:
    """Extract all percentage numbers from text (e.g., '41%', '20.3%')."""
    matches = re.findall(r'(\d+(?:\.\d+)?)\s*%', text)
    return [float(m) for m in matches]


def extract_minutes(text: str) -> list[float]:
    """Extract minute numbers from text (e.g., '2 minutes', '2.5 min', '2 मिनट')."""
    matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min|मिनट)', text, re.IGNORECASE)
    return [float(m) for m in matches]


def extract_currency(text: str) -> list[float]:
    """Extract currency numbers from text (e.g., '₹3', 'INR 3', '₹ 3')."""
    matches = re.findall(r'(?:₹|INR|Rs\.?)\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    return [float(m) for m in matches]


def validate_agent_decision(
    decision: AgentDecision,
    ground_truth: Dict[str, Any]
) -> Tuple[bool, Optional[str]]:
    """
    Validate an AgentDecision against ground truth.
    Returns (is_valid, failure_reason).
    """
    expected_outcome = ground_truth.get("classification")
    rec = ground_truth.get("recommendation", {})
    dec_meta = ground_truth.get("decision", {})
    expected_route_id = rec.get("selected_route_id") or rec.get("route_id") or dec_meta.get("selected_route_id")
    fastest_route_id = ground_truth.get("fastest_route_id") or dec_meta.get("fastest_route_id")
    expected_reduction = rec.get("exposure_reduction_percent", 0.0)
    expected_reward_eligible = rec.get("reward_eligible", False)
    expected_reward_amount = float(rec.get("reward_amount_inr", 3.0 if expected_reward_eligible else 0.0))
    expected_confidence = ground_truth.get("confidence", "HIGH")
    expected_robust = ground_truth.get("robust", dec_meta.get("robust", True))
    expected_extra_min = rec.get("additional_minutes", rec.get("additional_time_minutes", 0.0))
    
    # 1. Outcome Check
    if decision.outcome != expected_outcome:
        return False, f"Outcome mismatch: expected {expected_outcome}, got {decision.outcome}"
        
    # 2. Route Matching
    if decision.outcome == "AVOIDABLE":
        if decision.route_id != expected_route_id:
            return False, f"Selected route mismatch: expected {expected_route_id}, got {decision.route_id}"
        if decision.action != "TAKE_SAFER_ROUTE":
            return False, f"Action mismatch for AVOIDABLE: expected TAKE_SAFER_ROUTE, got {decision.action}"
    elif decision.outcome == "UNAVOIDABLE":
        # In UNAVOIDABLE, agent must NOT recommend the unfeasible/outside-buffer route as the primary route
        if decision.route_id and decision.route_id != fastest_route_id:
            return False, f"UNAVOIDABLE cannot recommend outside-buffer route {decision.route_id} as operational choice"
    elif decision.outcome == "LOW":
        if decision.action != "CONTINUE_FASTEST":
            return False, f"Action mismatch for LOW: expected CONTINUE_FASTEST, got {decision.action}"
    elif decision.outcome == "INSUFFICIENT_DATA":
        if decision.action != "INSUFFICIENT_DATA":
            return False, f"Action mismatch for INSUFFICIENT_DATA: expected INSUFFICIENT_DATA, got {decision.action}"

    # 3. Reward Eligibility & Amount
    if decision.reward_eligible != expected_reward_eligible:
        return False, f"Reward eligibility mismatch: expected {expected_reward_eligible}, got {decision.reward_eligible}"
        
    if decision.reward_eligible:
        if abs(decision.reward_amount_inr - expected_reward_amount) > 0.01:
            return False, f"Reward amount mismatch: expected {expected_reward_amount}, got {decision.reward_amount_inr}"
    else:
        if decision.reward_amount_inr > 0:
            return False, f"Reward amount must be 0 when not eligible, got {decision.reward_amount_inr}"

    # 4. Confidence & Robustness
    if expected_confidence == "LOW" and decision.data_confidence in ("HIGH", "MEDIUM"):
        return False, f"Confidence elevation forbidden: ground truth is LOW, got {decision.data_confidence}"
        
    if not expected_robust and decision.robust:
        return False, "Robustness elevation forbidden: ground truth is False, got True"

    # 5. Medical Claim Guardrail
    explanation_lower = decision.explanation.lower()
    for term in FORBIDDEN_MEDICAL_TERMS:
        if term in explanation_lower:
            return False, f"Medical guardrail violation: unsupported health claim '{term}' detected"

    # 6. Numeric Claim Verification in Explanation
    # Verify percentages
    pcts = extract_percentages(decision.explanation)
    for p in pcts:
        # Check against reduction percent
        if abs(p - round(expected_reduction)) > 1.5 and abs(p - expected_reduction) > 1.5:
            return False, f"Unsupported percentage in explanation: {p}% does not match expected {expected_reduction:.1f}%"

    # Verify minutes
    mins = extract_minutes(decision.explanation)
    for m in mins:
        if abs(m - round(expected_extra_min)) > 1.5 and abs(m - expected_extra_min) > 1.5:
            return False, f"Unsupported minutes in explanation: {m} does not match expected {expected_extra_min:.1f}"

    # Verify currency amounts
    currs = extract_currency(decision.explanation)
    for c in currs:
        if abs(c - expected_reward_amount) > 0.5:
            return False, f"Unsupported currency in explanation: ₹{c} does not match expected ₹{expected_reward_amount}"

    return True, None
