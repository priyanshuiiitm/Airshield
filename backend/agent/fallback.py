"""
Deterministic fallback generator for AirShieldAgent (Phase 4).
Generates strictly deterministic decisions and worker-facing explanations
without LLM invocation.
"""

from __future__ import annotations
import math
from typing import Dict, Any, Optional
from backend.agent.schemas import AgentDecision


def format_display_number(val: float, decimals: int = 0) -> str:
    """Format floating numbers for display rounding."""
    if decimals == 0:
        return str(int(round(val)))
    return f"{val:.{decimals}f}"


def generate_fallback_decision(
    ground_truth: Dict[str, Any],
    language: str = "en",
    failure_reason: str = "DETERMINISTIC_FALLBACK"
) -> AgentDecision:
    """
    Generate an authoritative AgentDecision directly from deterministic ground truth.
    """
    classification = ground_truth.get("classification", "INSUFFICIENT_DATA")
    rec = ground_truth.get("recommendation", {})
    dec_meta = ground_truth.get("decision", {})
    benefit = ground_truth.get("benefit", {})
    
    selected_route_id = rec.get("selected_route_id") or rec.get("route_id") or dec_meta.get("selected_route_id")
    fastest_route_id = ground_truth.get("fastest_route_id") or dec_meta.get("fastest_route_id")
    reduction_pct = rec.get("exposure_reduction_percent", 0.0)
    reward_eligible = rec.get("reward_eligible", False)
    reward_amount = float(rec.get("reward_amount_inr", 3 if reward_eligible else 0))
    confidence = ground_truth.get("confidence", "HIGH")
    robust = ground_truth.get("robust", dec_meta.get("robust", True))
    extra_minutes = rec.get("additional_minutes", rec.get("additional_time_minutes", 0.0))
    
    # Rounded values for display strings
    rounded_min = format_display_number(extra_minutes, 0)
    rounded_red = format_display_number(reduction_pct, 0)
    rounded_rew = format_display_number(reward_amount, 0)
    
    if classification == "AVOIDABLE":
        reason_code = "SAFER_ROUTE_WITHIN_BUFFER"
        action = "TAKE_SAFER_ROUTE"
        if language == "hi":
            explanation = (
                f"एक सुरक्षित मार्ग मिला है। इसमें लगभग {rounded_min} मिनट अधिक लगेंगे "
                f"और अनुमानित प्रदूषण एक्सपोज़र {rounded_red}% कम हो सकता है। "
                f"आपको ₹{rounded_rew} का लाभ मिलेगा।"
            )
        else:
            explanation = (
                f"Safer route found. It adds {rounded_min} minutes and is estimated "
                f"to reduce pollution exposure by {rounded_red}%. You may earn ₹{rounded_rew}."
            )
            
    elif classification == "UNAVOIDABLE":
        reason_code = "NO_SAFER_ROUTE_WITHIN_BUFFER"
        action = "CONTINUE_WITH_BENEFIT"
        selected_route_id = ground_truth.get("fastest_route_id") or selected_route_id
        if language == "hi":
            explanation = (
                "वर्तमान डिलीवरी समय सीमा के भीतर कोई सुरक्षित मार्ग नहीं मिला। "
                "इस नीति के तहत यह एक्सपोज़र अपरिहार्य माना गया है।"
            )
        else:
            explanation = (
                "No meaningfully safer route was found within the current delivery-time limit. "
                "The exposure is classified as unavoidable under this policy."
            )
            
    elif classification == "LOW":
        reason_code = "LOW_EXPOSURE"
        action = "CONTINUE_FASTEST"
        selected_route_id = ground_truth.get("fastest_route_id") or selected_route_id
        if language == "hi":
            explanation = (
                "इस मार्ग के लिए वायु प्रदूषण का स्तर अपेक्षाकृत कम है। "
                "किसी बदलाव की आवश्यकता नहीं है।"
            )
        else:
            explanation = (
                "Air conditions are relatively low-risk for this route. "
                "No meaningful intervention is recommended."
            )
            
    else:  # INSUFFICIENT_DATA
        reason_code = "INSUFFICIENT_AQI_DATA"
        action = "INSUFFICIENT_DATA"
        selected_route_id = ground_truth.get("fastest_route_id") or selected_route_id
        if language == "hi":
            explanation = (
                "इन मार्गों की तुलना करने के लिए पर्याप्त वायु गुणवत्ता डेटा उपलब्ध नहीं है।"
            )
        else:
            explanation = (
                "We don't have enough air-quality data to confidently compare these routes."
            )

    return AgentDecision(
        outcome=classification,
        reason_code=reason_code,
        route_id=selected_route_id,
        action=action,
        explanation=explanation,
        reward_eligible=reward_eligible,
        reward_amount_inr=reward_amount,
        data_confidence=confidence,
        robust=robust,
        source="DETERMINISTIC_FALLBACK"
    )
