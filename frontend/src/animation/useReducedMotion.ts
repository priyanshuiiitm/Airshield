import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Custom hook to detect if the user prefers reduced motion
 * Wraps the framer-motion hook for consistent usage across the app
 */
export const useReducedMotion = () => {
  return useFramerReducedMotion();
};

/**
 * Utility to get animation configuration based on reduced motion preference
 * @param prefersReducedMotion Boolean indicating if reduced motion is preferred
 * @param standardConfig The standard animation config to use if motion is allowed
 * @param reducedConfig Optional alternative config for reduced motion (defaults to { duration: 0 })
 */
export const getAnimationConfig = (
  prefersReducedMotion: boolean | null,
  standardConfig: any,
  reducedConfig: any = { duration: 0 }
) => {
  return prefersReducedMotion ? reducedConfig : standardConfig;
};
