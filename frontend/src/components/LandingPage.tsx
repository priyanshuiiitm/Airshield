import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, Wind, MapPin, Zap, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useVoice } from "../context/VoiceContext";
import { voiceScripts } from "../services/voiceScripts";

interface LandingPageProps {
  onLaunchSimulator: () => void;
}

const STATS = [
  { value: "68.7%", label: "Cleaner corridors found", sub: "across 150 modelled trips" },
  { value: "↓24%", label: "Median PM2.5 intake reduced", sub: "on recommended routes" },
  { value: "+3 min", label: "Median time overhead", sub: "well within delivery buffer" },
  { value: "173K", label: "µg·min particulates avoided", sub: "cumulative across all trips" },
];

const CARDS = [
  {
    icon: <Wind size={22} />,
    title: "Live Air Data",
    body: "10 statutory CAAQMS stations across Delhi NCR. Real-time PM2.5 every read.",
    accent: "#10b981",
  },
  {
    icon: <MapPin size={22} />,
    title: "Smart Routing",
    body: "~200m segment chunks. IDW interpolation + green canopy context modifiers.",
    accent: "#3b82f6",
  },
  {
    icon: <Zap size={22} />,
    title: "Instant Decision",
    body: "AVOIDABLE · UNAVOIDABLE · LOW. Clear state with time-buffer constraint.",
    accent: "#f59e0b",
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchSimulator }) => {
  const [activeCard, setActiveCard] = useState(0);
  const [tick, setTick] = useState(0);
  const { isVoiceEnabled, setVoiceEnabled, speak, stop, activeHighlightId, language, setLanguage } = useVoice();

  // Initial welcome greeting on landing page mount
  useEffect(() => {
    if (isVoiceEnabled) {
      speak(voiceScripts.landingWelcome(language), "hero-actions-row");
    }
  }, [isVoiceEnabled, language, speak]);

  // Auto-rotate stat cards
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2800);
    return () => clearInterval(t);
  }, []);

  const statIdx = tick % STATS.length;

  return (
    <div className="lp-root">
      {/* ── Header ── */}
      <header className="lp-header">
        <div className="lp-brand">
          <div className="lp-shield">
            <Shield size={18} />
          </div>
          <span className="lp-brand-name">AirShield</span>
          <span className="lp-live-dot" />
        </div>
        <button className="lp-launch-btn" onClick={onLaunchSimulator}>
          Open app <ArrowRight size={14} />
        </button>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <motion.div
          className="lp-hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="lp-badge">Delhi NCR · Live</div>

          <h1 className="lp-headline">
            Pollution is dynamic.<br />
            <span className="lp-headline-accent">So should the route.</span>
          </h1>

          <p className="lp-sub">
            Micro-urban PM2.5 routing for delivery workers. Real sensor data. Zero fluff.
          </p>

          {/* Frontpage Audio Guide Language Choice Bar */}
          <div className="hero-voice-bar-wrapper">
            <div className="hero-voice-bar">
              <div className="hero-voice-bar-left">
                <Volume2 size={16} className="text-emerald animate-pulse" />
                <span className="hero-voice-bar-label">
                  {language === "hi" ? "ऑडियो सहायता (महिला आवाज):" : "Voice Assistance (Female Voice):"}
                </span>
              </div>
              <div className="hero-voice-bar-actions">
                <button
                  type="button"
                  className={`hero-voice-choice-btn ${language === "hi" && isVoiceEnabled ? "active" : ""}`}
                  onClick={() => {
                    setLanguage("hi");
                    localStorage.setItem("airshield_lang", "hi");
                    setVoiceEnabled(true);
                    speak(voiceScripts.landingWelcome("hi"), "hero-actions-row");
                  }}
                  title="हिंदी में महिला आवाज सहायता चालू करें"
                >
                  <span>🇮🇳 हिंदी (Hindi)</span>
                </button>

                <button
                  type="button"
                  className={`hero-voice-choice-btn ${language === "en" && isVoiceEnabled ? "active" : ""}`}
                  onClick={() => {
                    setLanguage("en");
                    localStorage.setItem("airshield_lang", "en");
                    setVoiceEnabled(true);
                    speak(voiceScripts.landingWelcome("en"), "hero-actions-row");
                  }}
                  title="Enable English female voice guide"
                >
                  <span>🇬🇧 English</span>
                </button>

                {isVoiceEnabled && (
                  <button
                    type="button"
                    className="hero-voice-mute-btn"
                    onClick={() => {
                      stop();
                      setVoiceEnabled(false);
                    }}
                    title={language === "hi" ? "आवाज बंद करें" : "Mute voice"}
                  >
                    <VolumeX size={13} />
                    <span>{language === "hi" ? "म्यूट" : "Mute"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            id="hero-actions-row"
            className={activeHighlightId === "hero-actions-row" ? "voice-spotlight-active" : ""}
            style={{ borderRadius: "99px", display: "inline-block" }}
          >
            <button className="lp-cta" onClick={onLaunchSimulator}>
              Start routing <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        {/* Animated stat ticker */}
        <div className="lp-stat-ticker">
          <AnimatePresence mode="wait">
            <motion.div
              key={statIdx}
              className="lp-stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <span className="lp-stat-value">{STATS[statIdx].value}</span>
              <span className="lp-stat-label">{STATS[statIdx].label}</span>
              <span className="lp-stat-sub">{STATS[statIdx].sub}</span>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators */}
          <div className="lp-stat-dots">
            {STATS.map((_, i) => (
              <button
                key={i}
                className={`lp-dot ${i === statIdx ? "active" : ""}`}
                onClick={() => setTick(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Stat Grid ── */}
      <section className="lp-stat-grid">
        {STATS.map((s, i) => (
          <div key={i} className="lp-stat-grid-item">
            <span className="lp-grid-val">{s.value}</span>
            <span className="lp-grid-lbl">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Feature Cards ── */}
      <section className="lp-cards">
        {CARDS.map((c, i) => (
          <motion.div
            key={i}
            className={`lp-card ${activeCard === i ? "lp-card-active" : ""}`}
            style={{ "--accent": c.accent } as React.CSSProperties}
            onClick={() => setActiveCard(i)}
            whileTap={{ scale: 0.97 }}
          >
            <div className="lp-card-icon">{c.icon}</div>
            <div className="lp-card-body">
              <span className="lp-card-title">{c.title}</span>
              <AnimatePresence>
                {activeCard === i && (
                  <motion.span
                    className="lp-card-text"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {c.body}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <ChevronRight
              size={16}
              className="lp-card-arrow"
              style={{ transform: activeCard === i ? "rotate(90deg)" : "none" }}
            />
          </motion.div>
        ))}
      </section>

      {/* ── Bottom CTA ── */}
      <section className="lp-bottom-cta">
        <div className="lp-cta-text">
          <span className="lp-cta-label">Ready to route cleaner?</span>
          <span className="lp-cta-sub">Open the live simulator and see your route's air quality.</span>
        </div>
        <button className="lp-cta lp-cta-big" onClick={onLaunchSimulator}>
          Launch <ArrowRight size={18} />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <span>AirShield · WeMakeDevs Environmental Hacks · Track 01 Air</span>
      </footer>
    </div>
  );
};
