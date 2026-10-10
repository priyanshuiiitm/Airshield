/**
 * AirShield Voice Service
 * High-performance Web Speech API wrapper with priority for Female Hindi/English voices,
 * Web Audio pleasant chime earcons, and resilience against browser garbage collection bugs.
 */

// Simple Web Audio earcon chime (soft, pleasant two-tone ding)
export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tone 1: 520Hz (C5) -> Tone 2: 660Hz (E5)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Audio context not allowed or failed, silently ignore
  }
}

// Cache voices dynamically across browser lifecycle
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    cachedVoices = list;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

/**
 * Discovers the best Female voice for the given language.
 */
export function getBestFemaleVoice(lang: "en" | "hi"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  let voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === "hi") {
    // 1. Strictly isolate Hindi voices (hi-IN, hi, or name containing Hindi / हिन्दी)
    const hiVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith("hi") ||
        /hindi|हिन्दी/i.test(v.name)
    );

    // 2. Look for female Hindi voice (Kalpana, Swara, Lekha, Kalyani, Shruti, Google हिन्दी, etc.)
    const hiFemale = hiVoices.find(
      (v) => /swara|kalpana|lekha|kalyani|shruti|female|woman|google/i.test(v.name)
    );
    if (hiFemale) return hiFemale;

    // 3. Fall back to any Hindi voice if available
    if (hiVoices.length > 0) return hiVoices[0];

    // Note: Do NOT fall back to an English voice for Hindi text, as English synthesizers
    // cannot articulate Devanagari Hindi phonetics. Leaving utterance.voice null
    // allows browsers like Chrome and Edge to delegate to their built-in hi-IN cloud engine.
    return null;
  }

  // English: Prioritize Indian English Female -> Global Female -> Any English
  const enInFemale = voices.find(
    (v) =>
      (v.lang.toLowerCase() === "en-in" || v.name.includes("India")) &&
      /female|heera|veena|raveena|google/i.test(v.name)
  );
  if (enInFemale) return enInFemale;

  const enGlobalFemale = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith("en") &&
      /female|samantha|victoria|karen|zira|susan|google.*female/i.test(v.name)
  );
  if (enGlobalFemale) return enGlobalFemale;

  const anyIn = voices.find((v) => v.lang.toLowerCase() === "en-in" || v.name.includes("India"));
  if (anyIn) return anyIn;

  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) || voices[0] || null;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let watchdogTimer: any = null;

/**
 * Speaks text using a female voice with safety against Chrome speech synthesis stall bug.
 */
export function speakText(
  text: string,
  lang: "en" | "hi",
  options?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  // Cancel any ongoing speech
  stopSpeaking();

  const voice = getBestFemaleVoice(lang);
  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
  // Pitch 1.12 delivers a crisp, pleasant female vocal timbre
  utterance.pitch = options?.pitch ?? 1.12;
  utterance.rate = options?.rate ?? 0.98;

  utterance.onstart = () => {
    playChime();
    if (options?.onStart) options.onStart();

    // Chrome speech synthesis pause bug watchdog: resume if stalled
    clearInterval(watchdogTimer);
    watchdogTimer = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearInterval(watchdogTimer);
      }
    }, 4500);
  };

  const handleFinish = () => {
    clearInterval(watchdogTimer);
    activeUtterance = null;
    if (options?.onEnd) options.onEnd();
  };

  utterance.onend = handleFinish;
  utterance.onerror = handleFinish;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    clearInterval(watchdogTimer);
    activeUtterance = null;
    window.speechSynthesis.cancel();
  }
}

export function isUtteranceActive(): boolean {
  return activeUtterance !== null;
}
