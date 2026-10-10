/**
 * AirShield Localization & Text Dictionaries (Phase 5).
 * Supports English (en) and Hindi (hi).
 */

import { LanguageCode } from "../api/types";

export interface TranslationDict {
  appTitle: string;
  appSubtitle: string;
  tagSnapshot: string;
  tagLive: string;
  analyzingRoute: string;
  loadingSubtitle: string;
  errorTitle: string;
  errorRetry: string;
  demoScenarioLabel: string;
  scenarioA: string;
  scenarioB: string;
  scenarioLow: string;
  scenarioSparse: string;
  pickupLabel: string;
  dropLabel: string;
  timeBufferLabel: string;
  analyzeButton: string;
  recheckButton: string;
  
  // Card Titles
  titleAvoidable: string;
  titleUnavoidable: string;
  titleLow: string;
  titleInsufficientData: string;
  
  // Card Subtitles / Content
  msgLow: string;
  msgUnavoidable: string;
  msgInsufficientData: string;
  
  // Metric labels
  additionalTime: string;
  exposureReduction: string;
  rewardEarned: string;
  protectionBenefit: string;
  simulated: string;
  
  // Button Actions
  btnTakeSafer: string;
  btnKeepFastest: string;
  btnContinue: string;
  btnSubmitting: string;
  choiceConfirmedSafer: string;
  choiceConfirmedFastest: string;
  
  // Transparency Drawer
  howEstimatedTitle: string;
  transparencyP1: string;
  transparencyP2: string;
  transparencyP3: string;
  transparencyP4: string;
  disclaimerTitle: string;
  disclaimerBody: string;
  confidenceLabel: string;
  robustLabel: string;
  
  // Route details
  fastestRouteLabel: string;
  saferRouteLabel: string;
  otherRouteLabel: string;
}

export const translations: Record<LanguageCode, TranslationDict> = {
  en: {
    appTitle: "AirShield",
    appSubtitle: "Pollution-Aware Route Decision System",
    tagSnapshot: "Delhi NCR Snapshot",
    tagLive: "Live Ingestion",
    analyzingRoute: "Analyzing routes & ambient PM2.5...",
    loadingSubtitle: "Segmenting candidate paths and computing IDW exposure indices...",
    errorTitle: "Unable to analyze route",
    errorRetry: "Try Again",
    demoScenarioLabel: "Select Demo Scenario:",
    scenarioA: "Scenario A (Avoidable)",
    scenarioB: "Scenario B (Unavoidable)",
    scenarioLow: "Scenario C (Low Exposure)",
    scenarioSparse: "Scenario D (Sparse Data)",
    pickupLabel: "Pickup Location",
    dropLabel: "Drop Location",
    timeBufferLabel: "Delivery Buffer",
    analyzeButton: "Analyze Route",
    recheckButton: "Recheck Route",
    
    titleAvoidable: "Safer route found",
    titleUnavoidable: "No safer route within your delivery time",
    titleLow: "Air conditions look okay",
    titleInsufficientData: "Can't confidently compare routes",
    
    msgLow: "Air quality is relatively low-risk. No meaningful lower-exposure intervention is recommended.",
    msgUnavoidable: "Pollution levels are elevated, but no alternative route falls within your allowed delivery buffer.",
    msgInsufficientData: "Air-quality monitoring coverage is currently not sufficient for a reliable comparison.",
    
    additionalTime: "additional",
    exposureReduction: "estimated exposure",
    rewardEarned: "Earn",
    protectionBenefit: "Simulated Benefit",
    simulated: "simulated",
    
    btnTakeSafer: "Take safer route",
    btnKeepFastest: "Keep fastest route",
    btnContinue: "Continue on fastest route",
    btnSubmitting: "Recording choice...",
    choiceConfirmedSafer: "✓ Clean corridor selected (Exposure reduction active)",
    choiceConfirmedFastest: "✓ Fastest route confirmed",
    
    howEstimatedTitle: "How we estimated this",
    transparencyP1: "AirShield estimates relative pollution exposure using nearby statutory monitoring observations (CPCB/DPCC), route duration, and spatial canopy/road modifiers.",
    transparencyP2: "We divide each route into ~200 m segments and estimate PM2.5 using Inverse-Distance Weighting (IDW) from fresh monitoring stations.",
    transparencyP3: "The reduction percentage compares the lowest-exposure feasible route against the fastest route.",
    transparencyP4: "This is a modeled relative decision-support index, not street-level pollution sensing.",
    disclaimerTitle: "Scientific & Medical Disclaimer",
    disclaimerBody: "This system produces a modeled exposure decision-support index. It is not a street-level measurement and is not a medical diagnosis or health guarantee.",
    confidenceLabel: "Data Confidence",
    robustLabel: "Robustness Checked",
    
    fastestRouteLabel: "Fastest",
    saferRouteLabel: "Safer (-{red}%)",
    otherRouteLabel: "Alternative"
  },
  
  hi: {
    appTitle: "AirShield",
    appSubtitle: "प्रदूषण-जागरूक मार्ग अनुशंसा प्रणाली",
    tagSnapshot: "दिल्ली एनसीआर स्नैपशॉट",
    tagLive: "लाइव डेटा",
    analyzingRoute: "मार्ग और वायु गुणवत्ता का विश्लेषण हो रहा है...",
    loadingSubtitle: "मार्गों का विभाजन और प्रदूषण जोखिम की गणना जारी है...",
    errorTitle: "मार्ग का विश्लेषण करने में असमर्थ",
    errorRetry: "पुनः प्रयास करें",
    demoScenarioLabel: "डेमो परिदृश्य चुनें:",
    scenarioA: "परिदृश्य A (बचाव योग्य)",
    scenarioB: "परिदृश्य B (अपरिहार्य)",
    scenarioLow: "परिदृश्य C (कम प्रदूषण)",
    scenarioSparse: "परिदृश्य D (सीमित डेटा)",
    pickupLabel: "पिकअप स्थान",
    dropLabel: "ड्रॉप स्थान",
    timeBufferLabel: "समय बफर",
    analyzeButton: "मार्ग विश्लेषण करें",
    recheckButton: "पुनः जांचें",
    
    titleAvoidable: "सुरक्षित मार्ग मिला है",
    titleUnavoidable: "वर्तमान समय सीमा में कोई सुरक्षित मार्ग नहीं है",
    titleLow: "हवा की स्थिति सामान्य है",
    titleInsufficientData: "डेटा अपर्याप्त है",
    
    msgLow: "इस मार्ग पर प्रदूषण स्तर स्वीकार्य है। सबसे तेज़ मार्ग पर आगे बढ़ें।",
    msgUnavoidable: "प्रदूषण स्तर अधिक है, लेकिन निर्धारित समय सीमा के भीतर कोई स्वच्छ वैकल्पिक मार्ग नहीं है।",
    msgInsufficientData: "विश्वसनीय तुलना के लिए पर्याप्त वायु गुणवत्ता निगरानी स्टेशन उपलब्ध नहीं हैं।",
    
    additionalTime: "अतिरिक्त",
    exposureReduction: "अनुमानित प्रदूषण कम",
    rewardEarned: "लाभ",
    protectionBenefit: "सिम्युलेटेड लाभ",
    simulated: "सिम्युलेटेड",
    
    btnTakeSafer: "सुरक्षित मार्ग चुनें",
    btnKeepFastest: "सबसे तेज़ मार्ग रखें",
    btnContinue: "सबसे तेज़ मार्ग पर चलें",
    btnSubmitting: "विकल्प दर्ज हो रहा है...",
    choiceConfirmedSafer: "✓ स्वच्छ मार्ग चुना गया (प्रदूषण जोखिम में कमी सक्रिय)",
    choiceConfirmedFastest: "✓ सबसे तेज़ मार्ग की पुष्टि हुई",
    
    howEstimatedTitle: "हमने यह अनुमान कैसे लगाया",
    transparencyP1: "AirShield निकटतम सरकारी स्टेशनों (CPCB/DPCC), यात्रा समय और सड़क/हरियाली कारकों का उपयोग करके प्रदूषण जोखिम का अनुमान लगाता है।",
    transparencyP2: "प्रत्येक मार्ग को लगभग 200 मीटर के टुकड़ों में विभाजित कर IDW विधि द्वारा PM2.5 की गणना की जाती है।",
    transparencyP3: "प्रतिशत में कमी सबसे स्वच्छ संभव मार्ग की तुलना सबसे तेज़ मार्ग से करके दिखाई जाती है।",
    transparencyP4: "यह एक तुलनात्मक निर्णय-सहायक सूचकांक है, सटीक सड़क-स्तरीय माप नहीं।",
    disclaimerTitle: "वैज्ञानिक व चिकित्सीय अस्वीकरण",
    disclaimerBody: "यह प्रणाली केवल निर्णय-सहायता के लिए अनुमानित सूचकांक प्रदान करती है। यह चिकित्सीय सलाह या सटीक स्वास्थ्य माप नहीं है।",
    confidenceLabel: "डेटा विश्वसनीयता",
    robustLabel: "संवेदनशीलता सत्यापित",
    
    fastestRouteLabel: "सबसे तेज़",
    saferRouteLabel: "सुरक्षित (-{red}%)",
    otherRouteLabel: "वैकल्पिक"
  }
};

export function getTranslation(lang: LanguageCode, key: keyof TranslationDict): string {
  return translations[lang][key] || translations.en[key] || "";
}

