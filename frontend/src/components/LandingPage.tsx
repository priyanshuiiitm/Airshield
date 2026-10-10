/**
 * LandingPage Component for AirShield.
 * High-impact obsidian dark landing interface inspired by next-gen defense systems.
 * Features live radar simulation, interactive 4-act methodology story, and direct simulator launch.
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, hoverScale, tapScale } from "../animation/motion-config";
import {
  Shield,
  ArrowRight,
  Activity,
  CheckCircle2,
  Volume2,
  VolumeX
} from "lucide-react";
import { useVoice } from "../context/VoiceContext";
import { voiceScripts } from "../services/voiceScripts";

interface LandingPageProps {
  onLaunchSimulator: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchSimulator }) => {
  const [activeAct, setActiveAct] = useState<number>(1);
  const { isVoiceEnabled, setVoiceEnabled, speak, stop, activeHighlightId, language, setLanguage } = useVoice();

  useEffect(() => {
    if (isVoiceEnabled) {
      speak(voiceScripts.landingWelcome(language), "hero-actions-row");
    }
  }, [isVoiceEnabled, language, speak]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page-root" data-testid="landing-page">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP NAVBAR                                        */}
      {/* ---------------------------------------------------- */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <div className="brand-shield-glow">
            <Shield size={20} className="text-white" />
          </div>
          <div className="nav-brand-text">
            <span className="nav-brand-title">AIRSHIELD</span>
            <span className="nav-brand-tag">Delhi NCR</span>
          </div>
        </div>

        <div className="nav-links">
          <button type="button" className="nav-link" onClick={() => scrollToSection("methodology")}>
            Methodology
          </button>
          <button type="button" className="nav-link" onClick={() => scrollToSection("sensors")}>
            Sensor Network
          </button>
          <button type="button" className="nav-link" onClick={() => scrollToSection("proof")}>
            Engine Proof
          </button>
          <button type="button" className="nav-link" onClick={() => scrollToSection("team")}>
            Builders
          </button>
        </div>

        <div className="nav-cta">
          <button type="button" className="btn-nav-launch" onClick={onLaunchSimulator}>
            <span>Open live simulator</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ---------------------------------------------------- */}
      {/* 2. HERO SECTION                                      */}
      {/* ---------------------------------------------------- */}
      <motion.section 
        className="landing-hero-section"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="hero-grid-bg gradient-mesh-aurora"></div>

        <div className="hero-content-wrapper">
          {/* Left Column: Headline & Value Prop */}
          <motion.div className="hero-left-column" variants={fadeInUp}>
            <motion.div className="hero-badge-pill" variants={fadeInUp}>
              <span className="badge-pulse-dot" style={{ background: "var(--aurora-emerald-500)" }}></span>
              <span style={{ color: "var(--aurora-teal-400)" }}>DETERMINISTIC ENVIRONMENTAL ROUTING ENGINE</span>
            </motion.div>

            <motion.h1 className="hero-main-headline" variants={fadeInUp}>
              Pollution is dynamic. <br />
              <span className="headline-gradient-sub" style={{ backgroundImage: "var(--gradient-aurora-primary)", WebkitBackgroundClip: "text", color: "transparent" }}>So should the route.</span>
            </motion.h1>

            <motion.p className="hero-description" variants={fadeInUp} style={{ color: "var(--text-secondary)" }}>
              AirShield models real-time micro-urban PM2.5 exposure in Delhi NCR, interpolates
              statutory CAAQMS monitoring networks, and guides outdoor delivery workers through
              constrained-optimal clean corridors.
            </motion.p>

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

            <motion.div
              id="hero-actions-row"
              className={`hero-actions-row ${activeHighlightId === "hero-actions-row" ? "voice-spotlight-active" : ""}`}
              variants={fadeInUp}
            >
              <motion.button
                type="button"
                className="btn-hero-primary"
                onClick={() => {
                  stop();
                  onLaunchSimulator();
                }}
                data-testid="btn-launch-hero"
                whileHover={{ scale: 1.05, boxShadow: "var(--shadow-glow-violet)" }}
                whileTap={tapScale}
                style={{ background: "var(--gradient-aurora-primary)" }}
              >
                <span>{language === "hi" ? "रूट इंजन शुरू करें" : "Launch route engine"}</span>
                <ArrowRight size={16} />
              </motion.button>

              <motion.button
                type="button"
                className="btn-hero-secondary"
                onClick={() => {
                  scrollToSection("methodology");
                  if (isVoiceEnabled) {
                    speak(voiceScripts.landingStory(language), "methodology");
                  }
                }}
                whileHover={hoverScale}
                whileTap={tapScale}
              >
                <span>{language === "hi" ? "रूटिंग की कहानी पढ़ें" : "Read the routing story"}</span>
                <span className="down-arrow">↓</span>
              </motion.button>
            </motion.div>

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-bar">
              <div className="h-metric-item">
                <span className="h-metric-val text-emerald">10 CAAQMS</span>
                <span className="h-metric-lbl">Statutory Sensors</span>
              </div>
              <div className="h-metric-sep"></div>
              <div className="h-metric-item">
                <span className="h-metric-val text-cyan">~200m</span>
                <span className="h-metric-lbl">Spatial Chunks</span>
              </div>
              <div className="h-metric-sep"></div>
              <div className="h-metric-item">
                <span className="h-metric-val text-amber">24% Drop</span>
                <span className="h-metric-lbl">Median Inhalation</span>
              </div>
              <div className="h-metric-sep"></div>
              <div className="h-metric-item">
                <span className="h-metric-val text-emerald">3-Point</span>
                <span className="h-metric-lbl">Sensitivity Check</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Live Interactive Simulation Preview */}
          <motion.div 
            className="hero-right-column"
            variants={fadeInUp}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top Card: AirShield Environmental Radar Perimeter */}
            <div className="radar-preview-card">
              <div className="radar-card-header">
                <div className="radar-title-wrap">
                  <Activity size={14} className="text-emerald animate-pulse" />
                  <span className="radar-title">MULTI-LAYER AIRSHIELD PERIMETER</span>
                </div>
                <div className="radar-status-live">
                  <span className="dot-pulse-green"></span>
                  <span>DELHI LIVE</span>
                </div>
              </div>

              <div className="radar-visual-container">
                <svg className="radar-svg" viewBox="0 0 360 220" fill="none">
                  <defs>
                    {/* Rotating Radar Sweep Gradient */}
                    <linearGradient id="sweep-beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    {/* Clean corridor glow */}
                    <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Background concentric rings */}
                  <circle cx="180" cy="110" r="95" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="180" cy="110" r="65" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
                  <circle cx="180" cy="110" r="35" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
                  
                  {/* Expanding radar sonar wave */}
                  <circle cx="180" cy="110" r="10" stroke="#10b981" strokeWidth="1.5" fill="none" className="radar-sonar-wave" />

                  {/* Crosshairs */}
                  <line x1="180" y1="10" x2="180" y2="210" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="50" y1="110" x2="310" y2="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                  {/* 360-Degree Continuous Rotating Radar Scanning Beam */}
                  <g className="radar-sweep-group">
                    <line x1="180" y1="110" x2="180" y2="15" stroke="url(#sweep-beam-gradient)" strokeWidth="2.5" />
                    <path d="M 180 110 L 180 15 A 95 95 0 0 1 247 43 Z" fill="rgba(16,185,129,0.08)" />
                  </g>

                  {/* Red High AQI Arterial Base Track */}
                  <path
                    d="M 100 170 Q 150 140 180 50"
                    stroke="#7f1d1d"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.6"
                  />
                  {/* Red Flowing Traffic Pulses */}
                  <path
                    d="M 100 170 Q 150 140 180 50"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    className="animated-flow-red"
                  />

                  {/* Green Clean Ridge Corridor Base Track */}
                  <path
                    d="M 100 170 Q 230 150 180 50"
                    stroke="#065f46"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.6"
                  />
                  {/* Green Flowing Shield Pulses with Neon Glow */}
                  <path
                    d="M 100 170 Q 230 150 180 50"
                    stroke="#10b981"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#radar-glow)"
                    className="animated-flow-green"
                  />

                  {/* Station Monitoring Points with animated pulses */}
                  {[
                    { cx: 120, cy: 80 },
                    { cx: 250, cy: 130 },
                    { cx: 160, cy: 160 },
                    { cx: 210, cy: 60 }
                  ].map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.cx} cy={pt.cy} r="8" fill="rgba(245,158,11,0.2)" className="pulse-dot-amber" />
                      <circle cx={pt.cx} cy={pt.cy} r="4.5" fill="#f59e0b" />
                    </g>
                  ))}

                  {/* Origin Marker (Blue) with Ripple */}
                  <circle cx="100" cy="170" r="10" stroke="#3b82f6" strokeWidth="1.5" fill="none" className="pulse-ripple-blue" />
                  <circle cx="100" cy="170" r="5.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />

                  {/* Destination Marker (Red) with Ripple */}
                  <circle cx="180" cy="50" r="10" stroke="#ef4444" strokeWidth="1.5" fill="none" className="pulse-ripple-red" />
                  <circle cx="180" cy="50" r="5.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                </svg>

                {/* Radar Floating Badges */}
                <div className="radar-floating-badge badge-top-right">
                  <span className="dot-red"></span> High AQI Arterial (185 ┬╡g/m┬│)
                </div>
                <div className="radar-floating-badge badge-bottom-left">
                  <span className="dot-green"></span> Clean Ridge Corridor (82 ┬╡g/m┬│)
                </div>
              </div>
            </div>

            {/* Bottom Card: Live Authorization / Decision Card */}
            <div className="live-decision-preview-card">
              <div className="decision-preview-header">
                <div className="dp-title-row">
                  <span className="dot-pulse-green"></span>
                  <span className="dp-label">LIVE ROUTE OPTIMIZATION ENGINE</span>
                </div>
                <div className="dp-scenario-tags">
                  <span className="dp-tag active">Connaught Place ΓåÆ Karol Bagh</span>
                </div>
              </div>

              <div className="dp-main-row">
                <div className="dp-tradeoff-block">
                  <span className="dp-tradeoff-label">EXPOSURE REDUCTION</span>
                  <div className="dp-tradeoff-val-wrap">
                    <span className="dp-val text-emerald">Γåô 24%</span>
                    <span className="dp-sub">Saved Inhalation</span>
                  </div>
                  <span className="dp-detail-pill text-amber">+2.0m time buffer tradeoff</span>
                </div>

                <div className="dp-risk-dial">
                  <div className="dp-dial-circle">
                    <span className="dp-dial-score text-emerald">76</span>
                    <span className="dp-dial-label">INDEX</span>
                  </div>
                  <span className="dp-dial-tag text-emerald">Clean Feasible</span>
                </div>
              </div>

              <div className="dp-feature-list">
                <div className="dp-feat-item">
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>Segment-by-segment IDW sensor interpolation (4 DPCC CAAQMS stations)</span>
                </div>
                <div className="dp-feat-item">
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>Roadside traffic factor 1.25├ù and Central Ridge green buffer 0.78├ù applied</span>
                </div>
                <div className="dp-feat-item">
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>3-Point Sensitivity Robustness Check Verified (0.5├ù, 1.0├ù, 1.5├ù invariant)</span>
                </div>
              </div>

              <div className="dp-footer-row">
                <div className="dp-decision-tag">
                  <span>State: </span>
                  <strong className="text-emerald">AVOIDABLE (Safer Route Available)</strong>
                </div>
                <button type="button" className="btn-dp-inspect" onClick={onLaunchSimulator}>
                  <span>Simulate Live Γåù</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ---------------------------------------------------- */}
      {/* 3. METHODOLOGY & 4-ACTS CHRONOLOGY SECTION           */}
      {/* ---------------------------------------------------- */}
      <section id="methodology" className="methodology-story-section">
        <div className="section-header-block">
          <span className="section-subtitle-tag">ΓèÖ ONE TRIP. FOUR ACTS.</span>
          <h2 className="section-main-heading">Scroll through the Shield.</h2>
          <p className="section-description-text">
            Trace the end-to-end mathematical lifecycle of AirShield: from statutory sensor ingestion
            and micro-urban IDW spatial decay to constrained buffer optimization and automated worker micro-rewards.
          </p>
        </div>

        <div className="story-split-grid">
          {/* Left Column: Chronology Navigation */}
          <div className="chronology-nav-column">
            <div className="chronology-card">
              <div className="chronology-header">
                <span className="chrono-title">SHIELD CHRONOLOGY</span>
                <span className="chrono-act-indicator">Act {activeAct} of 4</span>
              </div>

              <div className="chrono-timeline-steps">
                {[
                  { act: 1, title: "ACT 01 ΓÇó STATUTORY SENSING", desc: "DPCC & CPCB CAAQMS ingestion" },
                  { act: 2, title: "ACT 02 ΓÇó SPATIAL CONTEXT MODIFIERS", desc: "Roadway vs Tree canopy proxies" },
                  { act: 3, title: "ACT 03 ΓÇó CONSTRAINED OPTIMIZATION", desc: "Delivery buffer & sensitivity check" },
                  { act: 4, title: "ACT 04 ΓÇó 4-STATE CLASSIFICATION", desc: "Worker guidance & carbon incentives" }
                ].map((item) => (
                  <div
                    key={item.act}
                    className={`chrono-step-item ${activeAct === item.act ? "active" : ""}`}
                    onClick={() => {
                      setActiveAct(item.act);
                      scrollToSection(`act-card-${item.act}`);
                    }}
                  >
                    <div className="chrono-dot-wrap">
                      <div className="chrono-dot"></div>
                      {item.act < 4 && <div className="chrono-line"></div>}
                    </div>
                    <div className="chrono-step-text">
                      <span className="chrono-step-tag">{item.title}</span>
                      <span className="chrono-step-desc">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chrono-card-footer">
                <span>Deterministic mathematical core with 166 validated offline tests.</span>
              </div>
            </div>
          </div>

          {/* Right Column: 4 Detailed Act Cards */}
          <div className="story-cards-column">
            {/* ACT 01 */}
            <div
              id="act-card-1"
              className={`story-act-card ${activeAct === 1 ? "focused-card" : ""}`}
              onMouseEnter={() => setActiveAct(1)}
            >
              <div className="act-top-row">
                <span className="act-num-tag">01 / STATUTORY INGESTION</span>
                <span className="act-watermark">01</span>
              </div>
              <h3 className="act-headline">Real statutory air data before taking the road.</h3>
              <p className="act-body">
                AirShield continuously interfaces with statutory Continuous Ambient Air Quality
                Monitoring Stations (CAAQMS) operated by DPCC, CPCB, and IMD. Every reading is
                freshness-verified (&le; 3 hours) to eliminate stale or hallucinated sensor inputs.
              </p>
              <div className="act-pills-row">
                <span className="act-pill">DPCC CAAQMS</span>
                <span className="act-pill">CPCB Network</span>
                <span className="act-pill">Γëñ3h Freshness Verified</span>
                <span className="act-pill">Zero Hallucination</span>
              </div>
            </div>

            {/* ACT 02 */}
            <div
              id="act-card-2"
              className={`story-act-card ${activeAct === 2 ? "focused-card" : ""}`}
              onMouseEnter={() => setActiveAct(2)}
            >
              <div className="act-top-row">
                <span className="act-num-tag">02 / SPATIAL IDW & CONTEXT</span>
                <span className="act-watermark">02</span>
              </div>
              <h3 className="act-headline">Micro-urban context modifiers along ~200m chunks.</h3>
              <p className="act-body">
                Candidate routes are segmented into uniform ~200m spatial chunks with proportional transit
                durations. Ambient PM2.5 is calculated using Inverse-Distance Weighting (1 / d_ij┬▓) and
                refined by micro-urban context proxies: 1.25├ù for major road corridors and 0.78├ù
                for green canopy corridors.
              </p>
              <div className="act-pills-row">
                <span className="act-pill">Inverse-Distance Weighting</span>
                <span className="act-pill">Road Proximity Factor (1.25├ù)</span>
                <span className="act-pill">Green Canopy Buffer (0.78├ù)</span>
              </div>
            </div>

            {/* ACT 03 */}
            <div
              id="act-card-3"
              className={`story-act-card ${activeAct === 3 ? "focused-card" : ""}`}
              onMouseEnter={() => setActiveAct(3)}
            >
              <div className="act-top-row">
                <span className="act-num-tag">03 / CONSTRAINED OPTIMIZATION</span>
                <span className="act-watermark">03</span>
              </div>
              <h3 className="act-headline">Deliver on time, breathe clean air.</h3>
              <p className="act-body">
                Cleaner routes are constrained by worker delivery windows (duration &le; fastest + buffer).
                A recommendation is only labeled robust if it remains the minimum-exposure feasible option
                across <strong>0.5├ù, 1.0├ù, and 1.5├ù</strong> modifier sensitivity configurations.
              </p>
              <div className="act-pills-row">
                <span className="act-pill">Constrained Optimization</span>
                <span className="act-pill">Delivery Time Buffer Filter</span>
                <span className="act-pill">3-Point Sensitivity Invariant</span>
              </div>
            </div>

            {/* ACT 04 */}
            <div
              id="act-card-4"
              className={`story-act-card ${activeAct === 4 ? "focused-card" : ""}`}
              onMouseEnter={() => setActiveAct(4)}
            >
              <div className="act-top-row">
                <span className="act-num-tag">04 / 4-STATE CLASSIFICATION</span>
                <span className="act-watermark">04</span>
              </div>
              <h3 className="act-headline">Four operational states with particulate exposure protection.</h3>
              <p className="act-body">
                Every trip resolves to exactly one state: <strong>AVOIDABLE</strong> (cleaner corridor activated with verified &ge;15% PM2.5 reduction),
                <strong>UNAVOIDABLE</strong> (transit time minimization strategy), <strong>LOW</strong> (baseline PM2.5 &lt; 60 ┬╡g/m┬│),
                or <strong>INSUFFICIENT_DATA</strong>.
              </p>
              <div className="act-pills-row">
                <span className="act-pill">4-State Classification</span>
                <span className="act-pill">Inhalation Protection</span>
                <span className="act-pill">Time Minimization</span>
                <span className="act-pill">Full Mathematical Transparency</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. SENSOR NETWORK SUMMARY SECTION                    */}
      {/* ---------------------------------------------------- */}
      <section id="sensors" className="landing-sensors-section">
        <div className="sensors-header-row">
          <div>
            <span className="section-subtitle-tag">ΓèÖ CONTINUOUS OBSERVATION</span>
            <h2 className="section-main-heading">Delhi NCR Live Station Network</h2>
          </div>
          <button type="button" className="btn-sensors-launch" onClick={onLaunchSimulator}>
            <span>Test on Map Γåù</span>
          </button>
        </div>

        <div className="sensors-preview-grid">
          {[
            { name: "Anand Vihar, Delhi", op: "DPCC", pm: 242, status: "Severe", dist: "East Transit Hub" },
            { name: "Mandir Marg (Central Ridge)", op: "DPCC", pm: 142, status: "Very Poor", dist: "Central Ridge Belt" },
            { name: "ITO Intersection", op: "CPCB", pm: 198, status: "Very Poor", dist: "Arterial Ring Road" },
            { name: "Lodhi Road (Forest Area)", op: "IMD", pm: 78, status: "Moderate", dist: "Green Canopy Corridor" },
            { name: "Dwarka Sector 8", op: "DPCC", pm: 128, status: "Poor", dist: "South West Hub" },
            { name: "Siri Fort Complex", op: "CPCB", pm: 84, status: "Moderate", dist: "South Delhi Green" }
          ].map((st, i) => (
            <div key={i} className="sensor-stat-card">
              <div className="st-card-header">
                <span className="st-op-badge">{st.op}</span>
                <span className="st-pm-val">{st.pm} ┬╡g/m┬│</span>
              </div>
              <h4 className="st-name">{st.name}</h4>
              <span className="st-dist">{st.dist}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. CALL TO ACTION / OPERATIONAL PROOF                */}
      {/* ---------------------------------------------------- */}
      <section id="proof" className="landing-cta-section">
        <div className="cta-ambient-glow"></div>
        <div className="cta-content-box">
          <span className="section-subtitle-tag text-amber">THE OPERATIONAL PROOF</span>
          <h2 className="cta-headline">See the engine make a decision live.</h2>
          <p className="cta-subtitle">
            Open the live interactive workspace to select custom Delhi NCR locations, test delivery buffer constraints,
            inspect real-time statutory sensor citations, and trace pollution-aware route geometry.
          </p>

          <button
            type="button"
            className="btn-cta-launch"
            onClick={onLaunchSimulator}
            data-testid="btn-cta-bottom"
          >
            <span>Open live simulator</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. FOOTER & BUILDERS                                 */}
      {/* ---------------------------------------------------- */}
      <footer id="team" className="landing-footer">
        <div className="footer-left">
          <div className="footer-brand-title">AIRSHIELD</div>
          <p className="footer-desc">
            Deterministic pollution-aware routing and exposure decision support engine for outdoor delivery workers in Delhi NCR.
            Track 01 ΓÇö Air | WeMakeDevs Environmental Hacks.
          </p>
        </div>

        <div className="footer-right">
          <div className="builder-card">
            <div className="builder-avatar">PK</div>
            <div className="builder-info">
              <span className="builder-name">Priyanshu Jha</span>
              <span className="builder-role">Co-builder</span>
            </div>
          </div>

          <div className="builder-card">
            <div className="builder-avatar">SK</div>
            <div className="builder-info">
              <span className="builder-name">Sneh Kansagara</span>
              <span className="builder-role">Co-builder</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
