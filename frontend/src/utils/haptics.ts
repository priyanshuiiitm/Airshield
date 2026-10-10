export const triggerHaptic = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && navigator && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore
    }
  }
};
