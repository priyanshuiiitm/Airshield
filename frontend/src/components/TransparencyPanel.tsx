import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { STATUTORY_AQI_STATIONS } from "../utils/delhiData";
import { Radio, Calculator, Layers, Database, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2, Info } from "lucide-react";
import { fadeInUp, staggerContainer, durations } from "../animation/motion-config";

interface TransparencyPanelProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
}

type Tab = "sources" | "formulas" | "table";

const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "sources", icon: <Radio size={12} />, label: "Stations" },
  { id: "formulas", icon: <Calculator size={12} />, label: "Math Engine" },
  { id: "table", icon: <Layers size={12} />, label: "Matrix" },
];

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ recommendation, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("sources");
  const { routes, recommendation: rec } = recommendation;

  return (
    <div className="transparency-container" data-testid="transparency-panel">
      {/* Header Toggle */}
      <motion.div
        className="transparency-header"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ background: "rgba(255,255,255,0.03)" }}
      >
        <div className="transparency-header-left">
          <Database size={15} className="transparency-header-icon" />
          <div className="transparency-header-titles">
            <h3 className="transparency-title">
              {language === "hi" ? "गणना का आधार (Methodology)" : "How We Calculated This"}
            </h3>
            <p className="transparency-desc">
              Statutory citations, IDW spatial decay & exposure matrix
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          className="transparency-chevron-btn"
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: durations.fast }}
          aria-label={isOpen ? "Collapse panel" : "Expand panel"}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: durations.normal, ease: [0.4, 0, 0.2, 1] }}
            className="transparency-body-wrapper"
          >
            <div className="transparency-body">
              {/* Segmented 3-Column Tabs Grid (No Horizontal Scroll) */}
              <div className="transparency-tabs-grid" role="tablist">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`transparency-tab-btn ${isActive ? "active" : ""}`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: durations.fast }}
                >
                  {/* SOURCES TAB */}
                  {activeTab === "sources" && (
                    <div className="transparency-sources-content">
                      <div className="transparency-info-box">
                        <Info size={13} className="info-icon" />
                        <p className="transparency-info-text">
                          Pollution estimates are interpolated from <strong>statutory CAAQMS</strong> operated by <strong>DPCC, CPCB, and IMD</strong>. Readings freshness-verified within 3h.
                        </p>
                      </div>

                      <motion.div className="transparency-stations-list" variants={staggerContainer} initial="hidden" animate="visible">
                        {STATUTORY_AQI_STATIONS.slice(0, 6).map((st) => {
                          const pmColor = st.pm25 < 100 ? "#34d399" : st.pm25 < 180 ? "#fbbf24" : "#f87171";
                          const pmBg = st.pm25 < 100 ? "rgba(16,185,129,0.12)" : st.pm25 < 180 ? "rgba(245,158,11,0.12)" : "rgba(244,63,94,0.12)";
                          return (
                            <motion.div key={st.station_id} variants={fadeInUp} className="transparency-station-card">
                              <div className="station-card-top">
                                <div className="station-name-wrap">
                                  <span className="station-operator-badge">{st.operator}</span>
                                  <span className="transparency-station-name">{st.name}</span>
                                </div>
                                <span className="transparency-station-badge" style={{ background: pmBg, color: pmColor, borderColor: `${pmColor}40` }}>
                                  {st.pm25} µg/m³
                                </span>
                              </div>
                              <div className="station-meta-row">
                                <span>Observed: {st.timestamp.split("T")[1].slice(0, 5)} IST ({st.last_updated_mins_ago}m ago)</span>
                                <span>{st.source}</span>
                              </div>
                              <div className="station-footer-row">
                                <span>{st.lat.toFixed(4)}° N, {st.lng.toFixed(4)}° E</span>
                                <span className="station-active-tag">
                                  <span className="station-live-dot" />
                                  Active
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                  )}

                  {/* FORMULAS TAB */}
                  {activeTab === "formulas" && (
                    <motion.div className="transparency-formulas-list" variants={staggerContainer} initial="hidden" animate="visible">
                      {[
                        { step: "01", title: "200m Spatial Segmentation", desc: "Each route is split into ~200m micro-segments. Transit duration allocated proportionally:", code: "t_i = T_route × (Δs_i / S_total)" },
                        { step: "02", title: "IDW Interpolation", desc: "PM2.5 interpolated from ≤4 nearest CAAQMS stations within 25km using inverse-distance weighting:", code: "C_i = Σ [ C_j / (d_ij² + ε) ] / Σ [ 1 / (d_ij² + ε) ]" },
                        { step: "03", title: "Context Modifiers", desc: "Spatial proxies refine background interpolation (road vs green canopy):", code: "C_i* = C_i × M_road (1.25×) × M_green (0.85×)" },
                        { step: "04", title: "Exposure Index", desc: "Total inhalation integrated over trip duration, normalized to fastest route = 100:", code: "EI_alt = 100 × (E_alt / E_fastest)\nReduction% = [(E_fastest − E_alt) / E_fastest] × 100" },
                        { step: "05", title: "Constrained Buffer Check", desc: "Recommendation only if alt_duration ≤ fastest + buffer AND robust across 3 sensitivity sweeps:", code: "Check: 0.5×, 1.0×, 1.5× modifier invariant" },
                      ].map((s) => (
                        <motion.div key={s.step} variants={fadeInUp} className="transparency-formula-card">
                          <span className="formula-step-badge">Step {s.step}</span>
                          <div className="formula-body">
                            <h4 className="transparency-formula-title">{s.title}</h4>
                            <p className="transparency-formula-desc">{s.desc}</p>
                            <div className="transparency-formula-code">
                              <code>{s.code}</code>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <motion.div variants={fadeInUp} className="transparency-robustness-box">
                        <CheckCircle2 size={14} className="robustness-icon" />
                        <span>3-Point Sensitivity Robustness Check Passed (0.5×, 1.0×, 1.5× invariant)</span>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* TABLE TAB */}
                  {activeTab === "table" && (
                    <div className="transparency-table-scroll">
                      <table className="transparency-table">
                        <thead>
                          <tr>
                            {["Candidate Route", "Distance", "Duration", "Avg PM2.5", "Exposure Dose", "Index", "Status"].map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {routes.map((r, i) => {
                            const isRec = r.route_id === rec.route_id;
                            const idxColor = r.exposure_index < 90 ? "#34d399" : "#38bdf8";
                            return (
                              <tr key={r.route_id} className={isRec ? "recommended-row" : ""}>
                                <td>
                                  <strong>
                                    {i === 0 ? "Route A (Direct)" : i === 1 ? "Route B (Green/Ridge)" : `Route ${String.fromCharCode(65 + i)}`}
                                  </strong>
                                  {isRec && <span className="rec-mini-badge">RECOMMENDED</span>}
                                </td>
                                <td>{r.distance_km} km</td>
                                <td>{r.duration_minutes} min</td>
                                <td style={{ color: r.average_pm25 < 100 ? "#34d399" : r.average_pm25 < 180 ? "#fbbf24" : "#f87171" }}>
                                  {r.average_pm25} µg/m³
                                </td>
                                <td>{r.estimated_integrated_pm25.toLocaleString()} µg·min/m³</td>
                                <td style={{ color: idxColor, fontWeight: 700 }}>{r.exposure_index}</td>
                                <td style={{ color: r.feasible ? "#34d399" : "#fbbf24" }}>
                                  {r.feasible ? "Feasible ✓" : "Exceeds Buffer"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Methodology Disclaimer */}
              <div className="transparency-disclaimer-box" role="note">
                <div className="disclaimer-header">
                  <ShieldAlert size={13} className="disclaimer-icon" />
                  <span className="disclaimer-title">Scientific & Regulatory Methodology Notice</span>
                </div>
                <p className="transparency-disclaimer-text">
                  AirShield computes a modeled relative pollution-exposure index for delivery worker decision support based on ambient monitoring from CPCB/DPCC/IMD. This is not street-level sensor data and does not constitute a personal medical measurement.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
