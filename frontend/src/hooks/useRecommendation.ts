/**
 * Recommendation Hook (Phase 5).
 * Encapsulates the recommendation query state machine.
 */

import { useState, useCallback } from "react";
import { airshieldApi, ApiError } from "../api/airshieldApi";
import { RecommendationRequest, RecommendationResponse } from "../api/types";

export type QueryStatus = "idle" | "loading" | "success" | "error";

export function useRecommendation() {
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = useCallback(async (req: RecommendationRequest) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await airshieldApi.recommend(req);
      setData(res);
      setStatus("success");
      return res;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Failed to analyze routes.";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  return {
    status,
    data,
    error,
    isLoading: status === "loading",
    isSuccess: status === "success",
    isError: status === "error",
    fetchRecommendation,
    reset
  };
}
