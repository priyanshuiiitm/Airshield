/**
 * DecisionCard Component (Phase 5).
 * The primary decision interface for outdoor delivery workers.
 * Renders distinct states for AVOIDABLE, UNAVOIDABLE, LOW, and INSUFFICIENT_DATA
 * with glowing obsidian glassmorphic card styling.
 */

import React from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { translations } from "../utils/localization";
import { formatMinutes, formatPercentage } from "../utils/formatting";
import { Shield, Sparkles, TrendingDown, Clock, AlertTriangle, CheckCircle2, Navigation } from "lucide-react";

interface DecisionCardProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
  isSubmitting: boolean;
  choiceSubmitted: "safer" | "fastest" | null;
  onSelectChoice: (choice: "safer" | "fastest") => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  recommendation,
  language,
  isSubmitting,
  choiceSubmitted,
  onSelectChoice
}) => {
  const t = translations[language];
  const { classification, recommendation: rec, agent, message } = recommendation;

  // Use agent message or localization fallback
  const explanationText = agent?.explanation || message || "";

  return (
    <div
      className={`decision-card card-${classification.toLowerCase()}`}
      data-testid="decision-card"
    >
      {/* ---------------------------------------------------- */}
      {/* 1. AVOIDABLE STATE (Cleaner Alternative Found)        */}
      {/* ---------------------------------------------------- */}
      {classification === "AVOIDABLE" && (
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap icon-emerald">
              <Sparkles size={22} className="text-emerald" />
            </div>
            <div className="card-title-group">
              <div className="classification-pill pill-avoidable">
                <span className="dot-pulse-green"></span>
                <span>{language === "hi" ? "स्वच्छ मार्ग उपलब्ध (Avoidable Smog)" : "Safer Route Available"}</span>
              </div>
              <h2 className="card-title">{t.titleAvoidable}</h2>
              <p className="card-subtitle">{explanationText}</p>
            </div>
          </div>

          {/* Tradeoff Metrics */}
          <div className="metrics-grid">
            <div className="metric-box time-box">
              <Clock size={16} className="text-amber" />
              <div className="metric-val-wrap">
                <span className="metric-val">{formatMinutes(rec.additional_minutes)}</span>
                <span className="metric-lbl">{t.additionalTime}</span>
              </div>
            </div>

            <div className="metric-box exposure-box">
              <TrendingDown size={16} className="text-emerald" />
              <div className="metric-val-wrap">
                <span className="metric-val text-emerald">
                  {formatPercentage(rec.exposure_reduction_percent)}
                </span>
                <span className="metric-lbl">{t.exposureReduction}</span>
              </div>
            </div>
          </div>

          {/* Inhalation Health Shield Banner */}
          <div className="reward-banner">
            <Shield size={18} className="text-emerald" />
            <div className="reward-text-wrap">
              <span className="reward-text">
                Inhalation Protection: <strong className="reward-glow">↓ {rec.exposure_reduction_percent}% PM2.5 Intake Avoided</strong>
              </span>
              <span className="reward-sub">Statutory CAAQMS-verified clean air corridor</span>
            </div>
          </div>

          {/* Confirmation or Action Buttons */}
          {choiceSubmitted ? (
            <div className="choice-confirmed-wrapper">
              <div
                className={`choice-confirmation ${
                  choiceSubmitted === "fastest" ? "confirmed-blue" : "confirmed-green"
                }`}
                role="status"
              >
                <CheckCircle2
                  size={20}
                  className={choiceSubmitted === "fastest" ? "text-cyan" : "text-emerald"}
                />
                <div className="choice-conf-text">
                  <span className="choice-conf-title">
                    {choiceSubmitted === "safer"
                      ? t.choiceConfirmedSafer
                      : t.choiceConfirmedFastest}
                  </span>
                  <span className="choice-conf-sub">
                    {choiceSubmitted === "fastest"
                      ? "Fastest direct path isolated on map in Royal Blue"
                      : "Safer clean corridor isolated on map in Emerald Green"}
                  </span>
                </div>
              </div>
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
            <div className="action-button-group">
              <button
                type="button"
                className="btn btn-primary btn-safer"
                disabled={isSubmitting}
                onClick={() => onSelectChoice("safer")}
                data-testid="btn-take-safer"
              >
                <Sparkles size={16} />
                <span>{isSubmitting ? t.btnSubmitting : t.btnTakeSafer}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-fastest"
                disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")}
                data-testid="btn-keep-fastest"
              >
                <Navigation size={15} />
                <span>{t.btnKeepFastest}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. UNAVOIDABLE STATE                                  */}
      {/* ---------------------------------------------------- */}
      {classification === "UNAVOIDABLE" && (
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap icon-amber">
              <AlertTriangle size={22} className="text-amber" />
            </div>
            <div className="card-title-group">
              <div className="classification-pill pill-unavoidable">
                <span>{language === "hi" ? "अपरिहार्य प्रदूषण (Unavoidable Smog)" : "Unavoidable Smog"}</span>
              </div>
              <h2 className="card-title text-amber">{t.titleUnavoidable}</h2>
              <p className="card-subtitle">{explanationText || t.msgUnavoidable}</p>
            </div>
          </div>

          {/* Mathematical Dose Minimization Advisory */}
          <div className="unavoidable-advisory-box">
            <div className="advisory-top-row">
              <Shield size={16} className="text-amber" />
              <span className="advisory-heading">
                {language === "hi" ? "न्यूनतम समय रणनीति (Time-in-Transit Minimization)" : "Dose Minimization Strategy"}
              </span>
            </div>
            <p className="advisory-desc">
              {language === "hi"
                ? "सभी उपलब्ध गलियारों में प्रदूषण अधिक है। सड़क पर कुल समय न्यूनतम रखने के लिए सबसे तेज़ मार्ग चुनें ताकि समग्र पार्टिकुलेट एक्सपोज़र कम रहे।"
                : "Background PM2.5 is uniformly elevated across all paths. The mathematical optimum is to follow the fastest route to minimize total time-in-transit outdoors."}
            </p>
          </div>

          {choiceSubmitted ? (
            <div className="choice-confirmation" role="status">
              <CheckCircle2 size={20} className="text-cyan" />
              <span>{t.choiceConfirmedFastest}</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-neutral"
              disabled={isSubmitting}
              onClick={() => onSelectChoice("fastest")}
              data-testid="btn-continue-fastest"
            >
              <Navigation size={15} />
              <span>{isSubmitting ? t.btnSubmitting : t.btnContinue}</span>
            </button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. LOW STATE                                          */}
      {/* ---------------------------------------------------- */}
      {classification === "LOW" && (
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap icon-cyan">
              <Shield size={22} className="text-cyan" />
            </div>
            <div className="card-title-group">
              <div className="classification-pill pill-low">
                <span>Safe Ambient Air Quality (PM2.5 &lt; 60 µg/m³)</span>
              </div>
              <h2 className="card-title text-cyan">{t.titleLow}</h2>
              <p className="card-subtitle">{explanationText || t.msgLow}</p>
            </div>
          </div>

          {choiceSubmitted ? (
            <div className="choice-confirmation" role="status">
              <CheckCircle2 size={20} className="text-cyan" />
              <span>{t.choiceConfirmedFastest}</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-neutral"
              disabled={isSubmitting}
              onClick={() => onSelectChoice("fastest")}
              data-testid="btn-continue-fastest"
            >
              <Navigation size={15} />
              <span>{t.btnContinue}</span>
            </button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. INSUFFICIENT DATA STATE                            */}
      {/* ---------------------------------------------------- */}
      {classification === "INSUFFICIENT_DATA" && (
        <div className="card-content">
          <div className="card-header">
            <div className="card-icon-wrap icon-muted">
              <AlertTriangle size={22} className="text-slate" />
            </div>
            <div className="card-title-group">
              <div className="classification-pill pill-muted">
                <span>Insufficient Nearby Stations (&lt; 2 stations within 25km)</span>
              </div>
              <h2 className="card-title text-muted">{t.titleInsufficientData}</h2>
              <p className="card-subtitle">{explanationText || t.msgInsufficientData}</p>
            </div>
          </div>

          {choiceSubmitted ? (
            <div className="choice-confirmation" role="status">
              <span>{t.choiceConfirmedFastest}</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-neutral"
              disabled={isSubmitting}
              onClick={() => onSelectChoice("fastest")}
              data-testid="btn-continue-fastest"
            >
              <Navigation size={15} />
              <span>{t.btnContinue}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
