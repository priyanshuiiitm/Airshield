/**
 * Trip Choice Hook (Phase 5).
 * Submits worker route selection and prevents duplicate clicks.
 */

import { useState, useCallback } from "react";
import { airshieldApi, ApiError } from "../api/airshieldApi";
import { TripChoiceResponse } from "../api/types";

export function useTripChoice() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [choiceSubmitted, setChoiceSubmitted] = useState<"safer" | "fastest" | null>(null);
  const [choiceResponse, setChoiceResponse] = useState<TripChoiceResponse | null>(null);
  const [choiceError, setChoiceError] = useState<string | null>(null);

  const submitChoice = useCallback(
    async (tripId: string, choice: "safer" | "fastest") => {
      if (isSubmitting || choiceSubmitted === choice) return;

      setIsSubmitting(true);
      setChoiceError(null);

      try {
        const res = await airshieldApi.submitChoice(tripId, choice);
        setChoiceSubmitted(choice);
        setChoiceResponse(res);
        return res;
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : "Failed to submit choice.";
        setChoiceError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, choiceSubmitted]
  );

  const resetChoice = useCallback(() => {
    setIsSubmitting(false);
    setChoiceSubmitted(null);
    setChoiceResponse(null);
    setChoiceError(null);
  }, []);

  return {
    isSubmitting,
    choiceSubmitted,
    choiceResponse,
    choiceError,
    submitChoice,
    resetChoice
  };
}
