# Frontend Design System Overhaul - Design Document

## Overview

This design outlines the comprehensive transformation of AirShield's frontend from a functional prototype to a production-grade, sophisticated interface. The redesign introduces the Aurora Borealis color palette, a comprehensive animation system using Framer Motion, glassmorphism effects, and a scalable design token architecture.

### Goals

- Transform the visual experience with the Aurora Borealis palette (premium gradients, refined contrast)
- Implement smooth, purposeful animations throughout the interface
- Build a comprehensive design token system for maintainability and consistency
- Achieve WCAG AAA accessibility compliance
- Maintain 60fps performance with hardware-accelerated animations
- Create a scalable foundation for future feature development

### Context

AirShield currently uses an Obsidian Dark design system with neon accent colors. The existing implementation includes:
- Basic dark theme with high-contrast neon colors (emerald, cyan, amber, red)
- Glassmorphic cards with backdrop blur
- Static UI with minimal animations
- Inter variable font and JetBrains Mono for code
- Component structure built with React 18+ and TypeScript

The redesign will enhance rather than replace this foundation, wrapping existing components with new design tokens and animation patterns.

## Architecture

### High-Level Structure

```
Frontend Architecture
├── Design Token Layer (CSS Custom Properties)
│   ├── Aurora Borealis Color Palette
│   ├── Animation Tokens (durations, easings)
│   ├── Typography Scale
│   ├── Spacing & Sizing Scale
│   ├── Elevation System (shadows)
│   └── Border Radius Scale
│
├── Animation System (Framer Motion)
│   ├── Page Transitions
│   ├── Component Enter/Exit Animations
│   ├── Micro-interactions (hover, focus, active)
│   ├── Loading States (skeletons, spinners)
│   └── Gesture Handlers (swipe, drag)
│
├── Component Layer (React Components)
│   ├── Landing Page (hero, methodology, CTA)
│   ├── Navigation (header, mobile menu)
│   ├── Location Picker (inputs, autocomplete)
│   ├── Map Visualization (routes, markers, legend)
│   ├── Decision Cards (AVOIDABLE, UNAVOIDABLE, LOW, INSUFFICIENT_DATA)
│   ├── Route Comparison (sortable cards, metrics)
│   ├── Transparency Panel (tabs, formulas, citations)
│   └── Design System Foundation (buttons, inputs, badges)
│
└── Accessibility Layer
    ├── Keyboard Navigation
    ├── Focus Management
    ├── ARIA Labels & Roles
    ├── Reduced Motion Support
    └── Screen Reader Optimization
```

### Technology Stack

- **Core**: React 18+, TypeScript, Vite
- **Styling**: CSS Custom Properties (no CSS-in-JS)
- **Animation**: Framer Motion (primary animation library)
- **Accessibility**: Radix UI primitives (optional for complex components)
- **Data Visualization**: Recharts (for sparklines and exposure charts)
- **Math Rendering**: KaTeX (for formula display in transparency panel)
- **Maps**: MapLibre GL JS (existing)

## Components and Interfaces

### 1. Design Token System

#### Token Categories

```typescript
// Design Token Interface Structure
interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  animation: AnimationTokens;
  elevation: ElevationTokens;
  borderRadius: BorderRadiusTokens;
}

interface ColorTokens {
  // Aurora Borealis Palette
  aurora: {
    violet: string[];      // [50, 100, 200, ..., 900]
    indigo: string[];      // Northern lights deep blue
    teal: string[];        // Arctic ice blue
    emerald: string[];     // Aurora green
    rose: string[];        // Twilight rose
    amber: string[];       // Sunset amber
  };
  
  // Semantic Colors
  semantic: {
    safe: string;          // --color-safe
    warning: string;       // --color-warning
    danger: string;        // --color-danger
    info: string;          // --color-info
    success: string;       // --color-success
  };
  
  // Functional Colors
  text: {
    primary: string;       // --text-primary
    secondary: string;     // --text-secondary
    muted: string;         // --text-muted
    inverse: string;       // --text-inverse
  };
  
  background: {
    app: string;           // --bg-app (deepest)
    surface: string;       // --bg-surface
    card: string;          // --bg-card (with alpha)
    elevated: string;      // --bg-elevated
  };
}

interface AnimationTokens {
  duration: {
    instant: string;       // 100ms
    fast: string;          // 200ms
    normal: string;        // 300ms
    slow: string;          // 500ms
    slower: string;        // 700ms
  };
  
  easing: {
    easeIn: string;        // cubic-bezier for enter
    easeOut: string;       // cubic-bezier for exit
    easeInOut: string;     // cubic-bezier for state transitions
    spring: string;        // Custom spring config for Framer Motion
  };
}
```

#### CSS Implementation

The tokens will be implemented in `frontend/src/design-tokens.css`:

```css
:root {
  /* ===== Aurora Borealis Color Palette ===== */
  
  /* Violet - Primary brand accent */
  --aurora-violet-50: #faf5ff;
  --aurora-violet-100: #f3e8ff;
  --aurora-violet-200: #e9d5ff;
  --aurora-violet-300: #d8b4fe;
  --aurora-violet-400: #c084fc;
  --aurora-violet-500: #a855f7;
  --aurora-violet-600: #9333ea;
  --aurora-violet-700: #7e22ce;
  --aurora-violet-800: #6b21a8;
  --aurora-violet-900: #581c87;
  
  /* Indigo - Deep northern sky */
  --aurora-indigo-50: #eef2ff;
  --aurora-indigo-500: #6366f1;
  --aurora-indigo-600: #4f46e5;
  --aurora-indigo-700: #4338ca;
  --aurora-indigo-900: #312e81;
  
  /* Teal - Arctic ice, clean air */
  --aurora-teal-50: #f0fdfa;
  --aurora-teal-400: #2dd4bf;
  --aurora-teal-500: #14b8a6;
  --aurora-teal-600: #0d9488;
  --aurora-teal-700: #0f766e;
  
  /* Emerald - Safety, cleaner routes */
  --aurora-emerald-400: #34d399;
  --aurora-emerald-500: #10b981;
  --aurora-emerald-600: #059669;
  
  /* Rose - Danger, high pollution */
  --aurora-rose-400: #fb7185;
  --aurora-rose-500: #f43f5e;
  --aurora-rose-600: #e11d48;
  
  /* Amber - Warning, unavoidable */
  --aurora-amber-400: #fbbf24;
  --aurora-amber-500: #f59e0b;
  --aurora-amber-600: #d97706;
  
  /* ===== Semantic Color Mapping ===== */
  --color-safe: var(--aurora-emerald-500);
  --color-warning: var(--aurora-amber-500);
  --color-danger: var(--aurora-rose-500);
  --color-info: var(--aurora-teal-500);
  --color-primary: var(--aurora-violet-600);
  
  /* ===== Background System ===== */
  --bg-app: #0a0e1a;           /* Deeper, richer black-blue */
  --bg-surface: #0f1420;       /* Primary surface */
  --bg-card: rgba(20, 26, 42, 0.85);
  --bg-card-hover: rgba(30, 39, 61, 0.95);
  --bg-elevated: #1a2034;
  --bg-input: #151d2e;
  
  /* ===== Text Colors ===== */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-inverse: #0f172a;
  
  /* ===== Animation Tokens ===== */
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 700ms;
  
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* ===== Spacing Scale (4px base) ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  
  /* ===== Border Radius Scale ===== */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;
  
  /* ===== Elevation System (4 levels) ===== */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.25);
  --shadow-xl: 0 20px 40px -10px rgba(0, 0, 0, 0.35);
  
  /* Glow shadows for interactive states */
  --shadow-glow-violet: 0 0 20px rgba(168, 85, 247, 0.4);
  --shadow-glow-emerald: 0 0 20px rgba(16, 185, 129, 0.35);
  --shadow-glow-teal: 0 0 20px rgba(20, 184, 166, 0.35);
  
  /* ===== Typography Scale ===== */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 24px;
  --text-3xl: 32px;
  --text-4xl: 42px;
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
}

/* Reduced motion preference support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms;
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
    --duration-slower: 0ms;
  }
  
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2. Animation System Design

#### Framer Motion Integration

Create `frontend/src/animation/motion-config.ts`:

```typescript
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
```

#### Animation Patterns by Component

**Landing Page Hero:**
- Gradient mesh background with subtle parallax on scroll
- Fade-up entrance for headline and description (staggered)
- Floating animation for radar preview card
- Hover effects on CTA buttons (scale + glow)

**Navigation:**
- Sticky header with backdrop blur fade-in on scroll
- Nav items slide in with 100ms stagger on mount
- Hamburger menu slide transition for mobile
- Active route indicator with smooth underline animation

**Location Picker:**
- Input focus: scale 1.02x with glow effect
- Autocomplete dropdown: slide down + fade in
- Drag-to-reorder visual feedback (lift + shadow increase)
- Validation errors: slide in from top

**Map Visualization:**
- Routes draw using stroke-dashoffset animation (1.5s)
- Markers pulse continuously (scale 1.1x, 2s loop)
- Hover tooltips: fade in + translate Y
- Legend collapse/expand with smooth height transition

**Decision Cards:**
- Card entrance: fade-up with 200ms delay
- Metrics animate in sequentially (stagger 100ms)
- Progress bars fill from 0 to value with easing
- Confetti animation on "safer" route selection
- Button hover: scale 1.05x + glow increase

**Route Comparison:**
- Cards fade in with stagger (100ms per card)
- Hover preview: scale 1.02x + border glow
- Sort animation: smooth reorder with layout animation
- Expand/collapse with height transition (300ms)

**Transparency Panel:**
- Drawer open/close: slide down + fade (300ms)
- Tab switching: fade out/in content + slide indicator
- Code blocks: syntax highlight fade-in
- Collapsible sections: rotate chevron + height transition

### 3. Aurora Borealis Color Palette Implementation

#### Color Philosophy

The Aurora Borealis palette draws inspiration from the natural phenomenon of northern lights - rich purples, deep blues, vibrant teals, and warm amber gradients. This creates a sophisticated, premium feel while maintaining the dark-mode foundation.

#### Gradient Definitions

```css
/* Premium gradient backgrounds */
.gradient-aurora-primary {
  background: linear-gradient(135deg, 
    var(--aurora-violet-600) 0%, 
    var(--aurora-indigo-600) 50%,
    var(--aurora-teal-600) 100%
  );
}

.gradient-aurora-success {
  background: linear-gradient(135deg,
    var(--aurora-emerald-500) 0%,
    var(--aurora-teal-500) 100%
  );
}

.gradient-aurora-danger {
  background: linear-gradient(135deg,
    var(--aurora-rose-500) 0%,
    var(--aurora-amber-500) 100%
  );
}

/* Mesh gradient for hero background */
.gradient-mesh-aurora {
  background: 
    radial-gradient(at 20% 30%, var(--aurora-violet-900) 0px, transparent 50%),
    radial-gradient(at 70% 60%, var(--aurora-indigo-900) 0px, transparent 50%),
    radial-gradient(at 50% 90%, var(--aurora-teal-900) 0px, transparent 50%),
    var(--bg-app);
}
```

#### State Color Mapping

```typescript
// Classification state to color mapping
const stateColors = {
  AVOIDABLE: {
    primary: 'var(--aurora-emerald-500)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'var(--aurora-emerald-600)',
    glow: 'var(--shadow-glow-emerald)'
  },
  UNAVOIDABLE: {
    primary: 'var(--aurora-amber-500)',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'var(--aurora-amber-600)',
    glow: '0 0 20px rgba(245, 158, 11, 0.35)'
  },
  LOW: {
    primary: 'var(--aurora-teal-500)',
    bg: 'rgba(20, 184, 166, 0.12)',
    border: 'var(--aurora-teal-600)',
    glow: 'var(--shadow-glow-teal)'
  },
  INSUFFICIENT_DATA: {
    primary: 'var(--text-secondary)',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'var(--text-muted)',
    glow: 'none'
  }
} as const;
```

### 4. Detailed Component Designs

#### 4.1 Landing Page Hero Section

**Structure:**
- Split layout: headline + CTA (left) | interactive radar preview (right)
- Gradient mesh background with subtle animation
- Floating 3D effect on preview cards

**Implementation:**

```typescript
// LandingHero.tsx
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../animation/motion-config';

export const LandingHero = () => {
  return (
    <motion.section
      className="landing-hero-section"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="gradient-mesh-aurora hero-background" />
      
      <div className="hero-content-wrapper">
        <motion.div className="hero-left-column" variants={fadeInUp}>
          <motion.div className="hero-badge-pill" variants={fadeInUp}>
            <span className="badge-pulse-dot" />
            <span>DETERMINISTIC ENVIRONMENTAL ROUTING ENGINE</span>
          </motion.div>
          
          <motion.h1 className="hero-main-headline" variants={fadeInUp}>
            Pollution is dynamic. <br />
            <span className="headline-gradient-sub">So should the route.</span>
          </motion.h1>
          
          <motion.p className="hero-description" variants={fadeInUp}>
            {/* Description content */}
          </motion.p>
          
          <motion.div className="hero-actions-row" variants={fadeInUp}>
            <motion.button
              className="btn-hero-primary"
              whileHover={{ scale: 1.05, boxShadow: 'var(--shadow-glow-violet)' }}
              whileTap={{ scale: 0.98 }}
            >
              Launch route engine
            </motion.button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="hero-right-column"
          variants={fadeInUp}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          {/* Radar preview card */}
        </motion.div>
      </div>
    </motion.section>
  );
};
```

**CSS Enhancements:**

```css
.landing-hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  animation: gradientShift 20s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.8; }
}

.hero-main-headline {
  font-size: clamp(var(--text-3xl), 5vw, var(--text-4xl));
  font-weight: var(--font-extrabold);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.headline-gradient-sub {
  background: linear-gradient(90deg, 
    var(--aurora-violet-400), 
    var(--aurora-teal-400)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.btn-hero-primary {
  background: var(--gradient-aurora-primary);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-bold);
  transition: all var(--duration-fast) var(--ease-out);
}
```

#### 4.2 Navigation Header

**Features:**
- Sticky positioning with backdrop blur on scroll
- Smooth language toggle with slide animation
- Mobile hamburger menu with overlay

**Implementation:**

```typescript
// Header.tsx with animations
import { motion, useScroll, useTransform } from 'framer-motion';

export const Header = () => {
  const { scrollY } = useScroll();
  const backdropBlur = useTransform(scrollY, [0, 50], [0, 16]);
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(13, 18, 29, 0.7)', 'rgba(13, 18, 29, 0.95)']
  );
  
  return (
    <motion.header
      className="app-header"
      style={{
        backdropFilter: backdropBlur,
        backgroundColor
      }}
    >
      {/* Header content */}
    </motion.header>
  );
};
```

**CSS:**

```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
  transition: backdrop-filter var(--duration-normal) var(--ease-out);
}

.lang-btn {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-out);
}

.lang-btn.active {
  background: var(--aurora-violet-600);
  color: white;
  box-shadow: var(--shadow-glow-violet);
}
```

#### 4.3 Location Picker with Animations

**Features:**
- Input focus effects (scale + glow)
- Autocomplete dropdown animations
- Swap button rotation on click
- Drag-to-reorder visual feedback

**Implementation:**

```typescript
import { motion, Reorder } from 'framer-motion';

export const LocationPicker = () => {
  return (
    <motion.div
      className="location-picker-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div className="input-wrapper" whileFocus={{ scale: 1.02 }}>
        <select className="select-field">
          {/* Options */}
        </select>
      </motion.div>
      
      <motion.button
        className="swap-btn"
        whileHover={{ rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <SwapIcon />
      </motion.button>
    </motion.div>
  );
};
```

#### 4.4 Map Visualization with Route Animation

**Features:**
- Animated route drawing using path length
- Pulsing markers
- Hover tooltips with fade-in
- Legend collapse/expand

**Implementation:**

```typescript
// Map route layer with SVG path animation
export const AnimatedRoute = ({ path, color }: RouteProps) => {
  return (
    <motion.path
      d={path}
      stroke={color}
      strokeWidth={4}
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: 1.5, ease: 'easeInOut' },
        opacity: { duration: 0.3 }
      }}
    />
  );
};

// Pulsing marker
export const PulsingMarker = ({ position, color }: MarkerProps) => {
  return (
    <motion.div
      className="map-marker"
      style={{ position: 'absolute', ...position }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      <div className="marker-dot" style={{ background: color }} />
    </motion.div>
  );
};
```

#### 4.5 Decision Cards with State-Based Animations

**Features:**
- Card entrance animation
- Progress bar fill animation
- Confetti effect on safer route selection
- Metric count-up animation

**Implementation:**

```typescript
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

export const DecisionCard = ({ classification, onSelect }: Props) => {
  const [showConfetti, setShowConfetti] = useState(false);
  
  const handleSaferChoice = () => {
    setShowConfetti(true);
    onSelect('safer');
    setTimeout(() => setShowConfetti(false), 3000);
  };
  
  return (
    <motion.div
      className={`decision-card card-${classification.toLowerCase()}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={100}
          recycle={false}
          colors={['#10b981', '#14b8a6', '#34d399']}
        />
      )}
      
      {/* Metrics with stagger */}
      <motion.div
        className="metrics-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            className="metric-box"
            variants={fadeInUp}
          >
            <AnimatedNumber value={metric.value} />
          </motion.div>
        ))}
      </motion.div>
      
      <motion.button
        className="btn-primary btn-safer"
        whileHover={{ scale: 1.05, boxShadow: 'var(--shadow-glow-emerald)' }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSaferChoice}
      >
        Take Safer Route
      </motion.button>
    </motion.div>
  );
};
```

#### 4.6 Route Comparison Cards

**Features:**
- Sortable list with layout animations
- Hover preview effect
- Sparkline charts (Recharts)
- Expand/collapse animation

**Implementation:**

```typescript
import { motion, Reorder } from 'framer-motion';

export const RouteComparison = ({ routes }: Props) => {
  const [routeList, setRouteList] = useState(routes);
  
  return (
    <Reorder.Group
      axis="y"
      values={routeList}
      onReorder={setRouteList}
      className="routes-list-grid"
    >
      {routeList.map(route => (
        <Reorder.Item
          key={route.id}
          value={route}
          className="route-card"
          whileHover={{ 
            scale: 1.02,
            borderColor: 'var(--aurora-teal-500)'
          }}
        >
          <RouteCardContent route={route} />
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
};
```

#### 4.7 Transparency Panel with Tab Animations

**Features:**
- Drawer slide-down animation
- Tab switching with content fade
- Collapsible sections with chevron rotation
- Code syntax highlighting with fade-in

**Implementation:**

```typescript
import { motion, AnimatePresence } from 'framer-motion';

export const TransparencyPanel = ({ isOpen }: Props) => {
  const [activeTab, setActiveTab] = useState('stations');
  
  return (
    <motion.div
      className="transparency-container"
      initial={false}
      animate={{ height: isOpen ? 'auto' : 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="transparency-tabs">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            className={`trans-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab.label}
          </motion.button>
        ))}
        
        <motion.div
          className="tab-indicator"
          layoutId="activeTab"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          <TabContent tab={activeTab} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
```

#### 4.8 Interactive Components (Buttons, Inputs, Badges)

**Button Variants:**

```css
/* Primary Button */
.btn-primary {
  background: var(--gradient-aurora-success);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-bold);
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: var(--shadow-glow-emerald);
  transform: translateY(-2px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Secondary Button */
.btn-secondary {
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-secondary:hover {
  border-color: var(--aurora-violet-500);
  background: var(--bg-card-hover);
}

/* Input Focus States */
.input-wrapper {
  border: 1px solid var(--border-subtle);
  transition: all var(--duration-fast) var(--ease-out);
}

.input-wrapper:focus-within {
  border-color: var(--aurora-violet-500);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
}

/* Badge Styles */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background: var(--aurora-emerald-bg);
  color: var(--aurora-emerald-400);
  border: 1px solid var(--aurora-emerald-600);
}

.badge-warning {
  background: var(--aurora-amber-bg);
  color: var(--aurora-amber-400);
  border: 1px solid var(--aurora-amber-600);
}
```

## Data Models

### Animation State Management

```typescript
// Animation context for global animation preferences
interface AnimationContext {
  prefersReducedMotion: boolean;
  enableHeavyAnimations: boolean; // Based on device capability
  currentPage: string;
}

// Component animation state
interface ComponentAnimationState {
  isAnimating: boolean;
  animationQueue: AnimationQueueItem[];
  completedAnimations: Set<string>;
}

interface AnimationQueueItem {
  id: string;
  component: string;
  type: 'entrance' | 'exit' | 'interaction';
  priority: number;
}
```

### Design Token Type Definitions

```typescript
// Token value with metadata
interface TokenValue<T> {
  value: T;
  cssVar: string;
  description?: string;
  deprecated?: boolean;
  replacement?: string;
}

// Color token with variations
interface ColorToken extends TokenValue<string> {
  variants?: {
    light?: string;
    dark?: string;
    alpha?: Record<number, string>; // Opacity variants
  };
}

// Animation token with configuration
interface AnimationToken extends TokenValue<number | string> {
  frameworkConfig?: {
    framerMotion?: Record<string, any>;
    cssKeyframe?: string;
  };
}
```

## Data Models

Now I'll perform the acceptance criteria testing prework before writing correctness properties:

<function_calls>
<invoke name="prework">
<parameter name="featureName">frontend-design-system-overhaul


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Typography Hierarchy Consistency

*For any* text element in the application, the computed font-weight value should fall within the range 400-800 (inclusive), ensuring consistent typography hierarchy.

**Validates: Requirements 1.4**

### Property 2: Glassmorphism Card Effects

*For any* card element with the `.card` class, it should have `backdrop-filter: blur(...)` applied and a background with alpha transparency (rgba or hsla), creating the glassmorphism effect.

**Validates: Requirements 1.5**

### Property 3: Animation Duration Performance

*For any* loading animation, the animation-duration CSS property or Framer Motion transition duration should be ≤ 300ms, ensuring perceived performance.

**Validates: Requirements 1.6**

### Property 4: Interactive Element States

*For any* interactive element (buttons, links, inputs), focusing or hovering should produce visible state changes including scale transforms and/or box-shadow glows, with appropriate transition timing.

**Validates: Requirements 2.3, 2.7, 3.6, 8.5**

### Property 5: Navigation Item Stagger

*For any* set of navigation items, each item should have an animation-delay set in 100ms increments (0ms, 100ms, 200ms, ...), creating staggered entrance animations.

**Validates: Requirements 2.2**

### Property 6: Autocomplete Fuzzy Search

*For any* search query string in the autocomplete dropdown, the results should include items that match the query using fuzzy matching (character subsequence or edit distance), not just exact prefix matching.

**Validates: Requirements 3.1**

### Property 7: Recent Locations Tracking

*For any* sequence of location selections, the recent locations list should contain the last 5 unique locations in reverse chronological order (most recent first).

**Validates: Requirements 3.5**

### Property 8: SVG Route Path Animation

*For any* route path element rendered as SVG, it should have stroke-dasharray and stroke-dashoffset properties that animate from a hidden state (offset = path length) to fully visible (offset = 0).

**Validates: Requirements 4.1**

### Property 9: Station Marker Pulse Animation

*For any* monitoring station marker on the map, it should have an infinite animation with scale and/or opacity changes that repeat continuously, creating a pulsing effect.

**Validates: Requirements 4.2**

### Property 10: Route Hover Tooltips

*For any* route segment on the map, hovering should render a tooltip element that contains PM2.5 data and appears with fade-in animation.

**Validates: Requirements 4.3**

### Property 11: Route Color Classification

*For any* route with a safety classification, the route stroke color should match the expected mapping: safe routes use green spectrum (emerald), dangerous routes use red spectrum (rose), with intermediate states using amber or teal.

**Validates: Requirements 4.7**

### Property 12: Expandable Section Timing

*For any* expandable/collapsible section, the transition-duration for height changes should be 300ms with ease-out timing function.

**Validates: Requirements 5.1**

### Property 13: Progress Bar Gradients

*For any* progress bar element, it should have a background with linear-gradient or use a gradient fill, and a width or stroke-dashoffset value corresponding to the percentage value it represents.

**Validates: Requirements 5.2**

### Property 14: Framer Motion Icon Animations

*For any* icon component that uses animations, it should be wrapped in a Framer Motion component (motion.*) with animate, initial, or whileHover props defined.

**Validates: Requirements 5.3**

### Property 15: Circular Progress Indicators

*For any* circular progress indicator (typically SVG circle with stroke), the stroke-dasharray and stroke-dashoffset values should correctly represent the percentage: `dashoffset = circumference * (1 - percentage)`.

**Validates: Requirements 5.4**

### Property 16: Sort Transition Timing

*For any* sortable list or table, when sort order changes, the transition-duration for element repositioning should be 200ms.

**Validates: Requirements 6.1**

### Property 17: Route Card Expansion

*For any* route card with collapsible details, toggling the expand state should animate the height property with slide animation (height transition from 0/auto).

**Validates: Requirements 6.2**

### Property 18: Route Card Sparklines

*For any* route comparison card, it should contain a sparkline chart element (typically an SVG path or Recharts component) visualizing exposure data over time.

**Validates: Requirements 5.7, 6.3**

### Property 19: Badge Icon Mapping

*For any* badge component, it should contain an icon that maps to its type: shield icon for safety badges, clock icon for time badges, leaf icon for environmental badges.

**Validates: Requirements 6.4**

### Property 20: Async Component Skeletons

*For any* component that loads data asynchronously, during the loading state it should render skeleton placeholder elements (elements with pulse animation and grey background).

**Validates: Requirements 6.6, 8.6**

### Property 21: Code Block Syntax Highlighting

*For any* code block element displaying source code, it should have syntax highlighting applied through CSS classes (e.g., `.token`, `.keyword`, `.string`) or use a syntax highlighting library.

**Validates: Requirements 7.1**

### Property 22: Copy-to-Clipboard Functionality

*For any* code snippet, there should be an associated copy button that successfully copies the code text to the system clipboard when clicked.

**Validates: Requirements 7.3**

### Property 23: Math Formula Rendering

*For any* LaTeX formula string (e.g., `$E = mc^2$`), rendering should produce DOM elements with KaTeX-specific classes (`.katex`, `.katex-html`), indicating proper math rendering.

**Validates: Requirements 7.4**

### Property 24: Collapsible Chevron Rotation

*For any* collapsible section with a chevron indicator, toggling the collapsed state should rotate the chevron icon by 180 degrees using CSS transform: rotate().

**Validates: Requirements 7.5**

### Property 25: Citation Link Hover

*For any* citation link element, hovering should apply or animate a text-decoration: underline or border-bottom property.

**Validates: Requirements 7.7**

### Property 26: Design Token CSS Variables

*For all* design tokens (colors, spacing, typography, shadows, etc.), they should be defined as CSS custom properties in the `:root` selector, following the naming convention `--category-name-variant` (e.g., `--color-primary`, `--space-4`).

**Validates: Requirements 8.1**

### Property 27: Spacing Scale Consistency

*For any* spacing CSS variable (`--space-*`), its value should be a multiple of 4px (the base unit), ensuring consistent spacing throughout the interface.

**Validates: Requirements 8.7**

## Error Handling

### Animation Failures

**Scenario**: Framer Motion animations fail to load or execute
- **Fallback**: Use CSS transitions as backup
- **Detection**: Monitor animation library load errors
- **Graceful Degradation**: Apply `.no-animations` class to use CSS-only transitions

```typescript
// Animation error boundary
class AnimationErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    if (error.message.includes('framer-motion')) {
      return { hasError: true };
    }
    return null;
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('Animation system failed, using CSS fallback:', error);
    document.documentElement.classList.add('no-animations');
  }
  
  render() {
    return this.props.children;
  }
}
```

### Browser Compatibility Issues

**Scenario**: Backdrop-filter not supported in older browsers
- **Detection**: Use `@supports (backdrop-filter: blur(10px))` in CSS
- **Fallback**: Solid background colors with slightly reduced opacity

```css
.glassmorphic-card {
  background: rgba(20, 26, 42, 0.85);
  backdrop-filter: blur(16px);
}

@supports not (backdrop-filter: blur(16px)) {
  .glassmorphic-card {
    background: rgba(20, 26, 42, 0.95); /* More opaque */
  }
}
```

### Performance Degradation

**Scenario**: Device cannot maintain 60fps with animations
- **Detection**: Monitor frame rate using `requestAnimationFrame` timing
- **Mitigation**: Reduce animation complexity, disable non-critical animations
- **User Control**: Provide "Reduce Animations" setting

```typescript
// Performance monitoring
class AnimationPerformanceMonitor {
  private frameCount = 0;
  private lastCheck = Date.now();
  
  checkPerformance() {
    const now = Date.now();
    const elapsed = now - this.lastCheck;
    
    if (elapsed >= 1000) {
      const fps = (this.frameCount / elapsed) * 1000;
      
      if (fps < 45) {
        // Performance is poor, reduce animations
        document.documentElement.classList.add('reduce-animations');
      }
      
      this.frameCount = 0;
      this.lastCheck = now;
    }
    
    this.frameCount++;
    requestAnimationFrame(() => this.checkPerformance());
  }
}
```

### Reduced Motion Preference

**Scenario**: User has `prefers-reduced-motion: reduce` set
- **Detection**: Media query in CSS and JavaScript
- **Behavior**: Disable all non-essential animations, instant state transitions

```typescript
// Detect motion preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Conditional animation configuration
export const getAnimationConfig = () => {
  if (prefersReducedMotion) {
    return {
      initial: false,
      animate: false,
      transition: { duration: 0 }
    };
  }
  
  return {
    initial: 'hidden',
    animate: 'visible',
    transition: { duration: 0.3 }
  };
};
```

### Resource Loading Failures

**Scenario**: KaTeX, Recharts, or other libraries fail to load
- **Detection**: Try-catch around library imports, error boundaries
- **Fallback**: Plain text for formulas, simple bars for charts

```typescript
// Lazy loading with error handling
const KaTeXRenderer = lazy(() =>
  import('./KaTeXRenderer').catch(() => ({
    default: ({ formula }: { formula: string }) => (
      <code className="formula-fallback">{formula}</code>
    )
  }))
);
```

### Design Token Undefined

**Scenario**: CSS custom property is not defined or has invalid value
- **Detection**: Use `getComputedStyle` to verify token values
- **Fallback**: Hardcoded fallback values in CSS

```css
.button {
  /* Fallback chain for missing tokens */
  background: var(--color-primary, var(--aurora-violet-600, #9333ea));
  padding: var(--space-3, 12px) var(--space-6, 24px);
  border-radius: var(--radius-md, 14px);
}
```

## Testing Strategy

### Testing Approach

The frontend design system will be validated through a dual testing strategy combining **unit tests** for specific examples and **property-based tests** for universal properties.

### Unit Testing with Vitest

**Focus Areas:**
- Specific animation configurations are correct
- Edge cases in token calculations
- Error boundary behavior
- Accessibility attributes are present

**Example Unit Tests:**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with primary variant using Aurora gradient', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    
    // Should use gradient background
    expect(styles.background).toContain('linear-gradient');
  });
  
  it('has visible focus indicator with sufficient contrast', () => {
    render(<Button>Focusable</Button>);
    const button = screen.getByRole('button');
    button.focus();
    
    const styles = window.getComputedStyle(button);
    expect(styles.outline).not.toBe('none');
    expect(styles.outlineWidth).toBe('2px');
  });
  
  it('respects reduced motion preference', () => {
    // Mock reduced motion preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    
    render(<Button>Animated</Button>);
    const button = screen.getByRole('button');
    
    // Should have instant transitions
    const styles = window.getComputedStyle(button);
    expect(styles.transitionDuration).toBe('0.01ms');
  });
});
```

### Property-Based Testing with fast-check

Property-based tests will validate universal properties across generated inputs. Each test should run minimum 100 iterations.

**Configuration:**

```typescript
import fc from 'fast-check';
import { describe, it } from 'vitest';

// Configure property test iterations
const propertyConfig = {
  numRuns: 100,
  seed: 42, // For reproducibility
  timeout: 5000
};
```

**Example Property Tests:**

```typescript
describe('Property: Typography Hierarchy Consistency', () => {
  it('all text elements have font-weight between 400-800', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('h1', 'h2', 'h3', 'p', 'span', 'label'),
        fc.constantFrom('primary', 'secondary', 'muted'),
        (element, variant) => {
          const el = document.createElement(element);
          el.className = `text-${variant}`;
          document.body.appendChild(el);
          
          const weight = parseInt(window.getComputedStyle(el).fontWeight);
          document.body.removeChild(el);
          
          return weight >= 400 && weight <= 800;
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 1: For any text element in the application, the computed font-weight value should fall within the range 400-800 (inclusive)
});

describe('Property: Glassmorphism Card Effects', () => {
  it('all card elements have backdrop blur and alpha transparency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('decision-card', 'route-card', 'location-picker-card'),
        (cardClass) => {
          const card = document.createElement('div');
          card.className = cardClass;
          document.body.appendChild(card);
          
          const styles = window.getComputedStyle(card);
          const hasBackdropBlur = styles.backdropFilter.includes('blur');
          const bgColor = styles.backgroundColor;
          const hasAlpha = bgColor.startsWith('rgba') && parseFloat(bgColor.split(',')[3]) < 1;
          
          document.body.removeChild(card);
          
          return hasBackdropBlur && hasAlpha;
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 2: For any card element with the .card class, it should have backdrop-filter: blur(...) applied and a background with alpha transparency
});

describe('Property: Interactive Element States', () => {
  it('all interactive elements show visible state changes on focus/hover', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('button', 'a', 'input'),
        fc.constantFrom('focus', 'hover'),
        (elementType, interactionType) => {
          const el = document.createElement(elementType);
          if (elementType === 'a') el.href = '#';
          if (elementType === 'button') el.textContent = 'Click';
          
          document.body.appendChild(el);
          
          const initialStyles = window.getComputedStyle(el);
          const initialTransform = initialStyles.transform;
          const initialBoxShadow = initialStyles.boxShadow;
          
          // Simulate interaction
          if (interactionType === 'focus') {
            el.focus();
          } else {
            el.classList.add(':hover'); // Pseudo-class simulation
          }
          
          const activeStyles = window.getComputedStyle(el);
          const hasTransformChange = activeStyles.transform !== initialTransform;
          const hasGlowChange = activeStyles.boxShadow !== initialBoxShadow;
          
          document.body.removeChild(el);
          
          return hasTransformChange || hasGlowChange;
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 4: For any interactive element (buttons, links, inputs), focusing or hovering should produce visible state changes
});

describe('Property: Recent Locations Tracking', () => {
  it('recent list maintains last 5 unique locations in reverse chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          name: fc.string(),
          lat: fc.double({ min: 28.4, max: 28.9 }),
          lng: fc.double({ min: 76.8, max: 77.4 })
        }), { minLength: 5, maxLength: 20 }),
        (locations) => {
          const recentList = new RecentLocationsList();
          
          locations.forEach(loc => recentList.add(loc));
          const recent = recentList.get();
          
          // Should have max 5 items
          if (recent.length > 5) return false;
          
          // Should be unique
          const uniqueNames = new Set(recent.map(l => l.name));
          if (uniqueNames.size !== recent.length) return false;
          
          // Should be most recent first (reverse chronological)
          const lastAdded = locations[locations.length - 1];
          if (recent.length > 0 && recent[0].name !== lastAdded.name) {
            return false;
          }
          
          return true;
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 7: For any sequence of location selections, the recent locations list should contain the last 5 unique locations in reverse chronological order
});

describe('Property: Route Color Classification', () => {
  it('route colors correctly map to safety classifications', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('AVOIDABLE', 'UNAVOIDABLE', 'LOW', 'INSUFFICIENT_DATA'),
        fc.double({ min: 0, max: 300 }), // PM2.5 value
        (classification, pm25) => {
          const route = {
            classification,
            metrics: { pm25 }
          };
          
          const color = getRouteColor(route);
          
          // Color mapping validation
          if (classification === 'AVOIDABLE') {
            return color.includes('#10b981') || color.includes('emerald');
          }
          if (classification === 'UNAVOIDABLE') {
            return color.includes('#f59e0b') || color.includes('amber');
          }
          if (classification === 'LOW') {
            return color.includes('#14b8a6') || color.includes('teal');
          }
          
          return true; // INSUFFICIENT_DATA can be any neutral color
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 11: For any route with a safety classification, the route stroke color should match the expected mapping
});

describe('Property: Design Token CSS Variables', () => {
  it('all design tokens are defined as CSS custom properties in :root', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '--color-primary', '--space-4', '--radius-md', '--shadow-lg',
          '--duration-normal', '--ease-out', '--aurora-violet-600'
        ),
        (tokenName) => {
          const rootStyles = getComputedStyle(document.documentElement);
          const tokenValue = rootStyles.getPropertyValue(tokenName).trim();
          
          return tokenValue.length > 0;
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 26: For all design tokens, they should be defined as CSS custom properties in the :root selector
});

describe('Property: Spacing Scale Consistency', () => {
  it('all spacing variables are multiples of 4px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (multiplier) => {
          const spacingVar = `--space-${multiplier}`;
          const rootStyles = getComputedStyle(document.documentElement);
          const value = rootStyles.getPropertyValue(spacingVar).trim();
          
          if (!value) return true; // Token might not exist for all numbers
          
          const pxValue = parseInt(value);
          return pxValue % 4 === 0;
        }
      ),
      propertyConfig
    );
  });
  
  // Tag: Feature: frontend-design-system-overhaul, Property 27: For any spacing CSS variable (--space-*), its value should be a multiple of 4px
});
```

### Integration Testing

**Focus**: Component interactions, animation sequencing, state management

```typescript
describe('Landing Page Animation Sequence', () => {
  it('hero elements animate in with correct stagger timing', async () => {
    render(<LandingPage />);
    
    const headline = screen.getByRole('heading', { level: 1 });
    const cta = screen.getByRole('button', { name: /launch/i });
    
    // Wait for animations to complete
    await waitFor(() => {
      expect(headline).toHaveStyle({ opacity: '1' });
    }, { timeout: 1000 });
    
    // CTA should appear after headline (stagger delay)
    expect(cta).toHaveStyle({ opacity: '1' });
  });
});
```

### Visual Regression Testing (Future)

**Tools**: Playwright + Percy or Chromatic
**Coverage**: Take screenshots of all components in various states for visual diff tracking

### Accessibility Testing

**Tools**: axe-core, jest-axe
**Coverage**: Run automated accessibility audits on all components

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('decision card has no accessibility violations', async () => {
    const { container } = render(<DecisionCard {...props} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('all interactive elements have accessible names', () => {
    render(<LocationPicker />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });
});
```

### Performance Testing

**Metrics to Track:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Animation frame rate: 60fps

**Tools**: Lighthouse CI, web-vitals library

```typescript
import { getCLS, getFID, getLCP } from 'web-vitals';

describe('Performance', () => {
  it('maintains acceptable LCP', () => {
    getLCP(metric => {
      expect(metric.value).toBeLessThan(2500);
    });
  });
  
  it('animations run at 60fps', () => {
    const frameRates: number[] = [];
    let lastTime = performance.now();
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      const fps = 1000 / delta;
      frameRates.push(fps);
      lastTime = currentTime;
      
      if (frameRates.length < 60) {
        requestAnimationFrame(measureFrame);
      } else {
        const avgFps = frameRates.reduce((a, b) => a + b) / frameRates.length;
        expect(avgFps).toBeGreaterThan(55); // Allow 5fps tolerance
      }
    };
    
    requestAnimationFrame(measureFrame);
  });
});
```

### Test Organization

```
frontend/src/__tests__/
├── unit/
│   ├── components/
│   │   ├── Button.test.tsx
│   │   ├── LocationPicker.test.tsx
│   │   └── DecisionCard.test.tsx
│   ├── animation/
│   │   ├── motion-config.test.ts
│   │   └── animation-utils.test.ts
│   └── design-tokens/
│       └── token-validation.test.ts
│
├── properties/
│   ├── typography.property.test.ts
│   ├── glassmorphism.property.test.ts
│   ├── interactions.property.test.ts
│   ├── animations.property.test.ts
│   └── tokens.property.test.ts
│
├── integration/
│   ├── landing-page.test.tsx
│   ├── navigation-flow.test.tsx
│   └── route-selection.test.tsx
│
├── accessibility/
│   ├── keyboard-navigation.test.tsx
│   ├── screen-reader.test.tsx
│   └── wcag-compliance.test.tsx
│
└── performance/
    ├── animation-fps.test.ts
    ├── web-vitals.test.ts
    └── bundle-size.test.ts
```

### Continuous Integration

```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run unit tests
        run: cd frontend && npm run test:unit
      
      - name: Run property tests
        run: cd frontend && npm run test:property
      
      - name: Run accessibility tests
        run: cd frontend && npm run test:a11y
      
      - name: Check bundle size
        run: cd frontend && npm run build && npx bundlesize
      
      - name: Lighthouse CI
        run: npx lhci autorun
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up design token system in CSS
- Implement Aurora Borealis color palette
- Create animation configuration files
- Update existing components to use new tokens

### Phase 2: Animation System (Week 2)
- Integrate Framer Motion
- Implement core animation variants
- Add page transitions
- Implement micro-interactions (hover, focus, tap)

### Phase 3: Component Enhancement (Week 3-4)
- Landing page redesign with animations
- Navigation header with sticky behavior
- Location picker with improved interactions
- Map visualization enhancements

### Phase 4: Advanced Features (Week 5)
- Decision card animations and confetti
- Route comparison with sortable lists
- Transparency panel with tab animations
- Sparkline charts integration

### Phase 5: Accessibility & Polish (Week 6)
- Keyboard navigation implementation
- Focus management system
- Reduced motion support
- WCAG compliance audit and fixes

### Phase 6: Testing & Documentation (Week 7)
- Write property-based tests
- Write unit tests for components
- Performance optimization
- Design system documentation

---

## Conclusion

This design provides a comprehensive roadmap for transforming AirShield's frontend into a production-grade, sophisticated interface with the Aurora Borealis palette, smooth animations, and a scalable design token system. The architecture balances visual excellence with performance, accessibility, and maintainability.

The dual testing strategy ensures both specific functionality and universal properties are validated, providing confidence in the system's correctness across all states and inputs.
