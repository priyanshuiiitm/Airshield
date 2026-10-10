/**
 * VoiceAssistantWidget Component for AirShield.
 * Provides the initial audio permission modal, floating hands-free audio capsule,
 * live captions for outdoor traffic noise, and quick mute/replay controls.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, Sparkles, X, Languages } from "lucide-react";
import { useVoice } from "../context/VoiceContext";

export const VoiceAssistantWidget: React.FC = () => {
  const {
    isVoiceEnabled,
    setVoiceEnabled,
    isSpeaking,
    currentTranscript,
    replay,
    stop,
    hasPrompted,
    dismissPrompt,
    enableVoiceWithPrompt,
    language,
    setLanguage
  } = useVoice();

  const isHindi = language === "hi";

  const toggleLanguage = () => {
    const next = isHindi ? "en" : "hi";
    setLanguage(next);
    localStorage.setItem("airshield_lang", next);
  };

  return (
    <>
      {/* 1. Initial Permission Modal (Asked once upon first visit) */}
      <AnimatePresence>
        {!hasPrompted && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="voice-prompt-modal"
            role="dialog"
            aria-label="Audio Guide Prompt"
          >
            <div className="voice-prompt-header">
              <div className="voice-prompt-icon-wrap">
                <Sparkles size={18} className="text-emerald" />
              </div>
              <div className="voice-prompt-title-group">
                <span className="voice-prompt-badge">HANDS-FREE RIDER COPILOT</span>
                <h3 className="voice-prompt-title">
                  {isHindi ? "ऑडियो सहायता भाषा चुनें" : "Select Voice Assistant Language"}
                </h3>
              </div>
              <button
                type="button"
                className="voice-prompt-close"
                onClick={dismissPrompt}
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>

            <p className="voice-prompt-desc">
              {isHindi
                ? "डिलीवरी राइडर्स के लिए महिला वॉयस गाइड: स्वच्छ मार्ग और प्रदूषण की जानकारी बोलकर बताएगी।"
                : "Hands-free female voice guide for delivery riders: announces clean canopy routes & live pollution alerts."}
            </p>

            <div className="voice-prompt-lang-options">
              <button
                type="button"
                className="btn-voice-lang-card"
                onClick={() => enableVoiceWithPrompt("hi")}
              >
                <div className="v-card-icon">🇮🇳</div>
                <div className="v-card-text">
                  <span className="v-card-name">हिंदी में सुनें (Hindi)</span>
                  <span className="v-card-sub">महिला आवाज • Hindi Voice</span>
                </div>
                <Volume2 size={16} className="v-card-vol" />
              </button>

              <button
                type="button"
                className="btn-voice-lang-card"
                onClick={() => enableVoiceWithPrompt("en")}
              >
                <div className="v-card-icon">🇬🇧</div>
                <div className="v-card-text">
                  <span className="v-card-name">Listen in English</span>
                  <span className="v-card-sub">Female Voice • Indian Accent</span>
                </div>
                <Volume2 size={16} className="v-card-vol" />
              </button>
            </div>

            <div className="voice-prompt-footer">
              <button
                type="button"
                className="btn-voice-dismiss"
                onClick={dismissPrompt}
              >
                <span>{isHindi ? "अभी नहीं / म्यूट रखें" : "Keep Muted / No Audio"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Live Audio Guide Capsule (Bottom-Right) */}
      <div className="voice-floating-capsule-container">
        <AnimatePresence>
          {isSpeaking && currentTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="voice-live-caption-pill"
            >
              <div className="voice-audio-wave">
                <span className="wave-bar bar-1"></span>
                <span className="wave-bar bar-2"></span>
                <span className="wave-bar bar-3"></span>
              </div>
              <p className="voice-caption-text">{currentTranscript}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`voice-control-pill ${isSpeaking ? "speaking-active" : ""}`}>
          {/* Mute / Unmute Button */}
          <button
            type="button"
            className={`voice-pill-btn ${isVoiceEnabled ? "active" : "muted"}`}
            onClick={() => {
              if (isVoiceEnabled) {
                stop();
                setVoiceEnabled(false);
              } else {
                setVoiceEnabled(true);
                replay();
              }
            }}
            title={isVoiceEnabled ? "Mute audio guide" : "Enable audio guide"}
          >
            {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="voice-pill-lbl">
              {isVoiceEnabled ? (isSpeaking ? (isHindi ? "बोल रहा है..." : "Speaking...") : (isHindi ? "ऑडियो ऑन" : "Audio On")) : (isHindi ? "म्यूट" : "Muted")}
            </span>
          </button>

          {isVoiceEnabled && (
            <>
              {/* Replay Button */}
              <button
                type="button"
                className="voice-sub-btn"
                onClick={replay}
                title="Replay explanation"
              >
                <RotateCcw size={13} />
              </button>

              {/* Language Switch */}
              <button
                type="button"
                className="voice-sub-btn voice-lang-btn"
                onClick={toggleLanguage}
                title="Switch audio language"
              >
                <Languages size={13} />
                <span>{isHindi ? "हि" : "EN"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
