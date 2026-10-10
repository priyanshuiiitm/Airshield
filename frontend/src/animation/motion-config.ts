import { Variants, Transition } from 'framer-motion';

/**
 * Global Animation Configuration
 * Consistent timing and easing for all Framer Motion animations
 */

// Easing curves
export const easings = {
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { type: 'spring', stiffness: 300, damping: 30 }
} as const;

// Duration tokens
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7
} as const;

// Common animation variants
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut
    }
  }
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.normal }
  }
};

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut
    }
  }
};

export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -30
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut
    }
  }
};

// Stagger children animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Card expansion animation
export const expandCard: Variants = {
  collapsed: {
    height: 'auto',
    opacity: 1
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeInOut
    }
  }
};

// Route drawing animation (for map routes)
export const drawPath = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: durations.slower, ease: easings.easeInOut },
      opacity: { duration: durations.fast }
    }
  }
};

// Hover scale animation
export const hoverScale = {
  scale: 1.02,
  transition: {
    duration: durations.fast,
    ease: easings.easeOut
  }
};

// Button press animation
export const tapScale = {
  scale: 0.98,
  transition: {
    duration: durations.instant
  }
};

// Page transition variants
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn
    }
  }
};

// Skeleton loading pulse
export const skeletonPulse: Transition = {
  repeat: Infinity,
  duration: 1.5,
  ease: 'easeInOut'
};
