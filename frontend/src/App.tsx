/**
 * Main AirShield Application (Phase 5).
 * Mobile-first layout with MapLibre visualization and worker decision card.
 */

import React, { useState, useEffect, useCallback } from "react";
import { LanguageCode, DemoScenario } from "./api/types";
import { translations } from "./utils/localization";
import { useRecommendation } from "./hooks/useRecommendation";
import { useTripChoice } from "./hooks/useTripChoice";
import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { DecisionCard } from "./components/DecisionCard";
import { TransparencyPanel } from "./components/TransparencyPanel";
import { DemoControls, DEMO_SCENARIOS } from "./components/DemoControls";
import { DebugPanel } from "./components/DebugPanel";

export const App: React.FC = () => {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem("airshield_lang") as LanguageCode) || "en";
  });
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);

  const t = translations[language];
  const { data: recommendation, isLoading, isError, error, fetchRecommendation } =
    useRecommendation();
  const { isSubmitting, choiceSubmitted, submitChoice, resetChoice } = useTripChoice();

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem("airshield_lang", lang);
  };

  const loadScenario = useCallback(
    (scenario: DemoScenario) => {
      setActiveScenario(scenario);
      resetChoice();
      fetchRecommendation({
        pickup: scenario.pickup,
        drop: scenario.drop,
        buffer_min: scenario.buffer_min,
        language,
        mode: "snapshot",
        snapshot_id: scenario.snapshot_id,
        worker_id: "demo-worker-01",
        debug: true
      });
    },
    [fetchRecommendation, language, resetChoice]
  );

  // Initial load with Scenario A
  useEffect(() => {
    loadScenario(activeScenario);
  }, []);

  // Re-fetch if language changes
  const handleLanguageSwitchAndReload = (lang: LanguageCode) => {
    handleLanguageChange(lang);
    resetChoice();
    fetchRecommendation({
      pickup: activeScenario.pickup,
      drop: activeScenario.drop,
      buffer_min: activeScenario.buffer_min,
      language: lang,
      mode: "snapshot",
      snapshot_id: activeScenario.snapshot_id,
      worker_id: "demo-worker-01",
      debug: true
    });
  };

  const handleChoice = (choice: "safer" | "fastest") => {
    if (recommendation?.trip_id) {
      submitChoice(recommendation.trip_id, choice);
    }
  };

  const routes = recommendation?.routes || [];
  const fastestRouteId = recommendation?.decision?.fastest_route_id;
  const selectedRouteId = recommendation?.recommendation?.route_id;

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageSwitchAndReload}
        onRefresh={() => loadScenario(activeScenario)}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Demo Scenario Selector */}
        <DemoControls
          activeScenarioId={activeScenario.id}
          language={language}
          isLoading={isLoading}
          onSelectScenario={loadScenario}
        />

        <div className="content-split-layout">
          {/* Map Visualization */}
          <section className="map-section" aria-label="Route Map">
            <MapView
              routes={routes}
              fastestRouteId={fastestRouteId}
              selectedRouteId={selectedRouteId}
              pickup={activeScenario.pickup}
              drop={activeScenario.drop}
            />
          </section>

          {/* Decision & Action Area */}
          <section className="decision-section" aria-label="Route Recommendation">
            {/* Loading State */}
            {isLoading && (
              <div className="loading-card" role="status" aria-live="polite">
                <div className="spinner"></div>
                <h3 className="loading-title">{t.analyzingRoute}</h3>
                <p className="loading-desc">{t.loadingSubtitle}</p>
              </div>
            )}

            {/* Error State */}
            {isError && !isLoading && (
              <div className="error-card" role="alert">
                <div className="error-icon">⚠️</div>
                <h3 className="error-title">{t.errorTitle}</h3>
                <p className="error-desc">{error}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => loadScenario(activeScenario)}
                >
                  {t.errorRetry}
                </button>
              </div>
            )}

            {/* Recommendation Result */}
            {recommendation && !isLoading && !isError && (
              <>
                <DecisionCard
                  recommendation={recommendation}
                  language={language}
                  isSubmitting={isSubmitting}
                  choiceSubmitted={choiceSubmitted}
                  onSelectChoice={handleChoice}
                />

                <TransparencyPanel recommendation={recommendation} language={language} />

                <DebugPanel recommendation={recommendation} />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
