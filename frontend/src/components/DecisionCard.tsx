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

// State-specific color tokens
const stateColors = {
  AVOIDABLE: {
    border: "rgba(16, 185, 129, 0.35)",
    glow: "0 0 24px rgba(16, 185, 129, 0.3)",
    pillBg: "rgba(16, 185, 129, 0.12)",
    pillColor: "var(--aurora-emerald-400)",
    pillBorder: "rgba(16, 185, 129, 0.3)",
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconBorder: "rgba(16, 185, 129, 0.3)",
  },
  UNAVOIDABLE: {
    border: "rgba(245, 158, 11, 0.35)",
    glow: "0 0 24px rgba(245, 158, 11, 0.25)",
    pillBg: "rgba(245, 158, 11, 0.12)",
    pillColor: "var(--aurora-amber-400)",
    pillBorder: "rgba(245, 158, 11, 0.3)",
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconBorder: "rgba(245, 158, 11, 0.3)",
  },
  LOW: {
    border: "rgba(20, 184, 166, 0.35)",
    glow: "0 0 24px rgba(20, 184, 166, 0.25)",
    pillBg: "rgba(20, 184, 166, 0.12)",
    pillColor: "var(--aurora-teal-400)",
    pillBorder: "rgba(20, 184, 166, 0.3)",
    iconBg: "rgba(20, 184, 166, 0.12)",
    iconBorder: "rgba(20, 184, 166, 0.3)",
  },
  INSUFFICIENT_DATA: {
    border: "rgba(100, 116, 139, 0.3)",
    glow: "none",
    pillBg: "rgba(100, 116, 139, 0.12)",
    pillColor: "var(--text-secondary)",
    pillBorder: "rgba(100, 116, 139, 0.3)",
    iconBg: "rgba(100, 116, 139, 0.12)",
    iconBorder: "rgba(100, 116, 139, 0.2)",
  },
};

// Animated gradient progress bar
const ExposureBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div style={{
    height: 6, borderRadius: 999,
    background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 4
  }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      transition={{ duration: 0.8, ease: [0, 0, 0.2, 1], delay: 0.3 }}
      style={{ height: "100%", borderRadius: 999, background: color }}
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
  const { classification, recommendation: rec, agent, message } = recommendation;
  const colors = stateColors[classification as keyof typeof stateColors] || stateColors.INSUFFICIENT_DATA;
  const explanationText = agent?.explanation || message || "";



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
        borderRadius: "var(--radius-md)",
        padding: "var(--space-5)",
      }}
    >
      {/* ─── AVOIDABLE ─────────────────────────────────── */}
      {classification === "AVOIDABLE" && (
        <motion.div className="card-content" variants={staggerContainer} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div className="card-header" variants={fadeInUp}>
            <div className="card-icon-wrap" style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}>
              <Sparkles size={22} style={{ color: "var(--aurora-emerald-400)" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span className="dot-pulse-green" />
                <span>{language === "hi" ? "स्वच्छ मार्ग उपलब्ध" : "Safer Route Available"}</span>
              </div>
              <h2 className="card-title">{t.titleAvoidable}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-secondary)" }}>{explanationText}</p>
            </div>
          </motion.div>

          {/* Metrics */}
          <motion.div className="metrics-grid" variants={staggerContainer}>
            <motion.div className="metric-box" variants={fadeInUp} style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Clock size={16} style={{ color: "var(--aurora-amber-400)", flexShrink: 0 }} />
              <div className="metric-val-wrap">
                <span className="metric-val" style={{ color: "var(--aurora-amber-400)" }}>{formatMinutes(rec.additional_minutes)}</span>
                <span className="metric-lbl">{t.additionalTime}</span>
              </div>
            </motion.div>
            <motion.div className="metric-box" variants={fadeInUp} style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <TrendingDown size={16} style={{ color: "var(--aurora-emerald-400)", flexShrink: 0 }} />
              <div className="metric-val-wrap">
                <span className="metric-val" style={{ color: "var(--aurora-emerald-400)" }}>{formatPercentage(rec.exposure_reduction_percent)}</span>
                <span className="metric-lbl">{t.exposureReduction}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Exposure reduction bar */}
          <motion.div variants={fadeInUp}>
            <ExposureBar pct={rec.exposure_reduction_percent} color="linear-gradient(90deg, var(--aurora-emerald-600), var(--aurora-teal-500))" />
          </motion.div>

          {/* Inhalation Health Shield Banner */}
          <motion.div
            className="reward-banner"
            variants={fadeInUp}
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }}
          >
            <Shield size={18} style={{ color: "var(--aurora-emerald-400)", flexShrink: 0 }} />
            <div className="reward-text-wrap">
              <span className="reward-text">
                Inhalation Protection: <strong style={{ color: "var(--aurora-emerald-400)" }}>↓ {rec.exposure_reduction_percent}% Estimated Exposure Avoided</strong>
              </span>
              <span className="reward-sub" style={{ color: "var(--text-secondary)" }}>Statutory CAAQMS-modeled clean air corridor</span>
            </div>
          </motion.div>

          {/* N95 Respirator Advisory */}
          <div className="mask-advisory-pill">
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            <span>N95 Mask Advised: Ambient PM2.5 exceeds 100 µg/m³ across Delhi NCR.</span>
          </div>

          {/* Confirmation or Action Buttons */}
          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <div className="choice-confirmed-wrapper">
                <motion.div
                  key="confirmed"
                  className={`choice-confirmation ${
                    choiceSubmitted === "fastest" ? "confirmed-blue" : "confirmed-green"
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid var(--aurora-emerald-500)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }}
                  role="status"
                >
                  <CheckCircle2 size={20} style={{ color: "var(--aurora-emerald-400)" }} />
                  <div className="choice-conf-text">
                    <span className="choice-conf-title">
                      {choiceSubmitted === "safer" ? t.choiceConfirmedSafer : t.choiceConfirmedFastest}
                    </span>
                    <span className="choice-conf-sub">
                      {choiceSubmitted === "fastest"
                        ? "Fastest direct path isolated on map in Royal Blue"
                        : "Safer clean corridor isolated on map in Emerald Green"}
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
                      ? "⇄ Switch to Fastest Route (Blue)"
                      : "⇄ Switch to Safer Route (Green)"}
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
                  whileHover={{ scale: 1.04, boxShadow: "var(--shadow-glow-emerald)" }}
                  whileTap={tapScale}
                  style={{ background: "linear-gradient(135deg, var(--aurora-emerald-500), var(--aurora-teal-500))", color: "#fff" }}
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
                  style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
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
              <AlertTriangle size={22} style={{ color: "var(--aurora-amber-400)" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>{language === "hi" ? "अपरिहार्य प्रदूषण" : "Unavoidable Smog"}</span>
              </div>
              <h2 className="card-title" style={{ color: "var(--aurora-amber-400)" }}>{t.titleUnavoidable}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-secondary)" }}>{explanationText || t.msgUnavoidable}</p>
            </div>
          </motion.div>

          <motion.div
            className="unavoidable-advisory-box"
            variants={fadeInUp}
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }}
          >
            <div className="advisory-top-row">
              <Shield size={16} style={{ color: "var(--aurora-amber-400)" }} />
              <span className="advisory-heading" style={{ color: "var(--aurora-amber-400)" }}>
                {language === "hi" ? "न्यूनतम समय रणनीति" : "Dose Minimization Strategy"}
              </span>
            </div>
            <p className="advisory-desc" style={{ color: "#fde68a" }}>
              {language === "hi"
                ? "सभी उपलब्ध गलियारों में प्रदूषण अधिक है। सबसे तेज़ मार्ग चुनें।"
                : "Background PM2.5 is uniformly elevated. Follow the fastest route to minimize total time outdoors."}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <motion.div key="confirmed" className="choice-confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: "rgba(20,184,166,0.1)", border: "1px solid var(--aurora-teal-500)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }} role="status">
                <CheckCircle2 size={20} style={{ color: "var(--aurora-teal-400)" }} />
                <span>{t.choiceConfirmedFastest}</span>
              </motion.div>
            ) : (
              <motion.button key="action" type="button" className="btn btn-primary btn-neutral" disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")} data-testid="btn-continue-fastest"
                whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(245,158,11,0.3)" }} whileTap={tapScale}
                style={{ background: "linear-gradient(135deg, var(--aurora-amber-500), var(--aurora-amber-600))", color: "#000", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", height: 44, borderRadius: "var(--radius-sm)", fontWeight: 700 }}
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
              <Shield size={22} style={{ color: "var(--aurora-teal-400)" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>Safe Ambient Air Quality (PM2.5 &lt; 60 µg/m³)</span>
              </div>
              <h2 className="card-title" style={{ color: "var(--aurora-teal-400)" }}>{t.titleLow}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-secondary)" }}>{explanationText || t.msgLow}</p>
            </div>
          </motion.div>
          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <motion.div key="confirmed" className="choice-confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: "rgba(20,184,166,0.1)", border: "1px solid var(--aurora-teal-500)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }} role="status">
                <CheckCircle2 size={20} style={{ color: "var(--aurora-teal-400)" }} />
                <span>{t.choiceConfirmedFastest}</span>
              </motion.div>
            ) : (
              <motion.button key="action" type="button" className="btn btn-primary btn-neutral" disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")} data-testid="btn-continue-fastest"
                whileHover={{ scale: 1.04, boxShadow: "var(--shadow-glow-teal)" }} whileTap={tapScale}
                style={{ background: "linear-gradient(135deg, var(--aurora-teal-500), var(--aurora-teal-600))", color: "#fff", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", height: 44, borderRadius: "var(--radius-sm)", fontWeight: 700 }}
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
              <AlertTriangle size={22} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="card-title-group">
              <div className="classification-pill" style={{ background: colors.pillBg, color: colors.pillColor, border: `1px solid ${colors.pillBorder}` }}>
                <span>Insufficient Nearby Stations (&lt; 2 within 25km)</span>
              </div>
              <h2 className="card-title" style={{ color: "var(--text-secondary)" }}>{t.titleInsufficientData}</h2>
              <p className="card-subtitle" style={{ color: "var(--text-muted)" }}>{explanationText || t.msgInsufficientData}</p>
            </div>
          </motion.div>
          <AnimatePresence mode="wait">
            {choiceSubmitted ? (
              <motion.div key="confirmed" className="choice-confirmation" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }} role="status">
                <span>{t.choiceConfirmedFastest}</span>
              </motion.div>
            ) : (
              <motion.button key="action" type="button" className="btn btn-primary btn-neutral" disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")} data-testid="btn-continue-fastest"
                whileHover={hoverScale} whileTap={tapScale}
                style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", height: 44, borderRadius: "var(--radius-sm)", fontWeight: 700 }}
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
