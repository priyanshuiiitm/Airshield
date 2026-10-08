def get_fallback_template(data: dict) -> dict:
    """
    Generates the UI payload deterministically without relying on an LLM.
    This guarantees the numerical facts are exact and safe.
    """
    classification = data.get("classification", "INSUFFICIENT_DATA")
    
    if classification == "AVOIDABLE":
        return {
            "title": "🫁 Safer route found",
            "message": f"+{data['additional_time_min']} min\n↓{data['exposure_reduction_pct']}% estimated exposure\nEarn ₹{data['reward_amount']}",
            "action": "Take safer route",
            "route_id": data["best_feasible_route_id"]
        }
    elif classification == "UNAVOIDABLE_WITHIN_POLICY":
        return {
            "title": "⚠️ No meaningfully safer route within your delivery time",
            "message": f"Exposure classified as unavoidable under the current policy.\n₹{data['benefit_amount']} health benefit triggered",
            "action": "Proceed on fastest route",
            "route_id": data["fastest_route_id"]
        }
    elif classification == "LOW":
        return {
            "title": "🟢 Air conditions are acceptable",
            "message": "No meaningful intervention needed.",
            "action": "Proceed on fastest route",
            "route_id": data["fastest_route_id"]
        }
    else: # INSUFFICIENT_DATA
        return {
            "title": "⚪ We couldn't confidently compare these routes",
            "message": "Air-quality coverage is insufficient.",
            "action": "Proceed on fastest route",
            "route_id": data.get("fastest_route_id", "DEFAULT")
        }
