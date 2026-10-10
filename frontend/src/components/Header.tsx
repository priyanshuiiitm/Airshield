import React from "react";
import { LanguageCode } from "../api/types";
import { Shield, RefreshCw } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { slideInLeft, fadeIn, hoverScale, tapScale, durations } from "../animation/motion-config";

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefresh: () => void;
  onBackToLanding?: () => void;
  onOpenRiderMode?: () => void;
  onOpenAnalytics?: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onRefresh,
  onBackToLanding,
  onOpenRiderMode,
  onOpenAnalytics,
  isLoading
}) => {
  const { scrollY } = useScroll();
  const backdropBlur = useTransform(scrollY, [0, 50], ["blur(0px)", "blur(16px)"]);
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(10, 14, 26, 0.8)", "rgba(10, 14, 26, 0.95)"]
  );
  
  return (
    <motion.header 
      className="app-header" 
      data-testid="header"
      style={{
        backdropFilter: backdropBlur as any,
        backgroundColor,
        borderBottom: "1px solid var(--border-subtle)"
      }}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: durations.normal }}
    >
      <motion.div 
        className="header-brand" 
        onClick={onBackToLanding} 
        style={{ cursor: onBackToLanding ? "pointer" : "default" }}
        variants={slideInLeft}
        initial="hidden"
        animate="visible"
      >
        <div className="brand-shield-icon">
          <Shield size={22} className="shield-svg" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-name" style={{ backgroundImage: "var(--gradient-aurora-primary)", WebkitBackgroundClip: "text", color: "transparent" }}>AirShield</h1>
            <span className="brand-tag">Delhi NCR Live</span>
          </div>
          <p className="brand-subtitle" style={{ color: "var(--text-secondary)" }}>Pollution-Aware Worker Routing & Decision Support</p>
        </div>
      </motion.div>

      <motion.div 
        className="header-actions"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        {onBackToLanding && (
          <motion.button
            type="button"
            className="btn-back-overview"
            onClick={onBackToLanding}
            title="Return to AirShield intro & methodology story"
            whileHover={hoverScale}
            whileTap={tapScale}
            style={{ color: "var(--aurora-violet-300)" }}
          >
            <span>← Story & Overview</span>
          </motion.button>
        )}

        {onOpenRiderMode && (
          <motion.button
            type="button"
            className="btn-header-mode btn-rider-toggle"
            onClick={onOpenRiderMode}
            title="Open Sunlight-Optimized Rider Handlebar Mode"
            whileHover={hoverScale}
            whileTap={tapScale}
          >
            <span>📱 Rider Mode</span>
          </motion.button>
        )}

        {onOpenAnalytics && (
          <motion.button
            type="button"
            className="btn-header-mode btn-analytics-toggle"
            onClick={onOpenAnalytics}
            title="View 150-Trip Batch Impact Evidence & Municipal Hotspots"
            whileHover={hoverScale}
            whileTap={tapScale}
          >
            <span>📊 Batch Impact</span>
          </motion.button>
        )}

        {/* Live Network Pulse Indicator with Freshness badge */}
        <motion.div 
          className="live-status-pill" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)' }} 
          title="Live CPCB/DPCC Statutory CAAQMS Stations • Synced 12m ago • 10 Active Nodes"
          whileHover={hoverScale}
        >
          <div className="live-pulse-dot" style={{ background: "var(--aurora-emerald-500)" }}></div>
          <span className="live-status-text" style={{ color: "var(--aurora-emerald-500)" }}>Live 10-Station Feed (12m ago)</span>
        </motion.div>

        {/* Language Switcher */}
        <div className="lang-switcher-group" role="group" aria-label="Language selection" style={{ background: "var(--bg-input)" }}>
          <motion.button
            type="button"
            className={`lang-btn ${language === "en" ? "active" : ""}`}
            onClick={() => onLanguageChange("en")}
            whileTap={tapScale}
          >
            EN
          </motion.button>
          <motion.button
            type="button"
            className={`lang-btn ${language === "hi" ? "active" : ""}`}
            onClick={() => onLanguageChange("hi")}
            whileTap={tapScale}
          >
            हिंदी
          </motion.button>
        </div>

        {/* Refresh Button */}
        <motion.button
          type="button"
          className="header-icon-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh real-time pollution readings and routes"
          aria-label="Refresh Data"
          whileHover={hoverScale}
          whileTap={tapScale}
          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
        >
          <RefreshCw size={17} className={isLoading ? "animate-spin text-cyan" : ""} />
        </motion.button>
      </motion.div>
    </motion.header>
  );
};
