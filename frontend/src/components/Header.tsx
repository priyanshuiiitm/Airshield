/**
 * Header Component (Phase 5).
 * Clean, lightweight top navigation bar with language switcher.
 */

import React from "react";
import { LanguageCode } from "../api/types";
import { translations } from "../utils/localization";

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onRefresh,
  isLoading
}) => {
  const t = translations[language];

  return (
    <header className="app-header" data-testid="app-header">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">🛡️</div>
        <div>
          <h1 className="brand-name">{t.appTitle}</h1>
          <span className="brand-tag">{t.tagSnapshot}</span>
        </div>
      </div>

      <div className="header-actions">
        {onRefresh && (
          <button
            type="button"
            className="btn-icon-refresh"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label={t.recheckButton}
            title={t.recheckButton}
          >
            🔄
          </button>
        )}

        {/* Language Toggle */}
        <div className="lang-switcher" role="radiogroup" aria-label="Language selection">
          <button
            type="button"
            className={`lang-btn ${language === "en" ? "active" : ""}`}
            onClick={() => onLanguageChange("en")}
            aria-checked={language === "en"}
            role="radio"
          >
            EN
          </button>
          <span className="lang-divider">|</span>
          <button
            type="button"
            className={`lang-btn ${language === "hi" ? "active" : ""}`}
            onClick={() => onLanguageChange("hi")}
            aria-checked={language === "hi"}
            role="radio"
          >
            हिंदी
          </button>
        </div>
      </div>
    </header>
  );
};
