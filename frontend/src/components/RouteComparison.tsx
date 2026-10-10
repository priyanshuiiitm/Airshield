/**
 * RouteComparison — Phase 3/4 Aurora Enhancement
 * Framer Motion hover effects + Aurora color palette + animated metrics
 */
import React from "react";
import { motion } from "framer-motion";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { formatCurrency } from "../utils/formatting";
import { Wind, TrendingDown, Award, Shield } from "lucide-react";
import { fadeInUp, staggerContainer, tapScale } from "../animation/motion-config";

interface RouteComparisonProps {
  recommendation: RecommendationResponse;
  selectedRouteId: string | null;
  language: LanguageCode;
  onSelectRoute: (routeId: string) => void;
}

// Animated fill bar for exposure
const ExposureBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginTop: 3 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0, 0, 0.2, 1], delay: 0.2 }}
        style={{ height: "100%", borderRadius: 999, background: color }}
      />
    </div>
  );
};

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  recommendation,
  selectedRouteId,
  language,
  onSelectRoute,
}) => {
  const { routes, decision, recommendation: rec, classification } = recommendation;
  const fastestRouteId = decision?.fastest_route_id;
  const fastestRoute = routes.find((r) => r.route_id === fastestRouteId);
  const baselineExposure = fastestRoute?.estimated_integrated_pm25 || 1;
  const isAvoidable = classification === "AVOIDABLE";
  const isUnavoidable = classification === "UNAVOIDABLE";

  const routeLabels = [
    "Route A — Direct Arterial",
    "Route B — Green / Ridge Corridor",
    "Route C — Bypass Ring",
  ];

  return (
    <motion.div
      className="route-comparison-container"
      data-testid="route-comparison"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Section Header */}
      <motion.div className="section-header-row" variants={fadeInUp}>
        <div className="section-title-wrap">
          <Wind size={18} style={{ color: "var(--aurora-teal-400)" }} />
          <h3 className="section-title" style={{ color: "var(--text-primary)" }}>
            {language === "hi" ? "मार्गों की तुलना और प्रदूषण स्तर" : "Route Exposure Comparison"}
          </h3>
        </div>
        <span
          className="route-count-badge"
          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", fontSize: "var(--text-xs)", padding: "2px 10px", borderRadius: "var(--radius-full)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {routes.length} paths analyzed
        </span>
      </motion.div>

      {/* Route Cards */}
      <div className="routes-list-grid">
        {routes.map((route, idx) => {
          const isFastest = route.route_id === fastestRouteId;
          const isRecommended = route.route_id === rec.route_id;
          const isFocused = (selectedRouteId || rec.route_id) === route.route_id;
          const diffExposure = baselineExposure - route.estimated_integrated_pm25;
          const reductionPct = Math.max(0, Math.round((diffExposure / baselineExposure) * 100));
          const extraMins = fastestRoute ? Math.max(0, route.duration_minutes - fastestRoute.duration_minutes) : 0;

          // Badge config
          let badgeLabel = "Alternative";
          let badgeBg = "rgba(100,116,139,0.15)";
          let badgeColor = "var(--text-secondary)";
          let badgeBorder = "rgba(100,116,139,0.2)";
          let dotColor = "var(--text-muted)";

          if (isFastest && isRecommended) {
            badgeLabel = "Fastest & Recommended";
            badgeBg = "rgba(20,184,166,0.12)";
            badgeColor = "var(--aurora-teal-400)";
            badgeBorder = "rgba(20,184,166,0.3)";
            dotColor = "var(--aurora-teal-400)";
          } else if (isFastest) {
            badgeLabel = "Fastest Route";
            badgeBg = "rgba(20,184,166,0.12)";
            badgeColor = "var(--aurora-teal-400)";
            badgeBorder = "rgba(20,184,166,0.3)";
            dotColor = "var(--aurora-teal-400)";
          } else if (isRecommended && isAvoidable) {
            badgeLabel = "Safer Route ✓";
            badgeBg = "rgba(16,185,129,0.12)";
            badgeColor = "var(--aurora-emerald-400)";
            badgeBorder = "rgba(16,185,129,0.3)";
            dotColor = "var(--aurora-emerald-400)";
          } else if (reductionPct > 10) {
            badgeLabel = "Clean Corridor";
            badgeBg = "rgba(16,185,129,0.08)";
            badgeColor = "var(--aurora-emerald-400)";
            badgeBorder = "rgba(16,185,129,0.2)";
            dotColor = "var(--aurora-emerald-500)";
          }

          // PM2.5 color
          const pm25Color = route.average_pm25 < 100
            ? "var(--aurora-emerald-400)"
            : route.average_pm25 < 180
            ? "var(--aurora-amber-400)"
            : "var(--aurora-rose-400)";

          const focusedBorder = isFocused
            ? isRecommended
              ? "rgba(16,185,129,0.5)"
              : "rgba(20,184,166,0.5)"
            : "rgba(255,255,255,0.05)";

          const focusedShadow = isFocused
            ? isRecommended
              ? "0 0 16px rgba(16,185,129,0.2)"
              : "0 0 16px rgba(20,184,166,0.15)"
            : "none";

          return (
            <motion.div
              key={route.route_id}
              className={`route-card ${isFocused ? "focused" : ""} ${isRecommended ? "recommended-glow" : ""}`}
              variants={fadeInUp}
              onClick={() => onSelectRoute(route.route_id)}
              whileHover={{ scale: 1.015, borderColor: "rgba(20,184,166,0.4)" }}
              whileTap={tapScale}
              style={{
                background: isFocused ? "var(--bg-card-hover)" : "var(--bg-card)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${focusedBorder}`,
                boxShadow: focusedShadow,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              {/* Card Header */}
              <div className="route-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <div className="route-name-group" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {routeLabels[idx] || `Route ${String.fromCharCode(65 + idx)}`}
                  </span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: "var(--radius-full)", textTransform: "uppercase", letterSpacing: "0.04em", background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                  {badgeLabel}
                </span>
              </div>

              {/* Metrics Row */}
              <div className="route-metrics-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                {/* Exposure Index */}
                <div style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Exposure</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", color: reductionPct >= 15 ? "var(--aurora-emerald-400)" : "var(--text-secondary)" }}>
                      {route.exposure_index}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>/100</span>
                  </div>
                  {reductionPct > 0 ? (
                    <span style={{ fontSize: 10, color: "var(--aurora-emerald-400)", display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
                      <TrendingDown size={10} /> {reductionPct}% cleaner
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Baseline</span>
                  )}
                </div>

                {/* PM2.5 */}
                <div style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Avg PM2.5</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", color: pm25Color }}>{route.average_pm25}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>µg/m³</span>
                  </div>
                  <ExposureBar value={route.average_pm25} max={300} color={pm25Color} />
                </div>

                {/* Duration */}
                <div style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Trip Time</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--aurora-teal-400)" }}>{route.duration_minutes}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>min</span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2, display: "block" }}>
                    {extraMins > 0 ? `+${extraMins}m detour` : "Fastest"} · {route.distance_km}km
                  </span>
                </div>
              </div>

              {/* Incentive Footer */}
              {isRecommended && isAvoidable && rec.reward_eligible && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "var(--text-xs)", color: "#a7f3d0" }}
                >
                  <Award size={14} style={{ color: "var(--aurora-emerald-400)", flexShrink: 0 }} />
                  <span>Worker Micro-Reward: <strong>{formatCurrency(rec.reward_amount_inr || 3)}</strong> for choosing cleaner route</span>
                </motion.div>
              )}

              {isFastest && isUnavoidable && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "var(--text-xs)", color: "#fde68a" }}>
                  <Shield size={14} style={{ color: "var(--aurora-amber-400)", flexShrink: 0 }} />
                  <span>Dose Optimum: Fastest transit minimizes total outdoor inhalation.</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
