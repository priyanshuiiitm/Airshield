/**
 * AirShield API Client (Phase 5).
 * Encapsulates all network communication with the AWS API Gateway backend.
 */

import {
  RecommendationRequest,
  RecommendationResponse,
  TripChoiceRequest,
  TripChoiceResponse,
  WalletSummary
} from "./types";

const API_BASE_URL = (
  import.meta.env.VITE_AIRSHIELD_API_URL ||
  "https://r2avtmy9q4.execute-api.ap-south-1.amazonaws.com"
).replace(/\/+$/, "");

export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const rawText = await response.text();

    let data: any = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = { raw: rawText };
      }
    }

    if (!response.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.message ||
        `Server returned error ${response.status}`;
      const errorCode = data?.error?.code || `HTTP_${response.status}`;
      throw new ApiError(errorMsg, response.status, errorCode);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / timeout error
    throw new ApiError(
      err?.message || "Failed to connect to AirShield server. Check your network.",
      0,
      "NETWORK_ERROR"
    );
  }
}

export const airshieldApi = {
  /**
   * Request route evaluation, exposure integration, and agent decision.
   */
  async recommend(req: RecommendationRequest): Promise<RecommendationResponse> {
    return request<RecommendationResponse>("/recommend", {
      method: "POST",
      body: JSON.stringify(req)
    });
  },

  /**
   * Submit worker route selection (safer or fastest) for idempotent micro-reward.
   */
  async submitChoice(tripId: string, choice: "safer" | "fastest"): Promise<TripChoiceResponse> {
    const payload: TripChoiceRequest = { choice };
    return request<TripChoiceResponse>(`/trips/${encodeURIComponent(tripId)}/choice`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  /**
   * Retrieve simulated wallet summary and rewards.
   */
  async getWallet(workerId: string): Promise<WalletSummary> {
    return request<WalletSummary>(`/wallet/${encodeURIComponent(workerId)}`, {
      method: "GET"
    });
  }
};
