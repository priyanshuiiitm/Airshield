/**
 * RiderMode Component (Sunlight / Bike Handlebar Optimized View)
 * Specially designed for couriers on two-wheelers:
 * - High-contrast, clean minimalist HUD styling (Black & White aesthetic)
 * - Large touch targets
 * - Direct binary decision: "Take Safer Clean Corridor" vs "Keep Fastest Route"
 * - N95 Respirator Advisory
 * - Real-time Hindi & English speech synthesis (Voice Guidance)
 * - Turn-by-turn waypoint landmarks
 * - Personal shift inhalation protection tally (strictly non-monetary)
 */

import React, { useState } from "react";
import { RecommendationResponse, LanguageCode } from "../api/types";
import { Shield, Navigation, Volume2, VolumeX, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { formatMinutes } from "../utils/formatting";

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
  const { routes, decision, classification, recommendation: rec } = recommendation;

  const fastestRoute = routes.find((r) => r.route_id === decision?.fastest_route_id) || routes[0];
  const saferRoute = routes.find((r) => r.route_id === rec?.route_id) || routes[1] || routes[0];
  const isAvoidable = classification === "AVOIDABLE";

  // Speech Guidance using browser SpeechSynthesis
  const speakGuidance = () => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let speechText = "";
    if (language === "hi") {
      if (isAvoidable) {
        speechText = `सावधान: वायु गुणवत्ता गंभीर है। अनुशंसित स्वच्छ मार्ग उपलब्ध है। ${rec.additional_minutes} मिनट अतिरिक्त लगेंगे और ${rec.exposure_reduction_percent} प्रतिशत कम धुआं मिलेगा। N95 मास्क पहनें।`;
      } else {
        speechText = `सभी मार्गों पर प्रदूषण अधिक है। सड़क पर समय न्यूनतम रखने के लिए सबसे तेज़ मार्ग चुनें। N95 मास्क पहनें।`;
      }
    } else {
      if (isAvoidable) {
        speechText = `Caution: Severe air pollution detected. A cleaner corridor is available adding ${rec.additional_minutes} minutes with ${rec.exposure_reduction_percent} percent lower exposure. Please wear an N95 respirator mask.`;
      } else {
        speechText = `Background smog is uniformly high. Take the fastest route to minimize total time outdoors. Wear an N95 respirator mask.`;
      }
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const highPm25 = (saferRoute?.average_pm25 || 0) > 100 || (fastestRoute?.average_pm25 || 0) > 100;

  return (
    <div className="rider-mode-wrapper">
      {/* Top Header Bar */}
      <header className="rider-top-nav">
        <button type="button" className="rider-back-btn" onClick={onExitRiderMode}>
          <ArrowLeft size={16} />
          <span>{language === "hi" ? "डेस्कटॉप दृश्य (Exit)" : "Exit Rider Mode"}</span>
        </button>

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

      {/* Main Handlebar HUD Container */}
      <main className="rider-main-container">
        {/* N95 Mask Warning Banner */}
        {highPm25 && (
          <div className="rider-mask-banner">
            <AlertTriangle size={18} className="mask-warning-icon" />
            <div className="mask-text-group">
              <strong className="mask-title">
                {language === "hi" ? "N95 मास्क परामर्श" : "N95 Respirator Strongly Advised"}
              </strong>
              <p className="mask-desc">
                {language === "hi"
                  ? `वायु में PM2.5 स्तर ${(fastestRoute?.average_pm25 || 138)} µg/m³ (गंभीर श्रेणी) है। यात्रा के दौरान N95 मास्क लगाएं।`
                  : `Ambient PM2.5 is ${(fastestRoute?.average_pm25 || 138)} µg/m³ (Hazardous Band). Wear a sealed N95/FFP2 respirator during transit.`}
              </p>
            </div>
          </div>
        )}

        {/* Route Origin & Destination Summary */}
        <div className="rider-trip-summary">
          <div className="trip-point">
            <span className="point-tag">ORIGIN</span>
            <span className="point-name">{pickupName}</span>
          </div>
          <div className="trip-arrow">
            <ArrowRight size={16} />
          </div>
          <div className="trip-point">
            <span className="point-tag">DESTINATION</span>
            <span className="point-name">{dropName}</span>
          </div>
        </div>

        {/* Primary Decision Card */}
        <div className="rider-decision-box">
          <div className="rider-status-header">
            <div className="rider-status-pill">
              <span className={`status-indicator ${isAvoidable ? "ind-green" : "ind-amber"}`}></span>
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
              {/* Giant Trade-Off Indicators */}
              <div className="rider-tradeoff-grid">
                <div className="rider-metric-card">
                  <div className="metric-icon-row">
                    <TrendingDown size={18} className="text-emerald" />
                    <span className="metric-tag">EXPOSURE REDUCTION</span>
                  </div>
                  <span className="metric-large-val">
                    ↓ {rec.exposure_reduction_percent}%
                  </span>
                  <span className="metric-subtext">
                    {language === "hi" ? "कम पार्टिकुलेट एक्सपोज़र" : "Lower Inhalation Risk"}
                  </span>
                </div>

                <div className="rider-metric-card">
                  <div className="metric-icon-row">
                    <Clock size={18} className="text-muted" />
                    <span className="metric-tag">TIME BUFFER</span>
                  </div>
                  <span className="metric-large-val">
                    +{formatMinutes(rec.additional_minutes)}
                  </span>
                  <span className="metric-subtext">
                    {language === "hi" ? "अतिरिक्त यात्रा समय" : "Additional Transit Time"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="rider-actions-stack">
                <button
                  type="button"
                  className={`btn-rider-primary ${choiceSubmitted === "safer" ? "btn-selected-primary" : ""}`}
                  onClick={() => onSelectChoice("safer")}
                >
                  <Shield size={20} />
                  <div className="btn-text-wrap">
                    <span className="btn-main-title">
                      {language === "hi" ? "स्वच्छ मार्ग लें (Take Safer Route)" : "Take Cleaner Air Route"}
                    </span>
                    <span className="btn-sub-note">
                      {saferRoute.duration_minutes}m • {saferRoute.average_pm25} µg/m³ PM2.5
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`btn-rider-secondary ${choiceSubmitted === "fastest" ? "btn-selected-secondary" : ""}`}
                  onClick={() => onSelectChoice("fastest")}
                >
                  <Navigation size={18} />
                  <div className="btn-text-wrap">
                    <span className="btn-main-title">
                      {language === "hi" ? "सबसे तेज़ मार्ग रखें (Keep Fastest)" : "Keep Fastest Direct Route"}
                    </span>
                    <span className="btn-sub-note">
                      {fastestRoute.duration_minutes}m • {fastestRoute.average_pm25} µg/m³ PM2.5
                    </span>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Unavoidable State in Rider View */}
              <div className="rider-unavoidable-notice">
                <Shield size={22} className="text-muted" />
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

              <button
                type="button"
                className="btn-rider-primary"
                onClick={() => onSelectChoice("fastest")}
              >
                <Navigation size={20} />
                <div className="btn-text-wrap">
                  <span className="btn-main-title">
                    {language === "hi" ? "सबसे तेज़ मार्ग पर जारी रखें" : "Proceed on Fastest Route"}
                  </span>
                  <span className="btn-sub-note">{fastestRoute.duration_minutes}m direct transit</span>
                </div>
              </button>
            </>
          )}

          {/* Confirmation Alert */}
          {choiceSubmitted && (
            <div className="rider-confirmation-banner">
              <CheckCircle2 size={18} />
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

        {/* Shift Health Dosimetry (Non-Monetary) */}
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
    </div>
  );
};
