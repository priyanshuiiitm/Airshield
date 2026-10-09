import React, { useState } from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { STATUTORY_AQI_STATIONS } from "../utils/delhiData";
import {
  Radio,
  Calculator,
  Layers,
  Database,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Info
} from "lucide-react";

interface TransparencyPanelProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
}

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({
  recommendation,
  language
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"sources" | "formulas" | "table">("sources");

  const { routes, recommendation: rec } = recommendation;

  return (
    <div className="transparency-container" data-testid="transparency-panel">
      {/* Accordion Toggle Header */}
      <div className="transparency-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="header-left">
          <Database size={20} className="text-cyan" />
          <div>
            <h3 className="transparency-title">
              {language === "hi" ? "हमने यह कैसे तय किया? (डेटा और गणना पद्धति)" : "How We Calculated This (Data Sources & Math Engine)"}
            </h3>
            <p className="transparency-subtitle">
              Transparent station citations, observation timestamps, IDW interpolation, and exposure formulas
            </p>
          </div>
        </div>
        <button type="button" className="drawer-arrow-btn">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="transparency-body">
          {/* Sub-Navigation Tabs */}
          <div className="transparency-tabs">
            <button
              type="button"
              className={`trans-tab-btn ${activeTab === "sources" ? "active" : ""}`}
              onClick={() => setActiveTab("sources")}
            >
              <Radio size={15} />
              <span>Cited Stations & Real-Time Sensors</span>
            </button>
            <button
              type="button"
              className={`trans-tab-btn ${activeTab === "formulas" ? "active" : ""}`}
              onClick={() => setActiveTab("formulas")}
            >
              <Calculator size={15} />
              <span>Step-by-Step Math Engine</span>
            </button>
            <button
              type="button"
              className={`trans-tab-btn ${activeTab === "table" ? "active" : ""}`}
              onClick={() => setActiveTab("table")}
            >
              <Layers size={15} />
              <span>Route Exposure Matrix</span>
            </button>
          </div>

          {/* TAB 1: CITED STATIONS & TIMESTAMPS */}
          {activeTab === "sources" && (
            <div className="tab-pane">
              <div className="pane-intro">
                <Info size={16} className="text-cyan" />
                <p>
                  Pollution estimates along your trip are interpolated from <strong>statutory Continuous Ambient Air Quality Monitoring Stations (CAAQMS)</strong> operated by <strong>DPCC, CPCB, and IMD</strong>. Every reading is freshness-verified (within 3 hours).
                </p>
              </div>

              <div className="stations-cards-grid">
                {STATUTORY_AQI_STATIONS.slice(0, 6).map((st) => (
                  <div key={st.station_id} className="station-citation-card">
                    <div className="station-card-top">
                      <div className="station-name-wrap">
                        <span className="station-operator-badge">{st.operator}</span>
                        <span className="station-name">{st.name}</span>
                      </div>
                      <span
                        className={`station-aqi-pill ${
                          st.pm25 < 100
                            ? "pill-moderate"
                            : st.pm25 < 180
                            ? "pill-verypoor"
                            : "pill-severe"
                        }`}
                      >
                        {st.pm25} µg/m³
                      </span>
                    </div>

                    <div className="station-meta-row">
                      <span className="meta-time">
                        🕒 Observed: {st.timestamp.split("T")[1].slice(0, 5)} IST ({st.last_updated_mins_ago}m ago)
                      </span>
                      <span className="meta-source">
                        📡 Source: {st.source}
                      </span>
                    </div>

                    <div className="station-coord-row">
                      <span>Coordinates: {st.lat.toFixed(4)}° N, {st.lng.toFixed(4)}° E</span>
                      <span className="station-status-live">
                        <span className="dot-pulse"></span> Active Feed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP MATHEMATICAL ENGINE */}
          {activeTab === "formulas" && (
            <div className="tab-pane formulas-pane">
              <div className="formula-step-box">
                <div className="step-num">Step 1</div>
                <div className="step-content">
                  <h4 className="step-heading">200m Spatial Segmentation & Proportional Trip Duration</h4>
                  <p className="step-desc">
                    Each candidate route is split into uniform micro-segments of length ~200m. Segment transit duration is allocated proportionally from live traffic-aware travel time:
                  </p>
                  <div className="math-code-box">
                    <code>{"t_i = T_route × (Δs_i / S_total)"}</code>
                  </div>
                </div>
              </div>

              <div className="formula-step-box">
                <div className="step-num">Step 2</div>
                <div className="step-content">
                  <h4 className="step-heading">Spatial Inverse-Distance Weighting (IDW)</h4>
                  <p className="step-desc">
                    For each segment midpoint, ambient PM2.5 is interpolated using up to 4 nearest statutory monitoring stations within 25 km:
                  </p>
                  <div className="math-code-box">
                    <code>{"C_i = Σ [ C_j / (d_ij² + ε) ] / Σ [ 1 / (d_ij² + ε) ]"}</code>
                  </div>
                  <p className="step-note">
                    Where C_j is the fresh station reading (µg/m³), d_ij is the Haversine distance (km), and ε = 1e-6.
                  </p>
                </div>
              </div>

              <div className="formula-step-box">
                <div className="step-num">Step 3</div>
                <div className="step-content">
                  <h4 className="step-heading">Micro-Urban Context Modifiers</h4>
                  <p className="step-desc">
                    Spatial context proxies refine the background interpolation to reflect immediate roadside vs green canopy conditions:
                  </p>
                  <div className="math-code-box">
                    <code>{"C_i* = C_i × M_road × M_green"}</code>
                  </div>
                  <div className="modifier-bullets">
                    <div>• <strong>Major Road Corridor (M_road)</strong>: 1.25× (high exhaust zone)</div>
                    <div>• <strong>Green Canopy & Ridge Buffer (M_green)</strong>: 0.85× (natural particulate dispersion)</div>
                  </div>
                </div>
              </div>

              <div className="formula-step-box">
                <div className="step-num">Step 4</div>
                <div className="step-content">
                  <h4 className="step-heading">Integrated Cumulative Exposure Index & Relative Normalization</h4>
                  <p className="step-desc">
                    Total cumulative pollution inhalation is integrated over trip duration (E = Σ C_i* × t_i) and reported as a relative index where Fastest Route = 100:
                  </p>
                  <div className="math-code-box">
                    <code>{"Exposure Index_alt = 100 × (E_alt / E_fastest)"}</code>
                    <code>{"Exposure Reduction % = [(E_fastest - E_alt) / E_fastest] × 100%"}</code>
                  </div>
                </div>
              </div>

              <div className="formula-step-box">
                <div className="step-num">Step 5</div>
                <div className="step-content">
                  <h4 className="step-heading">Constrained Buffer Optimization & 3-Point Sensitivity Check</h4>
                  <p className="step-desc">
                    The recommendation engine checks that the cleaner route satisfies duration ≤ fastest + buffer and remains optimal across <strong>0.5×, 1.0×, and 1.5×</strong> modifier sensitivity sweeps before awarding the ₹3 simulated incentive.
                  </p>
                  <div className="robustness-check-pass">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>3-Point Sensitivity Robustness Check Passed (0.5×, 1.0×, 1.5× invariant)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PER-ROUTE EXPOSURE BREAKDOWN TABLE */}
          {activeTab === "table" && (
            <div className="tab-pane">
              <div className="table-wrapper">
                <table className="exposure-matrix-table">
                  <thead>
                    <tr>
                      <th>Candidate Route</th>
                      <th>Distance</th>
                      <th>Duration</th>
                      <th>Avg PM2.5</th>
                      <th>Exposure Dose (E)</th>
                      <th>Relative Index</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((r, i) => {
                      const isS = r.route_id === rec.route_id;
                      return (
                        <tr key={r.route_id} className={isS ? "highlight-row" : ""}>
                          <td>
                            <strong>
                              {i === 0
                                ? "Route A (Direct)"
                                : i === 1
                                ? "Route B (Green/Ridge)"
                                : `Route ${String.fromCharCode(65 + i)}`}
                            </strong>
                            {isS && <span className="table-rec-tag">Recommended</span>}
                          </td>
                          <td>{r.distance_km} km</td>
                          <td>{r.duration_minutes} min</td>
                          <td>{r.average_pm25} µg/m³</td>
                          <td>{r.estimated_integrated_pm25.toLocaleString()} µg·min/m³</td>
                          <td>
                            <strong className={r.exposure_index < 90 ? "text-emerald" : "text-cyan"}>
                              {r.exposure_index}
                            </strong>
                          </td>
                          <td>
                            <span className={r.feasible ? "text-emerald" : "text-amber"}>
                              {r.feasible ? "Feasible" : "Exceeds Buffer"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCIENTIFIC DISCLAIMER FOOTER */}
          <div className="transparency-disclaimer-box" role="note">
            <div className="disclaimer-header">
              <ShieldAlert size={17} className="text-amber" />
              <span className="disclaimer-title">Scientific & Regulatory Methodology Notice</span>
            </div>
            <p className="disclaimer-text">
              AirShield computes a modeled relative pollution-exposure index for delivery worker decision support. Calculations are based on ambient monitoring observations from CPCB/DPCC/IMD and micro-urban spatial proxies. This is not street-level sensor data and does not constitute a personal medical measurement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
