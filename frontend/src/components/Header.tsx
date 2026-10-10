import React from "react";
import { LanguageCode } from "../api/types";
import { RefreshCw } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { slideInLeft, fadeIn, hoverScale, tapScale, durations } from "../animation/motion-config";

interface HeaderProps {
  onOpenDriverView?: () => void;
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
  onOpenDriverView,
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
        <div>
          <h1 className="brand-name" style={{ backgroundImage: "var(--gradient-aurora-primary)", WebkitBackgroundClip: "text", color: "transparent" }}>AirShield</h1>
        </div>
      </motion.div>

      <motion.div 
        className="header-actions"
        style={{ margin: "0 auto" }}
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
            style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span>← Story & Overview</span>
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
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#000", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            <span>Mobile App</span>
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
            style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, border: "1px solid var(--border-subtle)", background: "transparent", cursor: "pointer" }}
          >
            <span>Batch Impact</span>
          </motion.button>
        )}


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
