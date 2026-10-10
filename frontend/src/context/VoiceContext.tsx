/**
 * VoiceContext & VoiceProvider for AirShield.
 * Manages audio guide state, spotlight element highlighting,
 * bilingual speech synthesis (Hindi & English), and floating widget controls.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { LanguageCode } from "../api/types";
import { speakText, stopSpeaking } from "../services/voiceService";

interface VoiceContextType {
  isVoiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  isSpeaking: boolean;
  currentTranscript: string;
  activeHighlightId: string | null;
  speak: (text: string, highlightId?: string | null, onComplete?: () => void) => void;
  stop: () => void;
  replay: () => void;
  hasPrompted: boolean;
  dismissPrompt: () => void;
  enableVoiceWithPrompt: (chosenLang?: LanguageCode) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode; defaultLang?: LanguageCode }> = ({
  children,
  defaultLang = "en"
}) => {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem("airshield_lang") as LanguageCode) || defaultLang;
  });

  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem("airshield_voice_enabled") === "true";
  });

  const [hasPrompted, setHasPrompted] = useState<boolean>(() => {
    return localStorage.getItem("airshield_voice_prompted") === "true";
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const lastSpokenRef = useRef<{ text: string; highlightId?: string | null }>({ text: "" });

  // Sync voice preference
  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setIsVoiceEnabled(enabled);
    localStorage.setItem("airshield_voice_enabled", enabled ? "true" : "false");
    if (!enabled) {
      stopSpeaking();
      setIsSpeaking(false);
      setActiveHighlightId(null);
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    setHasPrompted(true);
    localStorage.setItem("airshield_voice_prompted", "true");
  }, []);

  const enableVoiceWithPrompt = useCallback(
    (chosenLang?: LanguageCode) => {
      const activeLang = chosenLang || language;
      if (chosenLang) {
        setLanguage(chosenLang);
        localStorage.setItem("airshield_lang", chosenLang);
      }
      setVoiceEnabled(true);
      dismissPrompt();
      // Welcome chime & initial prompt
      const welcomeText =
        activeLang === "hi"
          ? "नमस्ते, एयरशील्ड ऑडियो सहायता सक्रिय है। मैं आपकी यात्रा और स्वच्छ मार्गों में सहायता करूंगी।"
          : "Hello, AirShield audio assistant is active. I will guide you to cleaner routes.";
      speakText(welcomeText, activeLang, {
        onStart: () => {
          setIsSpeaking(true);
          setCurrentTranscript(welcomeText);
        },
        onEnd: () => {
          setIsSpeaking(false);
        }
      });
    },
    [language, setVoiceEnabled, dismissPrompt]
  );

  const speak = useCallback(
    (text: string, highlightId?: string | null, onComplete?: () => void) => {
      if (!isVoiceEnabled) return;
      if (!text || text.trim() === "") return;

      lastSpokenRef.current = { text, highlightId };
      setCurrentTranscript(text);
      if (highlightId) {
        setActiveHighlightId(highlightId);
        // Smoothly scroll target into view if out of viewport
        const el = document.getElementById(highlightId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }

      speakText(text, language, {
        onStart: () => {
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          // Keep highlight for an additional 1.2s before clearing
          setTimeout(() => {
            setActiveHighlightId(null);
          }, 1200);
          if (onComplete) onComplete();
        }
      });
    },
    [isVoiceEnabled, language]
  );

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setActiveHighlightId(null);
  }, []);

  const replay = useCallback(() => {
    if (lastSpokenRef.current.text) {
      speak(lastSpokenRef.current.text, lastSpokenRef.current.highlightId);
    }
  }, [speak]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isVoiceEnabled,
        setVoiceEnabled,
        isSpeaking,
        currentTranscript,
        activeHighlightId,
        speak,
        stop,
        replay,
        hasPrompted,
        dismissPrompt,
        enableVoiceWithPrompt,
        language,
        setLanguage
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export function useVoice(): VoiceContextType {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}
