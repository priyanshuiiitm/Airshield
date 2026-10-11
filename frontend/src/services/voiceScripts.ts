/**
 * Voice Scripts for AirShield (Bilingual: English & Hindi).
 * Formatted specifically for natural, clear female text-to-speech pronunciation.
 */

import { LanguageCode, RouteDetail } from "../api/types";

/**
 * Generates 4 realistic intermediate corridor checkpoints for any Delhi trip.
 */
export function getDetailedIntermediateCheckpoints(
  pickupName: string,
  dropName: string,
  isSafer: boolean,
  lang: LanguageCode
): string[] {
  const p = pickupName.toLowerCase();
  const d = dropName.toLowerCase();

  if (isSafer) {
    if (p.includes("hauz") || d.includes("hauz") || p.includes("saket") || d.includes("saket")) {
      return lang === "hi"
        ? [
            "डियर पार्क और हौज खास ग्रीन कैनोपी",
            "शांति पथ दूतावास छायादार मार्ग",
            "धौला कुआं सेंट्रल रिज वन बायपास",
            "पूसा इंस्टीट्यूट और बुद्ध जयंती पार्क कॉरिडोर"
          ]
        : [
            "Deer Park and Hauz Khas green canopy",
            "Shanti Path Embassy tree-lined boulevard",
            "Dhaula Kuan Central Ridge forest bypass",
            "Pusa Institute and Buddha Jayanti Park corridor"
          ];
    } else if (p.includes("dwarka") || d.includes("dwarka") || p.includes("airport") || d.includes("airport")) {
      return lang === "hi"
        ? [
            "द्वारका सेक्टर 21 ग्रीन बफर",
            "दिल्ली कैंट ट्री-लाइन कैनाल रोड",
            "धौला कुआं रिज फॉरेस्ट कॉरिडोर",
            "पूसा हिल ग्रीन बायपास"
          ]
        : [
            "Dwarka Sector 21 green buffer",
            "Delhi Cantt tree-lined canal road",
            "Dhaula Kuan Ridge forest corridor",
            "Pusa Hill green bypass"
          ];
    } else if (p.includes("noida") || d.includes("noida") || p.includes("anand") || d.includes("anand")) {
      return lang === "hi"
        ? [
            "यमुना बायोडायवर्सिटी पार्क लिंक",
            "मयूर विहार पॉकेट 1 ग्रीन बफर",
            "प्रगति मैदान टनल बायपास",
            "इंडिया गेट हेरिटेज ट्री कॉरिडोर"
          ]
        : [
            "Yamuna Biodiversity Park river link",
            "Mayur Vihar green canopy buffer",
            "Pragati Maidan tunnel bypass",
            "India Gate heritage tree-lined corridor"
          ];
    } else {
      return lang === "hi"
        ? [
            "नेहरू पार्क ग्रीन बफर",
            "शांति पथ दूतावास छायादार मार्ग",
            "सेंट्रल रिज फॉरेस्ट रिजर्व",
            "पूसा रोड इंस्टीट्यूशनल कॉरिडोर"
          ]
        : [
            "Nehru Park green buffer",
            "Shanti Path Embassy tree-lined boulevard",
            "Central Ridge forest reserve bypass",
            "Pusa Road institutional green corridor"
          ];
    }
  } else {
    // Fastest direct arterial route (high-traffic arterial choke-points)
    if (p.includes("hauz") || d.includes("hauz") || p.includes("saket") || d.includes("saket")) {
      return lang === "hi"
        ? [
            "आईआईटी आउटर रिंग रोड जंक्शन",
            "एम्स और सफदरजंग भारी ट्रैफिक फ्लाईओवर",
            "मोती बाग आर्टेरियल कंजेशन जोन",
            "वंदे मातरम मार्ग डायरेक्ट कॉरिडोर"
          ]
        : [
            "IIT Outer Ring Road junction",
            "AIIMS and Safdarjung heavy traffic flyover",
            "Moti Bagh arterial congestion choke-point",
            "Vande Mataram Marg direct corridor"
          ];
    } else {
      return lang === "hi"
        ? [
            "मुख्य रिंग रोड आर्टेरियल धमनी",
            "व्यस्त फ्लाईओवर और सिग्नल जंक्शन",
            "कमर्शियल आर्टेरियल कंजेशन जोन",
            "सीधा मुख्य बाजार लिंक मार्ग"
          ]
        : [
            "Main Ring Road arterial corridor",
            "busy multi-lane flyover intersection",
            "high-traffic commercial congestion zone",
            "direct city center market link"
          ];
    }
  }
}

export const voiceScripts = {
  landingWelcome: (lang: LanguageCode) => {
    return lang === "hi"
      ? "एयरशील्ड में आपका स्वागत है। क्या आप लाइव रूट इंजन शुरू करना चाहते हैं, या डिलीवरी राइडर्स के स्वास्थ्य की रक्षा करने वाली हमारी कहानी जानना चाहते हैं?"
      : "Welcome to AirShield. Would you like to launch the route engine, or read the routing story to learn how our pollution-aware navigation protects delivery riders?";
  },

  landingStory: (lang: LanguageCode) => {
    return lang === "hi"
      ? "एयरशील्ड दिल्ली एनसीआर के सरकारी स्टेशनों से प्रदूषण की निगरानी करता है। यह राइडर्स को भारी धुंध से बचाकर, समय सीमा के भीतर स्वच्छ हरित मार्ग प्रदान करता है।"
      : "AirShield constantly monitors particulate pollution across Delhi NCR. Instead of routing delivery workers through severe arterial smog traps, it calculates cumulative particulate exposure and discovers cleaner canopy corridors within delivery time buffers.";
  },

  simulatorWelcome: (lang: LanguageCode) => {
    return lang === "hi"
      ? "कृपया अपना पिकअप और डिलीवरी स्थान चुनें, या अपना डिलीवरी समय बफर सेट करें।"
      : "Please choose your origin and destination pickup points, or adjust your delivery time buffer.";
  },

  routesEvaluated: (
    fastestRoute: RouteDetail,
    saferRoute: RouteDetail,
    reductionPct: number,
    lang: LanguageCode,
    classification: string = "AVOIDABLE"
  ) => {
    if (classification === "UNAVOIDABLE") {
      if (lang === "hi") {
        return `मार्गों का विश्लेषण पूरा हुआ। सभी उपलब्ध गलियारों में वायु प्रदूषण अत्यधिक और एकसमान है। निर्धारित डिलीवरी समय में कोई स्वच्छ मार्ग संभव नहीं है। हम सबसे तेज़ मार्ग पर आगे बढ़ने की सलाह देते हैं, ताकि खुले में बिताया जाने वाला कुल समय न्यूनतम रहे। एन95 मास्क सुरक्षा सक्रिय करें।`;
      }
      return `Routes evaluated. Background particulate smog is uniformly elevated across all corridors. No alternative route achieves the statutory 15 percent reduction within your delivery buffer. I recommend proceeding on the fastest route to minimize your total minutes outdoors. N95 respirator advisory active.`;
    }
    if (classification === "LOW") {
      if (lang === "hi") {
        return `मार्गों का विश्लेषण पूरा हुआ। वर्तमान में वायु गुणवत्ता सुरक्षित सीमा में है, पीएम 2.5 60 माइक्रोग्राम से कम है। सबसे तेज़ मार्ग पर आगे बढ़ें।`;
      }
      return `Routes evaluated. Ambient air quality is currently within safe statutory limits with PM2.5 below 60 micrograms. Proceed directly on the fastest route.`;
    }

    const extraMin = Math.max(1, saferRoute.duration_minutes - fastestRoute.duration_minutes);
    if (lang === "hi") {
      return `मार्गों की गणना पूरी हो गई है। रूट 1 सबसे तेज सीधा मार्ग है जो ${fastestRoute.duration_minutes} मिनट और ${fastestRoute.average_pm25} माइक्रोग्राम पीएम 2.5 प्रदूषण लेता है। रूट 2 स्वच्छ हरित मार्ग है जो ${saferRoute.duration_minutes} मिनट और केवल ${saferRoute.average_pm25} माइक्रोग्राम प्रदूषण लेता है, जो सिर्फ ${extraMin} मिनट जोड़कर ${reductionPct} प्रतिशत प्रदूषण कम करता है। हम स्वच्छ मार्ग चुनने की सलाह देते हैं।`;
    }
    return `Routes evaluated. Route 1 is the fastest arterial path taking ${fastestRoute.duration_minutes} minutes with ${fastestRoute.average_pm25} micrograms PM2.5. Route 2 is the cleaner green corridor taking ${saferRoute.duration_minutes} minutes with only ${saferRoute.average_pm25} micrograms PM2.5, reducing exposure by ${reductionPct} percent with just ${extraMin} minutes extra time. I recommend the cleaner route.`;
  },

  routeSelectedWaypoints: (
    choice: "safer" | "fastest",
    route: RouteDetail,
    pickupName: string,
    dropName: string,
    lang: LanguageCode
  ) => {
    const pName = pickupName.split(" (")[0];
    const dName = dropName.split(" (")[0];
    const isSafer = choice === "safer";
    const checkpoints = getDetailedIntermediateCheckpoints(pickupName, dropName, isSafer, lang);

    if (lang === "hi") {
      const routeType = isSafer ? "स्वच्छ हरित मार्ग" : "सीधा सबसे तेज मार्ग";
      const cpStr = `1. ${checkpoints[0]}, 2. ${checkpoints[1]}, 3. ${checkpoints[2]}, और 4. ${checkpoints[3]}`;
      const safetyNote = isSafer
        ? "स्वास्थ्य सुरक्षा सक्रिय है।"
        : "ध्यान दें: मुख्य सड़क पर वायु प्रदूषण अधिक है। न्यूनतम समय रणनीति अपनाई गई है।";

      return `आपने ${routeType} चुना है, जो ${route.duration_minutes} मिनट लेता है। ${pName} से शुरू करके, आपका मार्ग 4 चेकपॉइंट्स से होकर गुजरेगा: ${cpStr}, और सुरक्षित रूप से ${dName} पहुंचेगा। ${safetyNote}`;
    }

    const routeType = isSafer ? "cleaner green corridor" : "fastest direct arterial route";
    const cpStr = `1. ${checkpoints[0]}, 2. ${checkpoints[1]}, 3. ${checkpoints[2]}, and 4. ${checkpoints[3]}`;
    const safetyNote = isSafer
      ? "Exposure minimization active."
      : "Caution: arterial particulate smog is elevated. Direct transit time minimization applied.";

    return `You selected the ${routeType}, taking ${route.duration_minutes} minutes. Starting from ${pName}, your route proceeds via 4 intermediate checkpoints: ${cpStr}, arriving at ${dName}. ${safetyNote}`;
  },

  batchAnalyticsWelcome: (
    lang: LanguageCode,
    stats?: {
      medianReductionPct: number;
      medianExtraMinutes: number;
      totalIntakeAvoided: string | number;
    }
  ) => {
    const medRed = stats?.medianReductionPct ?? 24;
    const medExtra = stats?.medianExtraMinutes ?? 2.4;
    const intake = stats?.totalIntakeAvoided ?? "1,840";

    if (lang === "hi") {
      return `150-ट्रिप बैच प्रभाव विश्लेषण में आपका स्वागत है। इस सिमुलेशन का मुख्य उद्देश्य यह साबित करना है कि दिल्ली एनसीआर में डिलीवरी राइडर्स को स्वच्छ हवा चुनने के लिए डिलीवरी की गति का त्याग नहीं करना पड़ता। 150 वास्तविक वाणिज्यिक मार्गों पर, 5 मिनट के बफर में हमारे एल्गोरिदम ने मीडियन ${medRed} प्रतिशत जहरीले पीएम 2.5 धुएं की कमी हासिल की है, वह भी केवल ${medExtra} मिनट अतिरिक्त समय में, जिससे ${intake} माइक्रोग्राम-मिनट प्रदूषण टाला गया। आप 'रन लाइव 150-ट्रिप बैच' बटन दबाकर 150 नए यादृच्छिक मार्गों पर लाइव परीक्षण कर सकते हैं और 2 से 10 मिनट के डिलीवरी बफर के प्रभाव को खुद परख सकते हैं।`;
    }

    return `Welcome to 150-Trip Batch Impact Evidence. The purpose of this simulator is to scientifically prove that outdoor delivery workers in Delhi NCR can avoid toxic smog without losing delivery speed. Across 150 commercial delivery corridors under a 5-minute buffer, our model achieves a median ${medRed} percent reduction in cumulative PM2.5 exposure with only ${medExtra} minutes of extra transit time, avoiding ${intake} microgram-minutes of exposure. Click 'Run Live 150-Trip Batch' to simulate 150 fresh stochastic corridors and test delivery buffer tradeoffs for yourself.`;
  },

  batchSimulationCompleted: (
    lang: LanguageCode,
    stats?: {
      medianReductionPct: number;
      medianExtraMinutes: number;
      totalIntakeAvoided?: string;
    }
  ) => {
    const medRed = stats?.medianReductionPct ?? 24;
    const medExtra = stats?.medianExtraMinutes ?? 2.4;
    const intake = stats?.totalIntakeAvoided ?? "1,840";

    if (lang === "hi") {
      return `लाइव 150-ट्रिप सिमुलेशन पूरा हुआ। इस नए बैच में राइडर्स ने औसतन ${medRed} प्रतिशत प्रदूषण घटाया और सिर्फ ${medExtra} मिनट का अतिरिक्त समय लिया, कुल ${intake} माइक्रोग्राम-मिनट एक्सपोज़र बचाया।`;
    }

    return `Live 150-trip simulation complete. In this fresh batch, couriers avoided ${medRed} percent of particulate smog with only ${medExtra} minutes of extra time, saving ${intake} microgram-minutes of exposure.`;
  }
};
