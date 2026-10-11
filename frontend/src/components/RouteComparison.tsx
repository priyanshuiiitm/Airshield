/**
 * RouteComparison — Phase 3/4 Aurora Enhancement
 * Framer Motion hover effects + Aurora color palette + animated metrics
 */
import React from "react";
import { motion } from "framer-motion";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { formatCurrency } from "../utils/formatting";
import { Wind, TrendingDown, Shield, Car, Check } from "lucide-react";
import { fadeInUp, staggerContainer } from "../animation/motion-config";
import { uberIcons } from "../constants/uberAssets";

interface RouteComparisonProps {
  recommendation: RecommendationResponse;
  selectedRouteId: string | null;
  language: LanguageCode;
  onSelectRoute: (routeId: string) => void;
  isLoading?: boolean;
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
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="routes-list-wrapper">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-4)" }}>
          <div style={{ width: 140, height: 20, background: "rgba(255,255,255,0.05)", borderRadius: 4, animation: "pulse 1.5s infinite" }}></div>
        </div>
        <div className="routes-list-grid">
          {[1, 2].map((i) => (
            <div key={i} style={{ padding: 16, background: "rgba(12, 13, 17, 0.9)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <div style={{ width: "60%", height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginBottom: 12, animation: "pulse 1.5s infinite" }}></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 60, height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 4, animation: "pulse 1.5s infinite" }}></div>
                <div style={{ width: 80, height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 4, animation: "pulse 1.5s infinite" }}></div>
              </div>
              <div style={{ width: "100%", height: 40, background: "rgba(255,255,255,0.03)", borderRadius: 4, animation: "pulse 1.5s infinite" }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { routes, decision, recommendation: rec, classification } = recommendation;
  
  if (!routes || routes.length === 0) {
    return (
      <div className="card comparison-card" style={{ padding: 24, textAlign: "center" }}>
        <h3 style={{ color: "#fff", marginBottom: 8 }}>No Routes Found</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Could not calculate paths between the selected points.
        </p>
      </div>
    );
  }

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
          <Wind size={18} style={{ color: "#ffffff" }} />
          <h3 className="section-title" style={{ color: "#ffffff" }}>
            {language === "hi" ? "मार्गों की तुलना और प्रदूषण स्तर" : "Route Exposure Comparison"}
          </h3>
        </div>
        <span
          className="route-count-badge"
          style={{ background: "rgba(255,255,255,0.06)", color: "#a1a1aa", fontSize: "var(--text-xs)", padding: "2px 10px", borderRadius: "var(--radius-full)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {routes.length} paths analyzed
        </span>
      </motion.div>

      {/* Route Cards (Uber Ryde / Courier Layout) */}
      <div className="routes-list-grid">
        {routes.map((route, idx) => {
          const isFastest = route.route_id === fastestRouteId;
          const isRecommended = route.route_id === rec.route_id;
          const isFocused = (selectedRouteId || rec.route_id) === route.route_id;
          const diffExposure = baselineExposure - route.estimated_integrated_pm25;
          const reductionPct = Math.max(0, Math.round((diffExposure / baselineExposure) * 100));
          const extraMins = fastestRoute ? Math.max(0, route.duration_minutes - fastestRoute.duration_minutes) : 0;

          // Monochrome Badge config
          let badgeLabel = "Alternative";
          let badgeBg = "rgba(255, 255, 255, 0.05)";
          let badgeColor = "#a1a1aa";
          let badgeBorder = "rgba(255, 255, 255, 0.1)";

          if (isFastest && isRecommended) {
            badgeLabel = "Fastest & Recommended";
            badgeBg = "rgba(255, 255, 255, 0.14)";
            badgeColor = "#ffffff";
            badgeBorder = "rgba(255, 255, 255, 0.25)";
          } else if (isFastest) {
            badgeLabel = "Fastest Route";
            badgeBg = "rgba(255, 255, 255, 0.08)";
            badgeColor = "#ffffff";
            badgeBorder = "rgba(255, 255, 255, 0.16)";
          } else if (isRecommended && isAvoidable) {
            badgeLabel = "Safer Route ✓";
            badgeBg = "rgba(255, 255, 255, 0.14)";
            badgeColor = "#ffffff";
            badgeBorder = "rgba(255, 255, 255, 0.25)";
          } else if (reductionPct > 10) {
            badgeLabel = "Clean Corridor";
            badgeBg = "rgba(255, 255, 255, 0.08)";
            badgeColor = "#e4e4e7";
            badgeBorder = "rgba(255, 255, 255, 0.16)";
          }

          const focusedBorder = isFocused
            ? "rgba(255, 255, 255, 0.35)"
            : "rgba(255, 255, 255, 0.08)";

          const focusedShadow = isFocused
            ? "0 8px 24px rgba(0, 0, 0, 0.6)"
            : "none";

          return (
            <motion.div
              key={route.route_id}
              className={`route-card ${isFocused ? "focused" : ""}`}
              variants={fadeInUp}
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate([50]);
                }
                onSelectRoute(route.route_id);
              }}
              whileHover={{ scale: 1.015, borderColor: "rgba(255, 255, 255, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isFocused ? "rgba(20, 21, 27, 0.95)" : "rgba(12, 13, 17, 0.9)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${focusedBorder}`,
                boxShadow: focusedShadow,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              {/* Uber-style Card Header */}
              <div className="route-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <div className="route-name-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: isFocused ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff"
                  }}>
                    <Car size={15} />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", display: "block" }}>
                      {routeLabels[idx] || `Route ${String.fromCharCode(65 + idx)}`}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "#a1a1aa", marginTop: 2 }}>
                      <span style={{ color: "#f59e0b" }}>★</span>
                      <span>{isRecommended ? "4.9 Clean" : "4.7 Direct"}</span>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isFocused && (
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#000000"
                    }}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: "var(--radius-full)", textTransform: "uppercase", letterSpacing: "0.04em", background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                    {badgeLabel}
                  </span>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="route-metrics-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                {/* Exposure Index */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em" }}>Exposure</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#ffffff" }}>
                      {route.exposure_index}
                    </span>
                    <span style={{ fontSize: 10, color: "#71717a" }}>/100</span>
                  </div>
                  {reductionPct > 0 ? (
                    <span style={{ fontSize: 10, color: "#a1a1aa", display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
                      <TrendingDown size={10} /> {reductionPct}% cleaner
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>Baseline</span>
                  )}
                </div>

                {/* PM2.5 */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em" }}>Avg PM2.5</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#ffffff" }}>{route.average_pm25}</span>
                    <span style={{ fontSize: 10, color: "#71717a" }}>µg/m³</span>
                  </div>
                  <ExposureBar value={route.average_pm25} max={300} color="#ffffff" />
                </div>

                {/* Duration */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em" }}>Trip Time</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#ffffff" }}>{route.duration_minutes}</span>
                    <span style={{ fontSize: 10, color: "#71717a" }}>min</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#a1a1aa", marginTop: 2, display: "block" }}>
                    {extraMins > 0 ? `+${extraMins}m detour` : "Fastest"} · {route.distance_km}km
                  </span>
                </div>
              </div>

              {/* Incentive Footer (Uber Dollar Icon) */}
              {isRecommended && isAvoidable && rec.reward_eligible && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.12)", fontSize: "var(--text-xs)", color: "#f4f4f5" }}
                >
                  <img src={uberIcons.dollar} alt="Reward" style={{ width: 13, height: 13, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }} />
                  <span>Worker Micro-Reward: <strong>{formatCurrency(rec.reward_amount_inr || 3)}</strong> for choosing cleaner route</span>
                </motion.div>
              )}

              {isFastest && isUnavoidable && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated, #1a1c26)", border: "1px solid var(--border-subtle)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                  <Shield size={14} style={{ color: "var(--text-primary)", flexShrink: 0 }} />
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
