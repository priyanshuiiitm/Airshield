/**
 * TransparencyPanel Component (Phase 5).
 * "How we estimated this" expandable drawer.
 * Transparently communicates station interpolation, relative exposure indices,
 * and prominent non-medical scientific disclaimers.
 */

import React, { useState } from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { translations } from "../utils/localization";

interface TransparencyPanelProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
}

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({
  recommendation,
  language
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[language];
  const { routes, decision, metadata } = recommendation;

  const fastestRoute = routes.find((r) => r.route_id === decision?.fastest_route_id);
  const confidence = fastestRoute?.confidence || "HIGH";

  return (
    <div className="transparency-drawer" data-testid="transparency-panel">
      <button
        type="button"
        className="transparency-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{t.howEstimatedTitle}</span>
        <span className={`drawer-arrow ${isOpen ? "open" : ""}`}>▾</span>
      </button>

      {isOpen && (
        <div className="transparency-content" role="region" aria-label={t.howEstimatedTitle}>
          <p className="transparency-paragraph">{t.transparencyP1}</p>
          <p className="transparency-paragraph">{t.transparencyP2}</p>
          <p className="transparency-paragraph">{t.transparencyP3}</p>
          <p className="transparency-paragraph">{t.transparencyP4}</p>

          {/* Metadata Badges */}
          <div className="transparency-meta-grid">
            <div className="meta-pill">
              <span className="meta-pill-label">{t.confidenceLabel}:</span>
              <span className={`meta-pill-val val-${confidence.toLowerCase()}`}>{confidence}</span>
            </div>
            <div className="meta-pill">
              <span className="meta-pill-label">{t.robustLabel}:</span>
              <span className="meta-pill-val text-green">
                {decision?.robust ? "✓ Robust" : "Standard"}
              </span>
            </div>
            <div className="meta-pill">
              <span className="meta-pill-label">Dataset:</span>
              <span className="meta-pill-val">{metadata?.snapshot_id || "demo_v1"}</span>
            </div>
          </div>

          {/* Scientific Disclaimer */}
          <div className="scientific-disclaimer-box" role="note">
            <h4 className="disclaimer-title">⚠️ {t.disclaimerTitle}</h4>
            <p className="disclaimer-body">{t.disclaimerBody}</p>
          </div>
        </div>
      )}
    </div>
  );
};
