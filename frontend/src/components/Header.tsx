import React from "react";
import { LanguageCode } from "../api/types";
import { Shield, RefreshCw, Activity } from "lucide-react";

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onRefresh,
  isLoading
}) => {
  return (
    <header className="app-header" data-testid="header">
      <div className="header-brand">
        <div className="brand-shield-icon">
          <Shield size={22} className="shield-svg" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-name">AirShield</h1>
            <span className="brand-tag">Delhi NCR Live</span>
          </div>
          <p className="brand-subtitle">Pollution-Aware Worker Routing & Decision Support</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Live Network Pulse Indicator */}
        <div className="live-status-pill" title="Live CPCB/DPCC Sensor Integration Active">
          <Activity size={13} className="text-emerald animate-pulse" />
          <span className="live-status-text">Live 10-Station Feed</span>
        </div>

        {/* Language Switcher */}
        <div className="lang-switcher-group" role="group" aria-label="Language selection">
          <button
            type="button"
            className={`lang-btn ${language === "en" ? "active" : ""}`}
            onClick={() => onLanguageChange("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-btn ${language === "hi" ? "active" : ""}`}
            onClick={() => onLanguageChange("hi")}
          >
            हिंदी
          </button>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh real-time pollution readings and routes"
          aria-label="Refresh Data"
        >
          <RefreshCw size={17} className={isLoading ? "animate-spin text-cyan" : ""} />
        </button>
      </div>
    </header>
  );
};
