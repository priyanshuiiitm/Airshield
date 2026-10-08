/**
 * AirShield Frontend API Types (Phase 5).
 * Strongly typed contracts matching Phase 3 & 4 backend specifications.
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export type ClassificationOutcome =
  | "LOW"
  | "AVOIDABLE"
  | "UNAVOIDABLE"
  | "INSUFFICIENT_DATA";

export type LanguageCode = "en" | "hi";

export interface RecommendationRequest {
  pickup: Coordinate;
  drop: Coordinate;
  buffer_min?: number;
  language?: LanguageCode;
  worker_id?: string;
  mode?: "snapshot" | "live";
  snapshot_id?: string;
  debug?: boolean;
}

export interface RouteDetail {
  route_id: string;
  duration_minutes: number;
  duration_sec: number;
  distance_km: number;
  distance_m: number;
  exposure_index: number;
  average_pm25: number;
  estimated_integrated_pm25: number;
  feasible: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  geometry: Coordinate[];
}

export interface ToolTraceItem {
  tool: string;
  duration_ms: number;
  status: "success" | "error" | "insufficient_data";
  error?: string;
}

export interface AgentMetadata {
  enabled: boolean;
  source: "AGENT" | "DETERMINISTIC_FALLBACK";
  reason_code: string;
  action: string;
  explanation: string;
  validation_passed: boolean;
  fallback_used: boolean;
  fallback_reason?: string;
  tool_trace?: ToolTraceItem[];
  model_id?: string;
}

export interface RecommendationResponse {
  trip_id: string;
  classification: ClassificationOutcome;
  recommendation: {
    route_id: string | null;
    action: string;
    additional_minutes: number;
    exposure_reduction_percent: number;
    reward_eligible: boolean;
    reward_amount_inr: number;
  };
  routes: RouteDetail[];
  decision: {
    fastest_route_id: string;
    selected_route_id: string | null;
    buffer_minutes: number;
    robust: boolean;
  };
  benefit: {
    type: string;
    amount_inr: number;
    eligible: boolean;
  };
  metadata: {
    snapshot_id: string;
    model_version: string;
    data_mode: string;
    modelled: boolean;
    created_at: string;
  };
  message: string;
  agent?: AgentMetadata;
}

export interface TripChoiceRequest {
  choice: "safer" | "fastest";
}

export interface TripChoiceResponse {
  trip_id: string;
  worker_id: string;
  choice: "safer" | "fastest";
  reward_status: "CREDITED" | "ALREADY_PROCESSED" | "NOT_ELIGIBLE" | string;
  credited_amount_inr: number;
  simulated: boolean;
}

export interface WalletSummary {
  worker_id: string;
  balance_inr: number;
  simulated: boolean;
  rewards: Array<{
    trip_id: string;
    amount_inr: number;
    timestamp: string;
  }>;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  expected_outcome: ClassificationOutcome;
  pickup: Coordinate;
  pickup_name: string;
  drop: Coordinate;
  drop_name: string;
  buffer_min: number;
  snapshot_id: string;
}
