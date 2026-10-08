/**
 * DecisionCard Component (Phase 5).
 * The primary decision interface for outdoor delivery workers.
 * Renders distinct states for AVOIDABLE, UNAVOIDABLE, LOW, and INSUFFICIENT_DATA.
 */

import React from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { translations } from "../utils/localization";
import { formatCurrency, formatMinutes, formatPercentage } from "../utils/formatting";

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
  const { classification, recommendation: rec, benefit, agent, message } = recommendation;

  // Use agent message or localization fallback
  const explanationText = agent?.explanation || message || "";

  return (
    <div className={`decision-card card-${classification.toLowerCase()}`} data-testid="decision-card">
      {/* ---------------------------------------------------- */}
      {/* 1. AVOIDABLE STATE                                    */}
      {/* ---------------------------------------------------- */}
      {classification === "AVOIDABLE" && (
        <div className="card-content">
          <div className="card-header">
            <span className="card-icon" aria-hidden="true">🫁</span>
            <div className="card-title-group">
              <h2 className="card-title">{t.titleAvoidable}</h2>
              <p className="card-subtitle">{explanationText}</p>
            </div>
          </div>

          {/* Tradeoff Metrics */}
          <div className="metrics-grid">
            <div className="metric-box time-box">
              <span className="metric-val">{formatMinutes(rec.additional_minutes)}</span>
              <span className="metric-lbl">{t.additionalTime}</span>
            </div>

            <div className="metric-box exposure-box">
              <span className="metric-val text-green">
                {formatPercentage(rec.exposure_reduction_percent)}
              </span>
              <span className="metric-lbl">{t.exposureReduction}</span>
            </div>
          </div>

          {/* Reward Badge */}
          {rec.reward_eligible && (
            <div className="reward-banner">
              <span className="reward-icon">💰</span>
              <span className="reward-text">
                {t.rewardEarned} <strong>{formatCurrency(rec.reward_amount_inr || 3)}</strong>{" "}
                <small>({t.simulated})</small>
              </span>
            </div>
          )}

          {/* Confirmation Message or Action Buttons */}
          {choiceSubmitted ? (
            <div className="choice-confirmation confirmed-green" role="status">
              {choiceSubmitted === "safer"
                ? t.choiceConfirmedSafer.replace("{amount}", String(rec.reward_amount_inr || 3))
                : t.choiceConfirmedFastest}
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
                {isSubmitting ? t.btnSubmitting : t.btnTakeSafer}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-fastest"
                disabled={isSubmitting}
                onClick={() => onSelectChoice("fastest")}
                data-testid="btn-keep-fastest"
              >
                {t.btnKeepFastest}
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
            <span className="card-icon" aria-hidden="true">⚠️</span>
            <div className="card-title-group">
              <h2 className="card-title text-amber">{t.titleUnavoidable}</h2>
              <p className="card-subtitle">{explanationText || t.msgUnavoidable}</p>
            </div>
          </div>

          {/* Health Benefit Badge */}
          {benefit?.eligible && (
            <div className="reward-banner benefit-banner">
              <span className="reward-icon">🛡️</span>
              <span className="reward-text">
                {t.protectionBenefit}: <strong>{formatCurrency(benefit.amount_inr || 5)}</strong>{" "}
                <small>({t.simulated})</small>
              </span>
            </div>
          )}

          {choiceSubmitted ? (
            <div className="choice-confirmation" role="status">
              {t.choiceConfirmedFastest}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-neutral"
              disabled={isSubmitting}
              onClick={() => onSelectChoice("fastest")}
              data-testid="btn-continue-fastest"
            >
              {isSubmitting ? t.btnSubmitting : t.btnContinue}
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
            <span className="card-icon" aria-hidden="true">🟢</span>
            <div className="card-title-group">
              <h2 className="card-title text-green">{t.titleLow}</h2>
              <p className="card-subtitle">{explanationText || t.msgLow}</p>
            </div>
          </div>

          {choiceSubmitted ? (
            <div className="choice-confirmation" role="status">
              {t.choiceConfirmedFastest}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-neutral"
              disabled={isSubmitting}
              onClick={() => onSelectChoice("fastest")}
              data-testid="btn-continue-fastest"
            >
              {t.btnContinue}
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
            <span className="card-icon" aria-hidden="true">⚪</span>
            <div className="card-title-group">
              <h2 className="card-title text-muted">{t.titleInsufficientData}</h2>
              <p className="card-subtitle">{explanationText || t.msgInsufficientData}</p>
            </div>
          </div>

          {choiceSubmitted ? (
            <div className="choice-confirmation" role="status">
              {t.choiceConfirmedFastest}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-neutral"
              disabled={isSubmitting}
              onClick={() => onSelectChoice("fastest")}
              data-testid="btn-continue-fastest"
            >
              {t.btnContinue}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
