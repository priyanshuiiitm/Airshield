"""
AirShield Orchestration Service (Phase 3).
Coordinates the pure deterministic engine with persistence and external adapters.
Designed with an abstract interface to allow future Agent/LLM orchestrators without changing the core engine.
"""

from __future__ import annotations
import os
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Optional, Any
from datetime import datetime, timezone

from backend.core.models import (
    Coordinate,
    Route,
    AQIStation,
    ExposureResult,
    OptimizationResult,
    ClassificationResult,
    RouteOutcome,
    Confidence
)
from backend.core.config import DEFAULT_CONFIG, Config
from backend.core.routes import (
    deduplicate_routes,
    AmazonLocationRouteProvider,
    FixtureRouteProvider
)
from backend.core.aqi import (
    filter_fresh_stations,
    select_nearest_stations,
    FixtureAQIProvider
)
from backend.core.exposure import (
    compute_route_exposure,
    compute_relative_exposure_indices,
    evaluate_robustness
)
from backend.core.optimize import optimize_routes
from backend.core.classify import classify_trip
from backend.repository.dynamodb import DynamoDBRepository
from backend.repository.s3 import S3Repository
from data.find_scenarios import synthesize_candidate_routes_snapshot
from tests.conftest import load_stations_from_fixture

logger = logging.getLogger("airshield.orchestrator")


class BaseOrchestrator(ABC):
    """Abstract interface for route recommendation orchestrator."""

    @abstractmethod
    def recommend(self, params: dict[str, Any]) -> dict[str, Any]:
        """Generate structured route recommendation."""
        pass


class DeterministicOrchestrator(BaseOrchestrator):
    """
    Standard deterministic orchestration service.
    Executes the exact Phase 1 deterministic mathematical engine without requiring an LLM.
    """

    def __init__(
        self,
        dynamodb_repo: Optional[DynamoDBRepository] = None,
        s3_repo: Optional[S3Repository] = None,
        location_provider: Optional[AmazonLocationRouteProvider] = None
    ):
        self.dynamodb = dynamodb_repo or DynamoDBRepository()
        self.s3 = s3_repo or S3Repository()
        self.location_provider = location_provider
        self.config = DEFAULT_CONFIG

    def _get_routes(self, pickup: Coordinate, drop: Coordinate, mode: str) -> list[Route]:
        """Obtain raw candidate routes."""
        if mode == "live" and self.location_provider is not None:
            try:
                routes = self.location_provider.get_routes(pickup, drop, travel_mode="Car")
                if routes and len(routes) >= 2:
                    return routes
            except Exception as e:
                logger.warning(f"Live route calculation failed: {e}. Falling back to snapshot routes.")

        # Snapshot / fallback mode
        return synthesize_candidate_routes_snapshot(pickup, drop)

    def _get_stations(self, mode: str, snapshot_id: str) -> list[AQIStation]:
        """Obtain AQI stations."""
        if mode == "live":
            try:
                items = self.dynamodb.get_latest_station_readings(max_age_hours=self.config.FRESHNESS_HOURS)
                if items and len(items) >= 2:
                    stations = []
                    for item in items:
                        t = datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00"))
                        stations.append(
                            AQIStation(
                                station_id=item["station_id"],
                                lat=float(item["lat"]),
                                lng=float(item["lng"]),
                                pm25=float(item["pm25"]),
                                timestamp=t,
                                source=item.get("source", "dynamodb")
                            )
                        )
                    fresh = filter_fresh_stations(stations, freshness_hours=self.config.FRESHNESS_HOURS)
                    if len(fresh) >= 2:
                        return fresh
            except Exception as e:
                logger.warning(f"Failed to fetch stations from DynamoDB: {e}. Falling back to snapshot.")

        # Snapshot mode
        return load_stations_from_fixture("delhi_stations.json")

    def _build_message(self, clf: ClassificationResult, opt: OptimizationResult, language: str) -> str:
        """Generate deterministic natural language explanation without calling an LLM."""
        if clf.outcome == RouteOutcome.AVOIDABLE:
            if language == "hi":
                return f"स्वच्छ मार्ग उपलब्ध है। यह केवल +{opt.additional_duration_min:.1f} मिनट जोड़ेगा और प्रदूषण जोखिम को {opt.reduction_percent:.0f}% कम करेगा।"
            return f"A safer route was found. It adds {opt.additional_duration_min:.1f} min and is estimated to reduce pollution exposure by {opt.reduction_percent:.0f}%."

        elif clf.outcome == RouteOutcome.UNAVOIDABLE:
            if clf.better_outside_buffer:
                if language == "hi":
                    return f"वर्तमान डिलीवरी समय सीमा के भीतर कोई सुरक्षित मार्ग नहीं है। +{clf.extra_minutes_needed:.1f} मिनट पर {clf.outside_buffer_reduction_percent:.0f}% स्वच्छ मार्ग उपलब्ध है।"
                return f"No safer route exists within the {DEFAULT_CONFIG.DEFAULT_BUFFER_MIN:.0f}-minute delivery buffer. A cleaner route requires +{clf.extra_minutes_needed:.1f} min."
            if language == "hi":
                return "क्षेत्र में प्रदूषण स्तर अधिक है और कोई वैकल्पिक मार्ग उपलब्ध नहीं है।"
            return "Pollution levels are elevated across all available route alternatives."

        elif clf.outcome == RouteOutcome.LOW:
            if language == "hi":
                return "हवा की गुणवत्ता स्वीकार्य है। सबसे तेज़ मार्ग का उपयोग करें।"
            return "Air quality is within acceptable limits. Take the fastest route."

        else:
            if language == "hi":
                return "वायु गुणवत्ता निगरानी डेटा अपर्याप्त है। सबसे तेज़ मार्ग अनुशंसित है।"
            return "Insufficient local air monitoring stations to compare routes reliably."

    def recommend(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Orchestrates route recommendation:
        Routes -> AQI -> Exposure -> Optimization -> Robustness -> Classification -> Persistence.
        """
        pickup: Coordinate = params["pickup"]
        drop: Coordinate = params["drop"]
        buffer_min: float = params.get("buffer_min", self.config.DEFAULT_BUFFER_MIN)
        mode: str = params.get("mode", "snapshot")
        snapshot_id: str = params.get("snapshot_id", "demo_v1")
        worker_id: str = params.get("worker_id", "demo-worker")
        language: str = params.get("language", "en")

        trip_id = f"trip_{uuid.uuid4().hex[:12]}"

        # 1. Routes
        raw_routes = self._get_routes(pickup, drop, mode)
        unique_routes = deduplicate_routes(raw_routes)
        if len(unique_routes) < 2:
            unique_routes = raw_routes  # Ensure at least 1 route if deduplication left 1

        # 2. AQI Stations
        stations = self._get_stations(mode, snapshot_id)
        frozen_time = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc) if mode == "snapshot" else None
        fresh_stations = filter_fresh_stations(stations, freshness_hours=self.config.FRESHNESS_HOURS, now=frozen_time)

        # 3. Exposure Integration
        exp_map: dict[str, ExposureResult] = {}
        for r in unique_routes:
            exp_map[r.route_id] = compute_route_exposure(r, fresh_stations)

        # 4. Optimization
        opt = optimize_routes(unique_routes, exp_map, buffer_min=buffer_min)

        # 5. Relative exposure index normalization
        norm_exp = compute_relative_exposure_indices(exp_map, opt.fastest_route_id)

        # 6. Robustness sensitivity evaluation
        is_robust, winner_id = evaluate_robustness(unique_routes, fresh_stations, buffer_min=buffer_min)

        # 7. Classification
        fastest_exp = norm_exp[opt.fastest_route_id]
        clf = classify_trip(
            opt_result=opt,
            fastest_exposure_result=fastest_exp,
            all_exposure_results=norm_exp,
            all_routes=unique_routes,
            is_robust=is_robust,
            buffer_min=buffer_min
        )

        # 8. Recommendation Action & Financial Triggers
        action = "TAKE_FASTEST_ROUTE"
        reward_amount = 0
        if clf.outcome == RouteOutcome.AVOIDABLE:
            action = "TAKE_SAFER_ROUTE"
            reward_amount = self.config.REWARD_AVOIDABLE
        elif clf.outcome == RouteOutcome.UNAVOIDABLE:
            action = "MAINTAIN_ROUTE_PROTECTION_BENEFIT"
            reward_amount = self.config.BENEFIT_UNAVOIDABLE

        # 9. Format Route details with Geometries for Frontend Map Rendering
        route_details = []
        for r in unique_routes:
            e = norm_exp[r.route_id]
            route_details.append({
                "route_id": r.route_id,
                "duration_minutes": round(r.duration_min, 1),
                "duration_sec": r.duration_sec,
                "distance_km": round(r.distance_km, 2),
                "distance_m": r.distance_m,
                "exposure_index": round(e.exposure_index, 1),
                "average_pm25": round(e.average_pm25, 1),
                "estimated_integrated_pm25": round(e.estimated_integrated_pm25, 1),
                "feasible": r.route_id in opt.feasible_route_ids,
                "confidence": e.confidence.value,
                "geometry": [{"lat": pt.lat, "lng": pt.lng} for pt in r.geometry]
            })

        message = self._build_message(clf, opt, language)

        response_data = {
            "trip_id": trip_id,
            "classification": clf.outcome.value,
            "recommendation": {
                "route_id": opt.selected_route_id,
                "action": action,
                "additional_minutes": round(opt.additional_duration_min, 1),
                "exposure_reduction_percent": round(opt.reduction_percent, 1),
                "reward_eligible": clf.reward_eligible,
                "reward_amount_inr": reward_amount if clf.reward_eligible else 0
            },
            "routes": route_details,
            "decision": {
                "fastest_route_id": opt.fastest_route_id,
                "selected_route_id": opt.selected_route_id,
                "buffer_minutes": buffer_min,
                "robust": is_robust
            },
            "benefit": {
                "type": "simulated_reward" if clf.reward_eligible else ("simulated_benefit" if clf.benefit_eligible else "none"),
                "amount_inr": reward_amount if (clf.reward_eligible or clf.benefit_eligible) else 0,
                "eligible": clf.reward_eligible or clf.benefit_eligible
            },
            "metadata": {
                "snapshot_id": snapshot_id,
                "model_version": "1.0.0",
                "data_mode": mode,
                "modelled": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            "message": message
        }

        # 10. Audit persistence to DynamoDB
        self.dynamodb.save_trip({
            "trip_id": trip_id,
            "worker_id": worker_id,
            "pickup_rounded": {"lat": round(pickup.lat, 3), "lng": round(pickup.lng, 3)},
            "drop_rounded": {"lat": round(drop.lat, 3), "lng": round(drop.lng, 3)},
            "buffer_minutes": buffer_min,
            "classification": clf.outcome.value,
            "fastest_route_id": opt.fastest_route_id,
            "selected_route_id": opt.selected_route_id,
            "reduction_percent": opt.reduction_percent,
            "reward_eligible": clf.reward_eligible,
            "reward_amount_inr": reward_amount,
            "snapshot_id": snapshot_id
        })

        return response_data
