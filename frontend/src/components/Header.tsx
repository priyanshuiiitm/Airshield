import React from "react";
import { LanguageCode } from "../api/types";
import { Shield, RefreshCw, Smartphone, BarChart3, ArrowLeft, Car } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { slideInLeft, fadeIn, hoverScale, tapScale, durations } from "../animation/motion-config";

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefresh: () => void;
  onBackToLanding?: () => void;
  onOpenRiderMode?: () => void;
  onOpenAnalytics?: () => void;
  onOpenDriverView?: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onRefresh,
  onBackToLanding,
  onOpenRiderMode,
  onOpenAnalytics,
  onOpenDriverView,
  isLoading
}) => {
  const { scrollY } = useScroll();
  const backdropBlur = useTransform(scrollY, [0, 50], ["blur(0px)", "blur(16px)"]);
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(9, 9, 11, 0.85)", "rgba(9, 9, 11, 0.98)"]
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
          <Shield size={20} className="shield-svg" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-name" style={{ color: "#ffffff", fontWeight: 600, letterSpacing: "-0.02em" }}>AirShield</h1>
            <span className="brand-tag">Delhi NCR Live</span>
          </div>
          <p className="brand-subtitle" style={{ color: "var(--text-secondary)" }}>Pollution-Aware Worker Routing Engine</p>
        </div>
      </motion.div>

      <motion.div 
        className="header-actions"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
      >
        {onBackToLanding && (
          <motion.button
            type="button"
            className="btn-back-overview"
            onClick={onBackToLanding}
            title="Return to AirShield intro & methodology story"
            whileHover={hoverScale}
            whileTap={tapScale}
            style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ArrowLeft size={14} />
            <span>Story & Overview</span>
          </motion.button>
        )}

        {onOpenDriverView && (
          <motion.button
            type="button"
            className="btn-header-mode btn-driver-toggle"
            onClick={onOpenDriverView}
            title="Simple Driver View"
            whileHover={hoverScale}
            whileTap={tapScale}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#000" }}
          >
            <Car size={14} />
            <span>Driver</span>
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
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Smartphone size={14} />
            <span>Rider Mode</span>
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
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <BarChart3 size={14} />
            <span>Batch Impact</span>
          </motion.button>
        )}

        {/* Live Network Pulse Indicator */}
        <motion.div 
          className="live-status-pill" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
          title="Live CPCB/DPCC Statutory CAAQMS Stations • Synced 12m ago • 10 Active Nodes"
          whileHover={hoverScale}
        >
          <div className="live-pulse-dot" style={{ background: "var(--color-safe)" }}></div>
          <span className="live-status-text" style={{ color: "var(--text-secondary)" }}>10-Station Feed</span>
        </motion.div>

        {/* Language Switcher */}
        <div className="lang-switcher-group" role="group" aria-label="Language selection">
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
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
        </motion.button>
      </motion.div>
    </motion.header>
  );
};
