import React from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { formatCurrency } from "../utils/formatting";
import { Shield, Wind, TrendingDown, Award } from "lucide-react";

interface RouteComparisonProps {
  recommendation: RecommendationResponse;
  selectedRouteId: string | null;
  language: LanguageCode;
  onSelectRoute: (routeId: string) => void;
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  recommendation,
  selectedRouteId,
  language,
  onSelectRoute
}) => {
  const { routes, decision, recommendation: rec, classification, benefit } = recommendation;
  const fastestRouteId = decision?.fastest_route_id;
  const fastestRoute = routes.find((r) => r.route_id === fastestRouteId);
  const baselineExposure = fastestRoute?.estimated_integrated_pm25 || 1;

  const isAvoidable = classification === "AVOIDABLE";
  const isUnavoidable = classification === "UNAVOIDABLE";

  return (
    <div className="route-comparison-container" data-testid="route-comparison">
      <div className="section-header-row">
        <div className="section-title-wrap">
          <Wind size={18} className="text-emerald" />
          <h3 className="section-title">
            {language === "hi" ? "मार्गों की तुलना और प्रदूषण स्तर" : "Route Exposure Comparison"}
          </h3>
        </div>
        <span className="route-count-badge">{routes.length} paths analyzed</span>
      </div>

      <div className="routes-list-grid">
        {routes.map((route, idx) => {
          const isFastest = route.route_id === fastestRouteId;
          const isRecommended = route.route_id === rec.route_id;
          const isFocused = (selectedRouteId || rec.route_id) === route.route_id;

          // Compute relative reduction % vs fastest
          const diffExposure = baselineExposure - route.estimated_integrated_pm25;
          const reductionPct = Math.max(0, Math.round((diffExposure / baselineExposure) * 100));
          const extraMins = fastestRoute ? Math.max(0, route.duration_minutes - fastestRoute.duration_minutes) : 0;

          // Route title & badge
          let routeBadge = "Alternative";
          let badgeClass = "badge-muted";
          if (isFastest && isRecommended) {
            routeBadge = "Fastest & Recommended";
            badgeClass = "badge-cyan";
          } else if (isFastest) {
            routeBadge = "Fastest Route";
            badgeClass = "badge-cyan";
          } else if (isRecommended && isAvoidable) {
            routeBadge = "Safer Route (Best Choice)";
            badgeClass = "badge-emerald";
          } else if (reductionPct > 10) {
            routeBadge = "Clean Corridor";
            badgeClass = "badge-emerald-subtle";
          }

          return (
            <div
              key={route.route_id}
              className={`route-card ${isFocused ? "focused" : ""} ${
                isRecommended ? "recommended-glow" : ""
              }`}
              onClick={() => onSelectRoute(route.route_id)}
            >
              {/* Card Header */}
              <div className="route-card-header">
                <div className="route-name-group">
                  <div
                    className={`route-indicator-dot ${
                      isRecommended && isAvoidable
                        ? "dot-emerald"
                        : isFastest
                        ? "dot-cyan"
                        : "dot-muted"
                    }`}
                  ></div>
                  <span className="route-title">
                    {idx === 0
                      ? "Route A (Direct Arterial)"
                      : idx === 1
                      ? "Route B (Green / Ridge Corridor)"
                      : `Route ${String.fromCharCode(65 + idx)} (Bypass Ring)`}
                  </span>
                </div>
                <span className={`route-badge ${badgeClass}`}>{routeBadge}</span>
              </div>

              {/* Main Metrics Grid */}
              <div className="route-metrics-row">
                {/* Exposure Index */}
                <div className="metric-pill">
                  <span className="metric-label">Exposure Index</span>
                  <div className="metric-value-wrap">
                    <span
                      className={`metric-num ${
                        reductionPct >= 15 ? "text-emerald" : "text-slate"
                      }`}
                    >
                      {route.exposure_index}
                    </span>
                    <span className="metric-unit">/ 100</span>
                  </div>
                  {reductionPct > 0 ? (
                    <span className="reduction-pill">
                      <TrendingDown size={11} /> {reductionPct}% cleaner
                    </span>
                  ) : (
                    <span className="baseline-pill">Baseline</span>
                  )}
                </div>

                {/* Avg PM2.5 */}
                <div className="metric-pill">
                  <span className="metric-label">Avg PM2.5</span>
                  <div className="metric-value-wrap">
                    <span
                      className={`metric-num ${
                        route.average_pm25 < 100
                          ? "text-emerald"
                          : route.average_pm25 < 180
                          ? "text-amber"
                          : "text-red"
                      }`}
                    >
                      {route.average_pm25}
                    </span>
                    <span className="metric-unit">µg/m³</span>
                  </div>
                  <span className="sub-detail">
                    {route.average_pm25 < 100
                      ? "Moderate"
                      : route.average_pm25 < 180
                      ? "Very Poor"
                      : "Severe"}
                  </span>
                </div>

                {/* Duration & Distance */}
                <div className="metric-pill">
                  <span className="metric-label">Trip Time</span>
                  <div className="metric-value-wrap">
                    <span className="metric-num text-cyan">{route.duration_minutes}</span>
                    <span className="metric-unit">mins</span>
                  </div>
                  <span className="sub-detail">
                    {extraMins > 0 ? `+${extraMins} min detour` : "Fastest speed"} • {route.distance_km} km
                  </span>
                </div>
              </div>

              {/* Reward or Protection Incentive Footer */}
              {isRecommended && isAvoidable && rec.reward_eligible && (
                <div className="route-incentive-bar incentive-emerald">
                  <Award size={15} className="text-emerald" />
                  <span>
                    Worker Micro-Reward: <strong>{formatCurrency(rec.reward_amount_inr || 3)}</strong> credited for choosing cleaner route
                  </span>
                </div>
              )}

              {isFastest && isUnavoidable && benefit?.eligible && (
                <div className="route-incentive-bar incentive-amber">
                  <Shield size={15} className="text-amber" />
                  <span>
                    Smog Protection Benefit: <strong>{formatCurrency(benefit.amount_inr || 5)}</strong> triggered automatically
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
