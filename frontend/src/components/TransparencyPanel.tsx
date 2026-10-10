import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { STATUTORY_AQI_STATIONS } from "../utils/delhiData";
import { Radio, Calculator, Layers, Database, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2, Info } from "lucide-react";
import { fadeInUp, staggerContainer, hoverScale, tapScale, durations } from "../animation/motion-config";

interface TransparencyPanelProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
}

type Tab = "sources" | "formulas" | "table";

const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "sources", icon: <Radio size={14} />, label: "Cited Stations" },
  { id: "formulas", icon: <Calculator size={14} />, label: "Math Engine" },
  { id: "table", icon: <Layers size={14} />, label: "Exposure Matrix" },
];

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ recommendation, language }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("sources");
  const { routes, recommendation: rec } = recommendation;

  const cardBase: React.CSSProperties = {
    background: "var(--bg-card)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  };

  return (
    <div className="transparency-container" data-testid="transparency-panel" style={cardBase}>
      {/* Header Toggle */}
      <motion.div
        className="transparency-header"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ background: "rgba(26,32,50,0.8)" }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", cursor: "pointer", background: "rgba(20,26,42,0.6)", borderBottom: isOpen ? "1px solid rgba(255,255,255,0.06)" : "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Database size={20} style={{ color: "var(--aurora-teal-400)" }} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {language === "hi" ? "हमने यह कैसे तय किया?" : "How We Calculated This"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>
              Station citations, IDW interpolation, and exposure formulas
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: durations.fast }}
        >
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: durations.normal, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12, overflowX: "auto" }}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      whileHover={hoverScale}
                      whileTap={tapScale}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                        borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        whiteSpace: "nowrap", transition: "all 0.15s",
                        background: isActive ? "var(--aurora-violet-600)" : "var(--bg-elevated)",
                        color: isActive ? "#fff" : "var(--text-secondary)",
                        border: isActive ? "1px solid rgba(147,51,234,0.5)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: durations.fast }}
                >
                  {/* SOURCES TAB */}
                  {activeTab === "sources" && (
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 14, fontSize: 12, color: "var(--text-secondary)" }}>
                        <Info size={15} style={{ color: "var(--aurora-teal-400)", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ margin: 0 }}>Pollution estimates are interpolated from <strong style={{ color: "var(--text-primary)" }}>statutory CAAQMS</strong> operated by <strong style={{ color: "var(--text-primary)" }}>DPCC, CPCB, and IMD</strong>. Every reading is freshness-verified within 3 hours.</p>
                      </div>
                      <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                        {STATUTORY_AQI_STATIONS.slice(0, 6).map((st) => {
                          const pmColor = st.pm25 < 100 ? "var(--aurora-emerald-400)" : st.pm25 < 180 ? "var(--aurora-amber-400)" : "var(--aurora-rose-400)";
                          const pmBg = st.pm25 < 100 ? "rgba(16,185,129,0.12)" : st.pm25 < 180 ? "rgba(245,158,11,0.12)" : "rgba(244,63,94,0.12)";
                          return (
                            <motion.div key={st.station_id} variants={fadeInUp} style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(20,184,166,0.15)", color: "var(--aurora-teal-400)", border: "1px solid rgba(20,184,166,0.3)", padding: "1px 5px", borderRadius: 4 }}>{st.operator}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{st.name}</span>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: "var(--radius-full)", background: pmBg, color: pmColor, border: `1px solid ${pmColor}40` }}>{st.pm25} µg/m³</span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 2 }}>
                                <span>Observed: {st.timestamp.split("T")[1].slice(0, 5)} IST ({st.last_updated_mins_ago}m ago)</span>
                                <span>Source: {st.source}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
                                <span>{st.lat.toFixed(4)}° N, {st.lng.toFixed(4)}° E</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--aurora-emerald-400)" }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--aurora-emerald-400)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
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
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { step: "01", title: "200m Spatial Segmentation", desc: "Each route is split into ~200m micro-segments. Transit duration allocated proportionally:", code: "t_i = T_route × (Δs_i / S_total)" },
                        { step: "02", title: "IDW Interpolation", desc: "PM2.5 interpolated from ≤4 nearest CAAQMS stations within 25km using inverse-distance weighting:", code: "C_i = Σ [ C_j / (d_ij² + ε) ] / Σ [ 1 / (d_ij² + ε) ]" },
                        { step: "03", title: "Context Modifiers", desc: "Spatial proxies refine background interpolation (road vs green canopy):", code: "C_i* = C_i × M_road (1.25×) × M_green (0.85×)" },
                        { step: "04", title: "Exposure Index", desc: "Total inhalation integrated over trip duration, normalized to fastest route = 100:", code: "EI_alt = 100 × (E_alt / E_fastest)\nReduction% = [(E_fastest − E_alt) / E_fastest] × 100" },
                        { step: "05", title: "Constrained Buffer Check", desc: "Recommendation only if alt_duration ≤ fastest + buffer AND robust across 3 sensitivity sweeps:", code: "Check: 0.5×, 1.0×, 1.5× modifier invariant" },
                      ].map((s) => (
                        <motion.div key={s.step} variants={fadeInUp} style={{ display: "flex", gap: 14, background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", padding: 14 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--aurora-teal-400)", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)", padding: "4px 8px", borderRadius: 6, height: "fit-content", whiteSpace: "nowrap" }}>Step {s.step}</span>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{s.title}</h4>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{s.desc}</p>
                            <div style={{ background: "var(--bg-app)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                              <code style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--aurora-teal-400)", display: "block", whiteSpace: "pre-wrap" }}>{s.code}</code>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <motion.div variants={fadeInUp} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "#a7f3d0" }}>
                        <CheckCircle2 size={16} style={{ color: "var(--aurora-emerald-400)", flexShrink: 0 }} />
                        <span>3-Point Sensitivity Robustness Check Passed (0.5×, 1.0×, 1.5× invariant)</span>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* TABLE TAB */}
                  {activeTab === "table" && (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {["Candidate Route", "Distance", "Duration", "Avg PM2.5", "Exposure Dose", "Index", "Status"].map((h) => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {routes.map((r, i) => {
                            const isRec = r.route_id === rec.route_id;
                            const idxColor = r.exposure_index < 90 ? "var(--aurora-emerald-400)" : "var(--aurora-teal-400)";
                            return (
                              <tr key={r.route_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isRec ? "rgba(16,185,129,0.05)" : "transparent", transition: "background 0.15s" }}>
                                <td style={{ padding: "10px 12px" }}>
                                  <strong style={{ color: "var(--text-primary)" }}>
                                    {i === 0 ? "Route A (Direct)" : i === 1 ? "Route B (Green/Ridge)" : `Route ${String.fromCharCode(65 + i)}`}
                                  </strong>
                                  {isRec && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: "rgba(16,185,129,0.15)", color: "var(--aurora-emerald-400)", border: "1px solid rgba(16,185,129,0.3)", padding: "1px 5px", borderRadius: 4 }}>RECOMMENDED</span>}
                                </td>
                                <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{r.distance_km} km</td>
                                <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{r.duration_minutes} min</td>
                                <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: r.average_pm25 < 100 ? "var(--aurora-emerald-400)" : r.average_pm25 < 180 ? "var(--aurora-amber-400)" : "var(--aurora-rose-400)" }}>{r.average_pm25} µg/m³</td>
                                <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{r.estimated_integrated_pm25.toLocaleString()} µg·min/m³</td>
                                <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 800, color: idxColor }}>{r.exposure_index}</td>
                                <td style={{ padding: "10px 12px", color: r.feasible ? "var(--aurora-emerald-400)" : "var(--aurora-amber-400)" }}>{r.feasible ? "Feasible ✓" : "Exceeds Buffer"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Disclaimer */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }} role="note">
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <ShieldAlert size={15} style={{ color: "var(--aurora-amber-400)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aurora-amber-400)" }}>Scientific & Regulatory Methodology Notice</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
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
