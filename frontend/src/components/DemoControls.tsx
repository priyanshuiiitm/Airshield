/**
 * DemoControls Component (Phase 5).
 * Secondary demo controls for hackathon presentation and quick scenario switching.
 */

import React from "react";
import { DemoScenario, LanguageCode } from "../api/types";
import { translations } from "../utils/localization";

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scenario_a",
    name: "Scenario A (Avoidable)",
    description: "Hauz Khas to Karol Bagh (Avoidable exposure -> Safer route available)",
    expected_outcome: "AVOIDABLE",
    pickup: { lat: 28.5474, lng: 77.1959 },
    pickup_name: "Hauz Khas",
    drop: { lat: 28.6515, lng: 77.1911 },
    drop_name: "Karol Bagh",
    buffer_min: 5.0,
    snapshot_id: "demo_v1"
  },
  {
    id: "scenario_b",
    name: "Scenario B (Unavoidable)",
    description: "Karol Bagh to Lajpat Nagar (High exposure across all routes within buffer)",
    expected_outcome: "UNAVOIDABLE",
    pickup: { lat: 28.6508, lng: 77.1899 },
    pickup_name: "Karol Bagh",
    drop: { lat: 28.5688, lng: 77.2424 },
    drop_name: "Lajpat Nagar",
    buffer_min: 5.0,
    snapshot_id: "demo_v1"
  }
];

interface DemoControlsProps {
  activeScenarioId: string;
  language: LanguageCode;
  isLoading: boolean;
  onSelectScenario: (scenario: DemoScenario) => void;
}

export const DemoControls: React.FC<DemoControlsProps> = ({
  activeScenarioId,
  language,
  isLoading,
  onSelectScenario
}) => {
  const t = translations[language];

  return (
    <div className="demo-controls-wrapper" data-testid="demo-controls">
      <div className="demo-controls-label">{t.demoScenarioLabel}</div>
      <div className="demo-buttons-row">
        {DEMO_SCENARIOS.map((sc) => {
          const isActive = sc.id === activeScenarioId;
          return (
            <button
              key={sc.id}
              type="button"
              className={`demo-btn ${isActive ? "active" : ""}`}
              disabled={isLoading}
              onClick={() => onSelectScenario(sc)}
              data-testid={`btn-scenario-${sc.id}`}
            >
              <span className="demo-btn-title">
                {sc.id === "scenario_a" ? t.scenarioA : t.scenarioB}
              </span>
              <span className="demo-btn-subtitle">{sc.pickup_name} → {sc.drop_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
