/**
 * DebugPanel Component (Phase 5).
 * Collapsible developer observability drawer visible only when VITE_DEBUG_MODE=true.
 */

import React, { useState } from "react";
import { RecommendationResponse } from "../api/types";

interface DebugPanelProps {
  recommendation: RecommendationResponse;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ recommendation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const agent = recommendation.agent;

  if (!agent) return null;

  return (
    <div className="debug-panel-wrapper" data-testid="debug-panel">
      <button
        type="button"
        className="debug-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>Telemetry & Verification Engine</span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="debug-content">
          <div className="debug-grid">
            <div className="debug-row">
              <span className="debug-key">Agent Source:</span>
              <span className={`debug-val val-${agent.source.toLowerCase()}`}>{agent.source}</span>
            </div>
            <div className="debug-row">
              <span className="debug-key">Reason Code:</span>
              <span className="debug-val code-font">{agent.reason_code}</span>
            </div>
            <div className="debug-row">
              <span className="debug-key">Validation Passed:</span>
              <span className="debug-val text-green">{agent.validation_passed ? "PASS" : "FAIL"}</span>
            </div>
            <div className="debug-row">
              <span className="debug-key">Fallback Used:</span>
              <span className="debug-val">{agent.fallback_used ? `Yes (${agent.fallback_reason})` : "No"}</span>
            </div>
            {agent.model_id && (
              <div className="debug-row">
                <span className="debug-key">Bedrock Model:</span>
                <span className="debug-val code-font">{agent.model_id}</span>
              </div>
            )}
          </div>

          {/* Tool Execution Trace */}
          {agent.tool_trace && agent.tool_trace.length > 0 && (
            <div className="debug-trace-section">
              <div className="debug-trace-title">Orchestrated Tool Trace:</div>
              <ul className="debug-trace-list">
                {agent.tool_trace.map((trace, idx) => (
                  <li key={idx} className="debug-trace-item">
                    <span className="trace-idx">{idx + 1}.</span>
                    <span className="trace-name code-font">{trace.tool}</span>
                    <span className="trace-dur">{trace.duration_ms} ms</span>
                    <span className={`trace-status status-${trace.status}`}>{trace.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
