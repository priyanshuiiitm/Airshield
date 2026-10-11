/**
 * DecisionCard — Phase 3/4 Aurora Enhancement
 * Full Framer Motion animations + Aurora Borealis color palette
 * States: AVOIDABLE, UNAVOIDABLE, LOW, INSUFFICIENT_DATA
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { translations } from "../utils/localization";
import { formatMinutes, formatPercentage } from "../utils/formatting";
import { Shield, Sparkles, TrendingDown, Clock, AlertTriangle, CheckCircle2, Navigation } from "lucide-react";
import { fadeInUp, staggerContainer, hoverScale, tapScale } from "../animation/motion-config";

interface DecisionCardProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
  isSubmitting: boolean;
  choiceSubmitted: "safer" | "fastest" | null;
  onSelectChoice: (choice: "safer" | "fastest") => void;
}

// State-specific monochrome design tokens
const stateColors = {
  AVOIDABLE: {
    border: "rgba(255, 255, 255, 0.14)",
    glow: "0 8px 24px rgba(0, 0, 0, 0.6)",
    pillBg: "rgba(255, 255, 255, 0.08)",
    pillColor: "#ffffff",
    pillBorder: "rgba(255, 255, 255, 0.15)",
    iconBg: "rgba(255, 255, 255, 0.06)",
    iconBorder: "rgba(255, 255, 255, 0.12)",
  },
  UNAVOIDABLE: {
    border: "rgba(255, 255, 255, 0.12)",
    glow: "0 8px 24px rgba(0, 0, 0, 0.6)",
    pillBg: "rgba(255, 255, 255, 0.06)",
    pillColor: "#ffffff",
    pillBorder: "rgba(255, 255, 255, 0.12)",
    iconBg: "rgba(255, 255, 255, 0.06)",
    iconBorder: "rgba(255, 255, 255, 0.12)",
  },
  LOW: {
    border: "rgba(255, 255, 255, 0.12)",
    glow: "0 8px 24px rgba(0, 0, 0, 0.6)",
    pillBg: "rgba(255, 255, 255, 0.06)",
    pillColor: "#ffffff",
    pillBorder: "rgba(255, 255, 255, 0.12)",
    iconBg: "rgba(255, 255, 255, 0.06)",
    iconBorder: "rgba(255, 255, 255, 0.12)",
  },
  INSUFFICIENT_DATA: {
    border: "rgba(255, 255, 255, 0.08)",
    glow: "none",
    pillBg: "rgba(255, 255, 255, 0.04)",
    pillColor: "var(--text-secondary)",
    pillBorder: "rgba(255, 255, 255, 0.1)",
    iconBg: "rgba(255, 255, 255, 0.04)",
    iconBorder: "rgba(255, 255, 255, 0.08)",
  },
};

// Animated monochrome progress bar
const ExposureBar: React.FC<{ pct: number; color?: string }> = ({ pct }) => (
  <div style={{
    height: 5, borderRadius: 999,
    background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 4
  }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      transition={{ duration: 0.8, ease: [0, 0, 0.2, 1], delay: 0.3 }}
      style={{ height: "100%", borderRadius: 999, background: "#ffffff" }}
    />
  </div>
);

export const DecisionCard: React.FC<DecisionCardProps> = ({
  recommendation,
  language,
  isSubmitting,
  choiceSubmitted,
  onSelectChoice,
}) => {
  const t = translations[language];
  const { classification, recommendation: rec, agent, message, routes } = recommendation;
  const colors = stateColors[classification as keyof typeof stateColors] || stateColors.INSUFFICIENT_DATA;
  const explanationText = agent?.explanation || message || "";

  if (!routes || routes.length === 0) {
    return (
      <motion.div
        className="decision-card card-insufficient-data"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          padding: "9px",
          textAlign: "center"
        }}
      >
        <h4 style={{ color: "#fff", marginBottom: 8 }}>Action Required</h4>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
          Could not compute valid routes between these locations. They may be disconnected or too close together.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`decision-card card-${classification.toLowerCase()}`}
      data-testid="decision-card"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      style={{
        background: "var(--bg-card)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${colors.border}`,
        boxShadow: colors.glow,
        borderRadius: "10px",
        padding: "9px",
      }}
    >
      {/* ─── AVOIDABLE ─────────────────────────────────── */}
      {classification === "AVOIDABLE" && (
        <motion.div className="card-content" variants={staggerContainer} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div className="card-header" variants={fadeInUp}>
            <div className="card-icon-wrap" style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}>
              <Sparkles size={18} style={{ color: "#ffffff" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>{language === "hi" ? "स्वच्छ मार्ग उपलब्ध" : "Safer Route Available"}</span>
              </div>
              <h2 className="card-title" style={{ fontSize: 11, fontWeight: 600 }}>{t.titleAvoidable}</h2>
              <p className="card-subtitle" style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 400 }}>
                {language === "hi" ? "स्वच्छ मार्ग उपलब्ध है" : "Ridge/Green corridor reduces particulate exposure."}
              </p>
            </div>
          </motion.div>

          {/* Metrics */}
          <motion.div className="metrics-grid" variants={staggerContainer}>
            <motion.div className="metric-box" variants={fadeInUp} style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Clock size={15} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
              <div className="metric-val-wrap">
                <span className="metric-val" style={{ color: "#ffffff", fontWeight: 600, fontSize: 11 }}>{formatMinutes(rec.additional_minutes)}</span>
                <span className="metric-lbl" style={{ fontSize: 8, fontWeight: 500 }}>{t.additionalTime}</span>
              </div>
            </motion.div>
            <motion.div className="metric-box" variants={fadeInUp} style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <TrendingDown size={15} style={{ color: "#ffffff", flexShrink: 0 }} />
              <div className="metric-val-wrap">
                <span className="metric-val" style={{ color: "#ffffff", fontWeight: 600, fontSize: 11 }}>{formatPercentage(rec.exposure_reduction_percent)}</span>
                <span className="metric-lbl" style={{ fontSize: 8, fontWeight: 500 }}>{t.exposureReduction}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Exposure reduction bar */}
          <motion.div variants={fadeInUp}>
            <ExposureBar pct={rec.exposure_reduction_percent} />
          </motion.div>

          {/* Inhalation Health Shield Banner */}
          <motion.div
            className="reward-banner"
            variants={fadeInUp}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Shield size={15} style={{ color: "#ffffff", flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 400 }}>
              Protection: <strong style={{ color: "#ffffff", fontWeight: 600 }}>↓ {rec.exposure_reduction_percent}% lower inhalation</strong>
            </span>
          </motion.div>

          {/* N95 Respirator Advisory */}
          <div className="mask-advisory-pill" style={{ padding: "4px 7px", fontSize: 9, fontWeight: 400 }}>
            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
            <span>N95 respirator advised (high ambient PM2.5)</span>
          </div>

          {/* Confirmation or Action Buttons */}
          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <div className="choice-confirmed-wrapper">
                <motion.div
                  key="confirmed"
                  className="choice-confirmation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-sm)", padding: "4px 8px" }}
                  role="status"
                >
                  <CheckCircle2 size={18} style={{ color: "#ffffff" }} />
                  <div className="choice-conf-text">
                    <span className="choice-conf-title">
                      {choiceSubmitted === "safer" ? t.choiceConfirmedSafer : t.choiceConfirmedFastest}
                    </span>
                    <span className="choice-conf-sub">
                      {choiceSubmitted === "fastest"
                        ? "Fastest direct path active on map"
                        : "Cleaner air corridor active on map"}
                    </span>
                  </div>
                </motion.div>
                <button
                  type="button"
                  className="btn-switch-choice"
                  onClick={() => onSelectChoice(choiceSubmitted === "safer" ? "fastest" : "safer")}
                  title="Switch route selection"
                >
                  <span>
                    {choiceSubmitted === "safer"
                      ? "⇄ Switch to Fastest Route"
                      : "⇄ Switch to Cleaner Route"}
                  </span>
                </button>
              </div>
            ) : (
              <motion.div key="actions" className="action-button-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <motion.button
                  type="button"
                  className="btn btn-primary btn-safer"
                  disabled={isSubmitting}
                  onClick={() => onSelectChoice("safer")}
                  data-testid="btn-take-safer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={tapScale}
                  style={{ background: "#ffffff", color: "#000000", fontWeight: 600, border: "none" }}
                >
                  <Sparkles size={16} />
                  <span>{isSubmitting ? t.btnSubmitting : t.btnTakeSafer}</span>
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-secondary btn-fastest"
                  disabled={isSubmitting}
                  onClick={() => onSelectChoice("fastest")}
                  data-testid="btn-keep-fastest"
                  whileHover={hoverScale}
                  whileTap={tapScale}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff", fontWeight: 500 }}
                >
                  <Navigation size={15} />
                  <span>{t.btnKeepFastest}</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── UNAVOIDABLE ───────────────────────────────── */}
      {classification === "UNAVOIDABLE" && (
        <motion.div className="card-content" variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div className="card-header" variants={fadeInUp}>
            <div className="card-icon-wrap" style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}>
              <AlertTriangle size={20} style={{ color: "#ffffff" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>{language === "hi" ? "अपरिहार्य प्रदूषण" : "Unavoidable Smog"}</span>
              </div>
              <h2 className="card-title" style={{ color: "#ffffff", fontSize: 15, fontWeight: 600 }}>{t.titleUnavoidable}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{explanationText || t.msgUnavoidable}</p>
            </div>
          </motion.div>

          <motion.div
            className="unavoidable-advisory-box"
            variants={fadeInUp}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "var(--radius-sm)", padding: "4px 8px" }}
          >
            <div className="advisory-top-row">
              <Shield size={15} style={{ color: "#ffffff" }} />
              <span className="advisory-heading" style={{ color: "#ffffff", fontWeight: 600, fontSize: 12 }}>
                {language === "hi" ? "न्यूनतम समय रणनीति" : "Dose Minimization Strategy"}
              </span>
            </div>
            <p className="advisory-desc" style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.45, margin: "4px 0 0 0" }}>
              {language === "hi"
                ? "सभी उपलब्ध गलियारों में प्रदूषण अधिक है। सबसे तेज़ मार्ग चुनें।"
                : "Background PM2.5 is uniformly elevated. Follow the fastest route to minimize total time outdoors."}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <motion.div key="confirmed" className="choice-confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "var(--radius-sm)", padding: "4px 8px" }} role="status">
                <CheckCircle2 size={18} style={{ color: "#ffffff" }} />
                <span>{t.choiceConfirmedFastest}</span>
              </motion.div>
            ) : (
              <motion.button key="action" type="button" className="btn btn-primary btn-neutral" disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")} data-testid="btn-continue-fastest"
                whileHover={{ scale: 1.02 }} whileTap={tapScale}
                style={{ background: "#ffffff", color: "#000000", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", height: 42, borderRadius: "var(--radius-sm)", fontWeight: 600, border: "none" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Navigation size={15} />
                <span>{isSubmitting ? t.btnSubmitting : t.btnContinue}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── LOW ───────────────────────────────────────── */}
      {classification === "LOW" && (
        <motion.div className="card-content" variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div className="card-header" variants={fadeInUp}>
            <div className="card-icon-wrap" style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}>
              <Shield size={20} style={{ color: "#ffffff" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>Safe Ambient Air Quality (PM2.5 &lt; 60 µg/m³)</span>
              </div>
              <h2 className="card-title" style={{ color: "#ffffff", fontSize: 15, fontWeight: 600 }}>{t.titleLow}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{explanationText || t.msgLow}</p>
            </div>
          </motion.div>
          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <motion.div key="confirmed" className="choice-confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "var(--radius-sm)", padding: "4px 8px" }} role="status">
                <CheckCircle2 size={18} style={{ color: "#ffffff" }} />
                <span>{t.choiceConfirmedFastest}</span>
              </motion.div>
            ) : (
              <motion.button key="action" type="button" className="btn btn-primary btn-neutral" disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")} data-testid="btn-continue-fastest"
                whileHover={{ scale: 1.02 }} whileTap={tapScale}
                style={{ background: "#ffffff", color: "#000000", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", height: 42, borderRadius: "var(--radius-sm)", fontWeight: 600, border: "none" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Navigation size={15} />
                <span>{t.btnContinue}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── INSUFFICIENT_DATA ─────────────────────────── */}
      {classification === "INSUFFICIENT_DATA" && (
        <motion.div className="card-content" variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div className="card-header" variants={fadeInUp}>
            <div className="card-icon-wrap" style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}>
              <AlertTriangle size={20} style={{ color: "#ffffff" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>Insufficient Nearby Stations (&lt; 2 within 25km)</span>
              </div>
              <h2 className="card-title" style={{ color: "#ffffff", fontSize: 15, fontWeight: 600 }}>{t.titleInsufficientData}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-muted)", fontSize: 12 }}>{explanationText || t.msgInsufficientData}</p>
            </div>
          </motion.div>
          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <motion.div key="confirmed" className="choice-confirmation" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "var(--radius-sm)", padding: "4px 8px" }} role="status">
                <span>{t.choiceConfirmedFastest}</span>
              </motion.div>
            ) : (
              <motion.button key="action" type="button" className="btn btn-primary btn-neutral" disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")} data-testid="btn-continue-fastest"
                whileHover={{ scale: 1.02 }} whileTap={tapScale}
                style={{ background: "#ffffff", color: "#000000", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", height: 42, borderRadius: "var(--radius-sm)", fontWeight: 600, border: "none" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Navigation size={15} />
                <span>{t.btnContinue}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};
