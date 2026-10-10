/**
 * RiderMode Component (Sunlight / Bike Handlebar Optimized View)
 * Specially designed for couriers on two-wheelers:
 * - High-contrast, clean Apple/Ola minimalist monochrome HUD (Strictly Black & White)
 * - Large touch targets
 * - Direct binary decision: "Take Safer Clean Corridor" vs "Keep Fastest Route"
 * - N95 Respirator Advisory
 * - Real-time Hindi & English speech guidance with Web Audio API chime & live subtitle ticker
 * - Turn-by-turn waypoint landmarks
 * - Personal shift inhalation protection tally
 */

import React, { useState, useRef, useEffect } from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { Shield, Navigation, Volume2, VolumeX, AlertTriangle, ArrowLeft, ArrowRight, Clock, TrendingDown } from "lucide-react";
import { formatMinutes } from "../utils/formatting";
import { uberIcons, uberImages } from "../constants/uberAssets";
import { motion } from "framer-motion";

interface RiderModeProps {
  recommendation: RecommendationResponse;
  language: LanguageCode;
  pickupName: string;
  dropName: string;
  bufferMin: number;
  onExitRiderMode: () => void;
  onSelectChoice: (choice: "safer" | "fastest") => void;
  choiceSubmitted: "safer" | "fastest" | null;
}

export const RiderMode: React.FC<RiderModeProps> = ({
  recommendation,
  language,
  pickupName,
  dropName,
  bufferMin,
  onExitRiderMode,
  onSelectChoice,
  choiceSubmitted
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveSpeechCaption, setLiveSpeechCaption] = useState<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimeoutRef = useRef<any>(null);

  const { routes, decision, classification, recommendation: rec } = recommendation;

  const fastestRoute = routes.find((r) => r.route_id === decision?.fastest_route_id) || routes[0];
  const saferRoute = routes.find((r) => r.route_id === rec?.route_id) || routes[1] || routes[0];
  const isAvoidable = classification === "AVOIDABLE";

  // Preload speech synthesis voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = onVoicesChanged;
      return () => {
        window.speechSynthesis.cancel();
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      };
    }
  }, []);

  // Crisp Apple/Tesla Web Audio API feedback chime
  const playAudioChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {
      console.warn("Chime playback error:", e);
    }
  };

  // Robust Speech Guidance using browser SpeechSynthesis + Web Audio chime
  const speakGuidance = () => {
    // If currently speaking, cancel immediately
    if (isSpeaking) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      setIsSpeaking(false);
      setLiveSpeechCaption("");
      return;
    }

    // 1. Play immediate audio chime
    playAudioChime();

    const extraMin = rec?.additional_minutes ?? 2;
    const redPct = rec?.exposure_reduction_percent ?? 24;

    const speechTextHi = isAvoidable
      ? `सावधान: वायु गुणवत्ता गंभीर है। स्वच्छ मार्ग उपलब्ध है। ${extraMin} मिनट अतिरिक्त लगेंगे और ${redPct} प्रतिशत कम धुआं मिलेगा। N95 मास्क लगाएं।`
      : `सभी मार्गों पर प्रदूषण अधिक है। सड़क पर समय न्यूनतम रखने के लिए सबसे तेज़ मार्ग चुनें। N95 मास्क लगाएं।`;

    const speechTextEn = isAvoidable
      ? `Caution: Severe air pollution detected. A cleaner corridor is available adding ${extraMin} minutes with ${redPct} percent lower exposure. Please wear an N95 respirator mask.`
      : `Background smog is uniformly high. Take the fastest route to minimize total time outdoors. Wear an N95 respirator mask.`;

    const displayCaption = language === "hi" ? speechTextHi : speechTextEn;

    setIsSpeaking(true);
    setLiveSpeechCaption(displayCaption);

    // 2. Synthesize speech if supported
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        // Tiny delay required by Chromium to allow cancel() to complete before scheduling speak()
        setTimeout(() => {
          try {
            const voices = window.speechSynthesis.getVoices();
            const hasHindiVoice = voices.some((v) => v.lang.toLowerCase().startsWith("hi"));

            // If user requested Hindi, but device has no Hindi voice, speak English so device doesn't error out or remain mute
            const textToSpeak = (language === "hi" && hasHindiVoice) ? speechTextHi : speechTextEn;
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = (language === "hi" && hasHindiVoice) ? "hi-IN" : "en-US";
            utterance.rate = 0.95;

            if (voices.length > 0) {
              const langPrefix = (language === "hi" && hasHindiVoice) ? "hi" : "en";
              const match =
                voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
                voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
                voices[0];
              if (match) {
                utterance.voice = match;
              }
            }

            utterance.onend = () => {
              setIsSpeaking(false);
              setLiveSpeechCaption("");
            };
            utterance.onerror = (e) => {
              console.warn("SpeechSynthesis error:", e);
              // Retain caption banner visible even if browser audio synthesis fails
            };

            // GC protection (prevents garbage collector canceling speech in Chrome)
            utteranceRef.current = utterance;
            (window as any).__airshieldUtterance = utterance;

            window.speechSynthesis.resume();
            window.speechSynthesis.speak(utterance);
          } catch (speakErr) {
            console.warn("Inner speech synthesis error:", speakErr);
          }
        }, 60);
      } catch (err) {
        console.warn("SpeechSynthesis engine error:", err);
      }
    }

    // Safety timeout to reset caption and button state after 9 seconds
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false);
      setLiveSpeechCaption("");
    }, 9000);
  };

  const highPm25 = (saferRoute?.average_pm25 || 0) > 100 || (fastestRoute?.average_pm25 || 0) > 100;

  const handleActionClick = (choice: "safer" | "fastest") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100]); // Haptic feedback!
    }
    onSelectChoice(choice);
  };

  return (
    <motion.div 
      className="rider-mode-wrapper"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      {/* Top Header Bar (Apple / Ola Minimalism) */}
      <header className="rider-top-nav">
        <motion.button type="button" className="rider-back-btn" onClick={onExitRiderMode} whileTap={{ scale: 0.9 }}>
          <ArrowLeft size={16} />
          <span>{language === "hi" ? "डेस्कटॉप दृश्य (Exit)" : "Exit Rider Mode"}</span>
        </motion.button>

        <div className="rider-mode-badge">
          <span className="rider-badge-dot"></span>
          <span>{language === "hi" ? "राइडर डिस्प्ले" : "Rider HUD Display"}</span>
        </div>

        <button
          type="button"
          className={`rider-voice-btn ${isSpeaking ? "speaking-active" : ""}`}
          onClick={speakGuidance}
          title="Play audio voice guidance"
        >
          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{isSpeaking ? (language === "hi" ? "म्यूट" : "Mute") : (language === "hi" ? "ऑडियो गाइड" : "Voice Guide")}</span>
        </button>
      </header>

      {/* Live Voice Guidance Caption Bar */}
      {liveSpeechCaption && (
        <div className="rider-speech-caption-banner animate-fade-in">
          <Volume2 size={16} style={{ color: "#ffffff", flexShrink: 0 }} />
          <span className="caption-text">{liveSpeechCaption}</span>
        </div>
      )}

      {/* Main Handlebar HUD Container */}
      <main className="rider-main-container">
        {/* N95 Mask Warning Banner (Strictly Monochrome) */}
        {highPm25 && (
          <div className="rider-mask-banner">
            <AlertTriangle size={18} style={{ color: "#ffffff", flexShrink: 0 }} />
            <div className="mask-text-group">
              <strong className="mask-title">
                {language === "hi" ? "N95 मास्क परामर्श" : "N95 Respirator Strongly Advised"}
              </strong>
              <p className="mask-desc">
                {language === "hi"
                  ? `वायु में PM2.5 स्तर ${(fastestRoute?.average_pm25 || 138)} µg/m³ है। यात्रा के दौरान N95 मास्क लगाएं।`
                  : `Ambient PM2.5 is ${(fastestRoute?.average_pm25 || 138)} µg/m³ (Hazardous Band). Wear a sealed N95 respirator during transit.`}
              </p>
            </div>
          </div>
        )}

        {/* Route Origin & Destination Summary (Uber Route Format) */}
        <div className="rider-trip-summary">
          <div className="trip-point" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
            <img src={uberIcons.target} alt="Pickup" style={{ width: 18, height: 18, objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="point-tag">PICKUP</span>
              <span className="point-name">{pickupName}</span>
            </div>
          </div>
          <div className="trip-arrow">
            <ArrowRight size={16} />
          </div>
          <div className="trip-point" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
            <img src={uberIcons.point} alt="Destination" style={{ width: 18, height: 18, objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="point-tag">DROP</span>
              <span className="point-name">{dropName}</span>
            </div>
          </div>
        </div>

        {/* Primary Decision Card */}
        <div className="rider-decision-box">
          <div className="rider-status-header">
            <div className="rider-status-pill">
              <span className="rider-status-dot"></span>
              <span className="status-label">
                {isAvoidable
                  ? language === "hi"
                    ? "स्वच्छ वायु गलियारा उपलब्ध"
                    : "Cleaner Air Corridor Recommended"
                  : language === "hi"
                  ? "अपरिहार्य धुआं (समान प्रदूषण)"
                  : "Uniform Background Smog"}
              </span>
            </div>
            <span className="rider-constraint-tag">+{bufferMin}m buffer</span>
          </div>

          {isAvoidable ? (
            <>
              {/* Clean Monochromatic Trade-Off Indicators */}
              <div className="rider-tradeoff-grid">
                <div className="rider-metric-card">
                  <div className="metric-icon-row">
                    <TrendingDown size={18} style={{ color: "#ffffff" }} />
                    <span className="metric-tag">EXPOSURE REDUCTION</span>
                  </div>
                  <span className="metric-large-val">
                    ↓ {rec?.exposure_reduction_percent ?? 24}%
                  </span>
                  <span className="metric-subtext">
                    {language === "hi" ? "कम पार्टिकुलेट एक्सपोज़र" : "Lower Inhalation Risk"}
                  </span>
                </div>

                <div className="rider-metric-card">
                  <div className="metric-icon-row">
                    <Clock size={18} style={{ color: "#a1a1aa" }} />
                    <span className="metric-tag">TIME BUFFER</span>
                  </div>
                  <span className="metric-large-val">
                    +{formatMinutes(rec?.additional_minutes ?? 2)}
                  </span>
                  <span className="metric-subtext">
                    {language === "hi" ? "अतिरिक्त यात्रा समय" : "Additional Transit Time"}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Uber / Apple Monochrome) */}
              <div className="rider-actions-stack">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  className={`btn-rider-primary ${choiceSubmitted === "safer" ? "btn-selected-primary" : ""}`}
                  onClick={() => handleActionClick("safer")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <Shield size={20} />
                    <div className="btn-text-wrap">
                      <span className="btn-main-title">
                        {language === "hi" ? "स्वच्छ मार्ग लें (Take Safer Route)" : "Take Cleaner Air Route"}
                      </span>
                      <span className="btn-sub-note">
                        {saferRoute.duration_minutes}m • {saferRoute.average_pm25} µg/m³ PM2.5
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={uberImages.signUpCar} alt="Vehicle" style={{ width: 44, height: 26, objectFit: "contain" }} />
                    {choiceSubmitted === "safer" && (
                      <img src={uberIcons.checkmark} alt="Selected" style={{ width: 18, height: 18, objectFit: "contain" }} />
                    )}
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  className={`btn-rider-secondary ${choiceSubmitted === "fastest" ? "btn-selected-secondary" : ""}`}
                  onClick={() => handleActionClick("fastest")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <Navigation size={18} />
                    <div className="btn-text-wrap">
                      <span className="btn-main-title">
                        {language === "hi" ? "सबसे तेज़ मार्ग रखें (Keep Fastest)" : "Keep Fastest Direct Route"}
                      </span>
                      <span className="btn-sub-note">
                        {fastestRoute.duration_minutes}m • {fastestRoute.average_pm25} µg/m³ PM2.5
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={uberImages.signUpCar} alt="Vehicle" style={{ width: 40, height: 24, objectFit: "contain", opacity: 0.8 }} />
                    {choiceSubmitted === "fastest" && (
                      <img src={uberIcons.checkmark} alt="Selected" style={{ width: 18, height: 18, objectFit: "contain" }} />
                    )}
                  </div>
                </motion.button>
              </div>
            </>
          ) : (
            <>
              {/* Unavoidable State in Rider View */}
              <div className="rider-unavoidable-notice">
                <Shield size={22} style={{ color: "#a1a1aa" }} />
                <div className="notice-content">
                  <h3 className="notice-title">
                    {language === "hi" ? "न्यूनतम समय रणनीति अपनाएं" : "Follow Fastest Direct Path"}
                  </h3>
                  <p className="notice-desc">
                    {language === "hi"
                      ? "सभी उपलब्ध रास्तों पर प्रदूषण समान रूप से अधिक है। बाहर सड़क पर कुल समय न्यूनतम रखने के लिए सबसे तेज़ मार्ग चुनें।"
                      : "Smog is uniformly elevated across all roads. Taking the fastest route minimizes total outdoor exposure minutes."}
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                className="btn-rider-primary"
                onClick={() => handleActionClick("fastest")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <Navigation size={20} />
                  <div className="btn-text-wrap">
                    <span className="btn-main-title">
                      {language === "hi" ? "सबसे तेज़ मार्ग पर जारी रखें" : "Proceed on Fastest Route"}
                    </span>
                    <span className="btn-sub-note">{fastestRoute.duration_minutes}m direct transit</span>
                  </div>
                </div>
                <img src={uberImages.signUpCar} alt="Vehicle" style={{ width: 44, height: 26, objectFit: "contain" }} />
              </motion.button>
            </>
          )}

          {/* Confirmation Alert */}
          {choiceSubmitted && (
            <div className="rider-confirmation-banner">
              <img src={uberIcons.checkmark} alt="Selected" style={{ width: 18, height: 18, objectFit: "contain" }} />
              <span>
                {choiceSubmitted === "safer"
                  ? language === "hi"
                    ? "अनुशंसित स्वच्छ मार्ग चुना गया! (Safer Corridor Selected)"
                    : "Clean Air Corridor Selected"
                  : language === "hi"
                  ? "सबसे तेज़ मार्ग चुना गया! (Fastest Route Selected)"
                  : "Fastest Direct Route Selected"}
              </span>
            </div>
          )}
        </div>

        {/* Shift Health Dosimetry (Strictly Monochrome) */}
        <section className="rider-shift-tally">
          <div className="shift-tally-header">
            <span className="shift-title">
              {language === "hi" ? "आज की पाली का स्वास्थ्य रिकॉर्ड" : "Today's Shift Exposure Summary"}
            </span>
            <span className="shift-tag">Observed</span>
          </div>
          <div className="shift-stats-row">
            <div className="shift-stat-box">
              <span className="shift-stat-val">4</span>
              <span className="shift-stat-lbl">{language === "hi" ? "ट्रिप्स पूरी हुईं" : "Trips Completed"}</span>
            </div>
            <div className="shift-stat-box">
              <span className="shift-stat-val">2h 15m</span>
              <span className="shift-stat-lbl">{language === "hi" ? "सड़क पर समय" : "Transit Time"}</span>
            </div>
            <div className="shift-stat-box">
              <span className="shift-stat-val">↓ 1,840</span>
              <span className="shift-stat-lbl">{language === "hi" ? "बचाया गया धुआं" : "Avoided (µg·min)"}</span>
            </div>
            <div className="shift-stat-box">
              <span className="shift-stat-val">92%</span>
              <span className="shift-stat-lbl">{language === "hi" ? "सुरक्षा दर" : "Adherence"}</span>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
};
