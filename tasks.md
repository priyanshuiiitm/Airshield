# Implementation Plan: Frontend Design System Overhaul

## Overview

Transform AirShield's frontend from a functional prototype to a production-grade interface with the Aurora Borealis color palette, comprehensive animation system using Framer Motion, glassmorphism effects, and a scalable design token architecture. This implementation follows a phased approach building from foundation (tokens, colors) to animations, component enhancements, advanced features, accessibility, and testing.

## Implementation Approach

- **Incremental Enhancement**: Wrap existing components with new design tokens and animations rather than complete rewrites
- **Testing Strategy**: Property-based tests validate universal properties; unit tests validate specific examples
- **Performance Focus**: Hardware-accelerated animations, CSS custom properties, lazy loading for heavy libraries
- **Accessibility First**: WCAG AAA compliance with keyboard navigation and reduced motion support

## Tasks

### Phase 1: Foundation - Design Tokens & Aurora Borealis Palette

- [ ] 1. Set up design token system and Aurora Borealis color palette
  - [ ] 1.1 Create design token CSS file
    - Create `frontend/src/design-tokens.css` with all CSS custom properties
    - Define Aurora Borealis color palette (violet, indigo, teal, emerald, rose, amber scales)
    - Define semantic color mappings (safe, warning, danger, info, primary)
    - Define background system (app, surface, card, elevated)
    - Define text colors (primary, secondary, muted, inverse)
    - _Requirements: FR-1, Story 8, 8.1_
  
  - [ ] 1.2 Define animation tokens
    - Add duration tokens (instant: 100ms, fast: 200ms, normal: 300ms, slow: 500ms, slower: 700ms)
    - Add easing tokens (ease-in, ease-out, ease-in-out, spring)
    - Include reduced motion media query support
    - _Requirements: FR-2, 1.6, 8.1_
  
  - [ ] 1.3 Define spacing and layout tokens
    - Create spacing scale with 4px base unit (--space-1 through --space-20)
    - Define border radius scale (sm: 8px, md: 14px, lg: 20px, xl: 28px, full: 9999px)
    - Define elevation system with 4 shadow levels
    - Add glow shadow variants for interactive states
    - _Requirements: 8.7, FR-3_
  
  - [ ] 1.4 Define typography tokens
    - Set up font family variables (Inter for sans, JetBrains Mono for code)
    - Create typography scale (text-xs through text-4xl)
    - Define font weight scale (normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800)
    - _Requirements: 1.4, FR-4_
  
  - [ ] 1.5 Create gradient definitions
    - Define premium gradient backgrounds (gradient-aurora-primary, success, danger)
    - Create mesh gradient for hero background (gradient-mesh-aurora)
    - Add gradient utility classes for text effects
    - _Requirements: FR-1, Story 1_
  
  - [ ] 1.6 Import tokens in main entry point
    - Import `design-tokens.css` in `frontend/src/main.tsx` before other styles
    - Verify tokens are available globally using browser DevTools
    - _Requirements: 8.1_

- [ ]* 1.7 Write property test for typography hierarchy consistency
  - **Property 1: Typography Hierarchy Consistency**
  - **Validates: Requirements 1.4**
  - Test that all text elements have font-weight between 400-800
  - Use fast-check to generate combinations of elements and variants

- [ ]* 1.8 Write property test for spacing scale consistency
  - **Property 27: Spacing Scale Consistency**
  - **Validates: Requirements 8.7**
  - Test that all --space-* variables are multiples of 4px
  - Use fast-check to generate spacing multipliers

- [ ]* 1.9 Write property test for design token CSS variables
  - **Property 26: Design Token CSS Variables**
  - **Validates: Requirements 8.1**
  - Test that all design tokens are defined as CSS custom properties in :root
  - Verify token naming follows --category-name-variant convention

- [ ] 2. Checkpoint - Verify design tokens
  - Ensure all tokens are accessible in browser DevTools
  - Verify reduced motion media query works correctly
  - Ask the user if questions arise

### Phase 2: Animation System - Framer Motion Integration

- [ ] 3. Install and configure Framer Motion
  - [ ] 3.1 Install Framer Motion dependency
    - Run `npm install framer-motion` in frontend directory
    - Verify installation in package.json
    - _Requirements: FR-2_
  
  - [ ] 3.2 Create animation configuration module
    - Create `frontend/src/animation/motion-config.ts`
    - Export easing curves (easeIn, easeOut, easeInOut, spring)
    - Export duration constants matching CSS tokens
    - _Requirements: FR-2, 8.1_
  
  - [ ] 3.3 Create common animation variants
    - Implement fadeInUp, fadeIn, scaleIn, slideInLeft variants
    - Implement staggerContainer for sequential animations
    - Implement expandCard for height transitions
    - Implement drawPath for SVG path animations
    - Implement hoverScale and tapScale for interactions
    - Implement pageTransition variants (initial, animate, exit)
    - Implement skeletonPulse for loading states
    - _Requirements: FR-2, Story 2, Story 5_
  
  - [ ] 3.4 Create reduced motion utility
    - Implement `getAnimationConfig()` function that detects prefers-reduced-motion
    - Return instant/disabled animations when reduced motion is preferred
    - Export hook `useReducedMotion()` for components
    - _Requirements: 2.7, FR-7_
  
  - [ ] 3.5 Create animation error boundary
    - Implement AnimationErrorBoundary component
    - Detect Framer Motion failures and apply `.no-animations` class
    - Fall back to CSS transitions on error
    - _Requirements: Error Handling_

- [ ]* 3.6 Write property test for animation duration performance
  - **Property 3: Animation Duration Performance**
  - **Validates: Requirements 1.6**
  - Test that loading animations have duration ≤ 300ms
  - Use fast-check to generate animation configurations

- [ ]* 3.7 Write property test for interactive element states
  - **Property 4: Interactive Element States**
  - **Validates: Requirements 2.3, 2.7, 3.6, 8.5**
  - Test that all interactive elements show visible state changes on focus/hover
  - Verify scale transforms and/or box-shadow glows are applied

- [ ] 4. Checkpoint - Test animation system
  - Ensure Framer Motion loads without errors
  - Test reduced motion preference detection
  - Verify animation variants work correctly
  - Ask the user if questions arise

### Phase 3: Component Enhancement - Landing, Navigation, Location, Map

- [ ] 5. Enhance landing page with animations and new design
  - [ ] 5.1 Update landing page hero section
    - Update `frontend/src/components/LandingPage.tsx` to use motion components
    - Wrap hero section with motion.section using staggerContainer
    - Add gradient mesh background with subtle animation
    - Implement badge pill with pulse dot animation
    - Style headline with gradient text effect
    - Add motion to CTA button with hover/tap animations
    - _Requirements: Story 1, 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 5.2 Add floating card effect to radar preview
    - Wrap preview card with motion.div
    - Implement hover lift effect (translateY: -5px)
    - Add subtle float animation keyframe
    - _Requirements: Story 1, 1.3_
  
  - [ ] 5.3 Create CSS for landing page hero
    - Style `.landing-hero-section` with min-height: 100vh
    - Style gradient mesh background with animation
    - Create responsive layout with flexbox/grid
    - Apply typography scale to headline (clamp for fluid sizing)
    - Style CTA buttons with Aurora gradient and hover effects
    - _Requirements: Story 1, FR-4_

- [ ] 6. Enhance navigation header with sticky behavior and animations
  - [ ] 6.1 Update header component with scroll-based animations
    - Update `frontend/src/components/Header.tsx` to use Framer Motion
    - Use useScroll hook to track scroll position
    - Use useTransform to animate backdrop blur (0 to 16px)
    - Use useTransform to animate background opacity
    - _Requirements: Story 2, 2.1_
  
  - [ ] 6.2 Add navigation item animations
    - Wrap nav items with motion components
    - Apply staggered entrance animations (100ms delay)
    - Add hover scale effects to nav links
    - Implement active route indicator with layout animation
    - _Requirements: Story 2, 2.2, 2.3_
  
  - [ ] 6.3 Create mobile hamburger menu
    - Implement hamburger button with icon animation
    - Create slide-in menu drawer with motion.div
    - Add overlay with fade animation
    - _Requirements: Story 2, 2.5_
  
  - [ ] 6.4 Style header with glassmorphism
    - Apply sticky positioning with backdrop blur
    - Add border-bottom with subtle color
    - Style language toggle buttons with active state
    - _Requirements: Story 2, FR-3_

- [ ]* 6.5 Write property test for navigation item stagger
  - **Property 5: Navigation Item Stagger**
  - **Validates: Requirements 2.2**
  - Test that nav items have animation-delay in 100ms increments
  - Use fast-check to generate nav item arrays

- [ ]* 6.6 Write property test for glassmorphism card effects
  - **Property 2: Glassmorphism Card Effects**
  - **Validates: Requirements 1.5**
  - Test that all card elements have backdrop-filter blur and alpha transparency
  - Use fast-check to generate card class names

- [ ] 7. Enhance location picker with improved interactions
  - [ ] 7.1 Update location picker component
    - Update `frontend/src/components/LocationPicker.tsx` with motion wrappers
    - Add entrance animation (fadeInUp) to card
    - Implement input focus effects (whileFocus scale 1.02x)
    - Add glow effect on focus using CSS
    - _Requirements: Story 3, 3.6_
  
  - [ ] 7.2 Implement swap button animation
    - Wrap swap button with motion.button
    - Add rotate animation on hover (180 degrees)
    - Add tap scale animation (0.9x)
    - _Requirements: Story 3_
  
  - [ ] 7.3 Create autocomplete dropdown animations
    - Implement slide-down + fade-in for dropdown appearance
    - Add stagger animation for dropdown items
    - Style dropdown with glassmorphism effect
    - _Requirements: Story 3, 3.1_
  
  - [ ] 7.4 Add recent locations feature
    - Create RecentLocationsList utility class
    - Store last 5 unique locations in localStorage
    - Display recent locations with icons
    - _Requirements: Story 3, 3.5_
  
  - [ ] 7.5 Add validation error animations
    - Implement slide-in animation for error messages
    - Style errors with Aurora rose color
    - _Requirements: Story 3, 3.7_

- [ ]* 7.6 Write property test for autocomplete fuzzy search
  - **Property 6: Autocomplete Fuzzy Search**
  - **Validates: Requirements 3.1**
  - Test that search results include fuzzy matches (character subsequence)
  - Use fast-check to generate search query strings

- [ ]* 7.7 Write property test for recent locations tracking
  - **Property 7: Recent Locations Tracking**
  - **Validates: Requirements 3.5**
  - Test that recent list maintains last 5 unique locations in reverse chronological order
  - Use fast-check to generate location selection sequences

- [ ] 8. Enhance map visualization with route animations
  - [ ] 8.1 Create animated route component
    - Create `AnimatedRoute` component in map utilities
    - Use motion.path with pathLength animation
    - Animate from 0 to 1 over 1.5s with easeInOut
    - _Requirements: Story 4, 4.1_
  
  - [ ] 8.2 Create pulsing marker component
    - Create `PulsingMarker` component with motion.div
    - Implement infinite scale and opacity animation (2s loop)
    - Position markers absolutely on map
    - _Requirements: Story 4, 4.2_
  
  - [ ] 8.3 Add route hover tooltips
    - Implement tooltip component with fade-in animation
    - Show PM2.5 data on hover
    - Position tooltips using Framer Motion's layoutId
    - _Requirements: Story 4, 4.3_
  
  - [ ] 8.4 Implement collapsible legend
    - Add collapse/expand animation with height transition
    - Rotate chevron icon on toggle (180 degrees)
    - _Requirements: Story 4, 4.4_
  
  - [ ] 8.5 Apply route color classification
    - Update `frontend/src/map/routeUtils.ts` with color mapping
    - Map AVOIDABLE → emerald, UNAVOIDABLE → amber, LOW → teal
    - Create gradient strokes for dangerous routes
    - _Requirements: Story 4, 4.7_
  
  - [ ] 8.6 Update MapView component styles
    - Update `frontend/src/components/MapView.tsx` with new colors
    - Apply glassmorphism to map controls
    - Style legend with Aurora colors
    - _Requirements: Story 4, FR-3_

- [ ]* 8.7 Write property test for SVG route path animation
  - **Property 8: SVG Route Path Animation**
  - **Validates: Requirements 4.1**
  - Test that route paths have stroke-dasharray and stroke-dashoffset animations
  - Verify animation from hidden to fully visible state

- [ ]* 8.8 Write property test for station marker pulse animation
  - **Property 9: Station Marker Pulse Animation**
  - **Validates: Requirements 4.2**
  - Test that markers have infinite animation with scale/opacity changes
  - Verify continuous pulsing effect

- [ ]* 8.9 Write property test for route hover tooltips
  - **Property 10: Route Hover Tooltips**
  - **Validates: Requirements 4.3**
  - Test that hovering route segments renders tooltips with PM2.5 data
  - Verify fade-in animation on tooltip appearance

- [ ]* 8.10 Write property test for route color classification
  - **Property 11: Route Color Classification**
  - **Validates: Requirements 4.7**
  - Test that route colors correctly map to safety classifications
  - Use fast-check to generate classification and PM2.5 combinations

- [ ] 9. Checkpoint - Test enhanced components
  - Ensure landing page animations work smoothly
  - Verify navigation sticky behavior and animations
  - Test location picker interactions
  - Test map route animations and colors
  - Ask the user if questions arise

### Phase 4: Advanced Features - Decision Cards, Route Comparison, Transparency

- [ ] 10. Enhance decision cards with state-based animations
  - [ ] 10.1 Update decision card component
    - Update `frontend/src/components/DecisionCard.tsx` with motion wrapper
    - Add card entrance animation (fadeInUp with 200ms delay)
    - Apply classification-specific colors from Aurora palette
    - _Requirements: Story 5, 5.1_
  
  - [ ] 10.2 Add metrics grid with stagger animation
    - Wrap metrics grid with staggerContainer
    - Animate each metric with fadeInUp variant
    - Implement AnimatedNumber component with count-up effect
    - _Requirements: Story 5_
  
  - [ ] 10.3 Implement progress bars with gradient fills
    - Create progress bar component with linear gradient
    - Animate width from 0 to value with easing
    - Use Aurora gradient for exposure visualization
    - _Requirements: Story 5, 5.2_
  
  - [ ] 10.4 Add circular progress indicators
    - Create SVG circular progress component
    - Calculate stroke-dashoffset: circumference * (1 - percentage)
    - Animate stroke-dashoffset with spring easing
    - _Requirements: Story 5, 5.4_
  
  - [ ] 10.5 Add confetti animation for safer route selection
    - Install react-confetti: `npm install react-confetti`
    - Trigger confetti on "Take Safer Route" button click
    - Use Aurora green colors (emerald, teal)
    - Auto-dismiss after 3 seconds
    - _Requirements: Story 5, 5.5_
  
  - [ ] 10.6 Style decision cards with glassmorphism
    - Apply backdrop blur and alpha transparency
    - Add classification-specific border glow on hover
    - Style buttons with hover scale and glow effects
    - _Requirements: Story 5, FR-3_

- [ ]* 10.7 Write property test for expandable section timing
  - **Property 12: Expandable Section Timing**
  - **Validates: Requirements 5.1**
  - Test that expandable sections have 300ms transition with ease-out
  - Use fast-check to generate expand/collapse states

- [ ]* 10.8 Write property test for progress bar gradients
  - **Property 13: Progress Bar Gradients**
  - **Validates: Requirements 5.2**
  - Test that progress bars have gradient backgrounds
  - Verify width/dashoffset corresponds to percentage value

- [ ]* 10.9 Write property test for Framer Motion icon animations
  - **Property 14: Framer Motion Icon Animations**
  - **Validates: Requirements 5.3**
  - Test that animated icons are wrapped in motion components
  - Verify animate, initial, or whileHover props are defined

- [ ]* 10.10 Write property test for circular progress indicators
  - **Property 15: Circular Progress Indicators**
  - **Validates: Requirements 5.4**
  - Test stroke-dashoffset calculation: circumference * (1 - percentage)
  - Use fast-check to generate percentage values

- [ ] 11. Enhance route comparison with sortable cards and charts
  - [ ] 11.1 Update route comparison component
    - Update `frontend/src/components/RouteComparison.tsx` with Reorder component
    - Implement sortable list with Reorder.Group and Reorder.Item
    - Add layout animation for smooth reordering
    - _Requirements: Story 6, 6.1_
  
  - [ ] 11.2 Add hover preview effect
    - Implement whileHover scale (1.02x) on route cards
    - Add border glow on hover (Aurora teal)
    - Show mini map preview on hover
    - _Requirements: Story 6, 6.7_
  
  - [ ] 11.3 Implement expand/collapse for route details
    - Add collapsible section with height animation
    - Rotate chevron icon on toggle
    - Stagger animation for detail items
    - _Requirements: Story 6, 6.2_
  
  - [ ] 11.4 Add sparkline charts
    - Install Recharts: `npm install recharts`
    - Create SparklineChart component with Recharts
    - Display exposure over time for each route
    - Style with Aurora colors
    - _Requirements: Story 6, 5.7, 6.3_
  
  - [ ] 11.5 Create badge components with icons
    - Implement Badge component with icon mapping
    - Shield icon for safety, clock icon for time, leaf icon for environment
    - Style with Aurora semantic colors
    - _Requirements: Story 6, 6.4_
  
  - [ ] 11.6 Add skeleton loading states
    - Create Skeleton component with pulse animation
    - Apply to route cards during async data load
    - Use CSS animation with infinite loop
    - _Requirements: Story 6, 6.6, 8.6_

- [ ]* 11.7 Write property test for sort transition timing
  - **Property 16: Sort Transition Timing**
  - **Validates: Requirements 6.1**
  - Test that sort order changes have 200ms transition
  - Use fast-check to generate sort operations

- [ ]* 11.8 Write property test for route card expansion
  - **Property 17: Route Card Expansion**
  - **Validates: Requirements 6.2**
  - Test that toggling expand state animates height with slide animation
  - Verify smooth height transition from 0/auto

- [ ]* 11.9 Write property test for route card sparklines
  - **Property 18: Route Card Sparklines**
  - **Validates: Requirements 5.7, 6.3**
  - Test that route cards contain sparkline chart elements
  - Verify SVG path or Recharts component is present

- [ ]* 11.10 Write property test for badge icon mapping
  - **Property 19: Badge Icon Mapping**
  - **Validates: Requirements 6.4**
  - Test that badges have correct icon based on type
  - Shield for safety, clock for time, leaf for environment

- [ ]* 11.11 Write property test for async component skeletons
  - **Property 20: Async Component Skeletons**
  - **Validates: Requirements 6.6, 8.6**
  - Test that loading state renders skeleton elements with pulse
  - Verify grey background and pulse animation

- [ ] 12. Enhance transparency panel with tabs and formulas
  - [ ] 12.1 Update transparency panel component
    - Update `frontend/src/components/TransparencyPanel.tsx` with motion wrapper
    - Implement drawer open/close with height animation
    - Use AnimatePresence for smooth transitions
    - _Requirements: Story 7_
  
  - [ ] 12.2 Implement tab navigation with animations
    - Create tab buttons with motion components
    - Add layoutId for smooth indicator slide animation
    - Implement tab content switching with fade out/in
    - _Requirements: Story 7, 7.2_
  
  - [ ] 12.3 Add code syntax highlighting
    - Install syntax highlighting library or create custom implementation
    - Apply token-based CSS classes (.keyword, .string, .token)
    - Use JetBrains Mono font for code blocks
    - _Requirements: Story 7, 7.1_
  
  - [ ] 12.4 Implement copy-to-clipboard functionality
    - Add copy button to code snippets
    - Use navigator.clipboard.writeText() API
    - Show success toast with fade animation
    - _Requirements: Story 7, 7.3_
  
  - [ ] 12.5 Add mathematical formula rendering
    - Install KaTeX: `npm install katex`
    - Create FormulaRenderer component wrapping KaTeX
    - Lazy load KaTeX for performance
    - Style formulas with Aurora colors
    - _Requirements: Story 7, 7.4_
  
  - [ ] 12.6 Implement collapsible sections
    - Add collapse/expand with height transition (300ms)
    - Rotate chevron icon on toggle (180 degrees)
    - Persist expand state in localStorage
    - _Requirements: Story 7, 7.5_
  
  - [ ] 12.7 Style transparency panel
    - Apply glassmorphism to panel background
    - Style tabs with Aurora accent colors
    - Add hover effects to citation links
    - _Requirements: Story 7, 7.7, FR-3_

- [ ]* 12.8 Write property test for code block syntax highlighting
  - **Property 21: Code Block Syntax Highlighting**
  - **Validates: Requirements 7.1**
  - Test that code blocks have syntax highlighting CSS classes
  - Verify .token, .keyword, .string classes are applied

- [ ]* 12.9 Write property test for copy-to-clipboard functionality
  - **Property 22: Copy-to-Clipboard Functionality**
  - **Validates: Requirements 7.3**
  - Test that copy button successfully copies code text
  - Verify navigator.clipboard.writeText is called

- [ ]* 12.10 Write property test for math formula rendering
  - **Property 23: Math Formula Rendering**
  - **Validates: Requirements 7.4**
  - Test that LaTeX formulas produce KaTeX DOM elements
  - Verify .katex and .katex-html classes are present

- [ ]* 12.11 Write property test for collapsible chevron rotation
  - **Property 24: Collapsible Chevron Rotation**
  - **Validates: Requirements 7.5**
  - Test that chevron rotates 180 degrees on toggle
  - Verify CSS transform: rotate() is applied

- [ ]* 12.12 Write property test for citation link hover
  - **Property 25: Citation Link Hover**
  - **Validates: Requirements 7.7**
  - Test that hovering citation links applies underline
  - Verify text-decoration or border-bottom property

- [ ] 13. Checkpoint - Test advanced features
  - Ensure decision cards animate correctly
  - Test confetti effect on safer route selection
  - Verify route comparison sorting and expansion
  - Test transparency panel tabs and formula rendering
  - Ask the user if questions arise

### Phase 5: Accessibility - Keyboard Navigation & WCAG Compliance

- [ ] 14. Implement comprehensive keyboard navigation
  - [ ] 14.1 Add focus indicators to all interactive elements
    - Update global CSS for :focus-visible with 2px outline
    - Use Aurora violet for focus ring color
    - Add 2px offset for better visibility
    - _Requirements: Story 2, 2.7, FR-7_
  
  - [ ] 14.2 Implement skip-to-content link
    - Create SkipLink component that appears on Tab focus
    - Position absolutely at top of page
    - Link to main content area with ID
    - _Requirements: FR-7_
  
  - [ ] 14.3 Add keyboard shortcuts for common actions
    - Implement useKeyboard hook for global shortcuts
    - Add Tab/Shift+Tab for navigation
    - Add Enter/Space for button activation
    - Add Escape for modal/drawer close
    - _Requirements: Story 2, 2.7_
  
  - [ ] 14.4 Implement focus trap for modals and drawers
    - Create useFocusTrap hook
    - Trap focus within modal when open
    - Return focus to trigger element on close
    - _Requirements: FR-7_
  
  - [ ] 14.5 Add ARIA labels and roles
    - Add aria-label to all icon-only buttons
    - Use semantic HTML elements (nav, main, article)
    - Add role="button" where needed
    - Add aria-expanded for collapsible sections
    - Add aria-describedby for form inputs
    - _Requirements: FR-7_
  
  - [ ] 14.6 Test tab order and logical flow
    - Verify tab order follows visual layout
    - Ensure no focus traps in normal flow
    - Test with keyboard only (no mouse)
    - _Requirements: FR-7_

- [ ] 15. Ensure WCAG AAA compliance
  - [ ] 15.1 Audit color contrast ratios
    - Test all text colors against backgrounds
    - Ensure 7:1 ratio for normal text, 4.5:1 for large text
    - Use browser DevTools or dedicated contrast checker
    - Adjust Aurora colors if needed for compliance
    - _Requirements: FR-1, NFR Accessibility_
  
  - [ ] 15.2 Add alternative text for images and icons
    - Add alt text to all images
    - Use aria-hidden="true" for decorative icons
    - Add screen reader text for meaningful icons
    - _Requirements: FR-7_
  
  - [ ] 15.3 Ensure animations respect reduced motion
    - Verify @media (prefers-reduced-motion: reduce) works
    - Test with browser reduced motion setting enabled
    - Ensure critical content is still accessible without animations
    - _Requirements: 2.7, FR-7_
  
  - [ ] 15.4 Test with screen readers
    - Test with NVDA (Windows) or VoiceOver (Mac)
    - Verify all interactive elements are announced
    - Ensure logical reading order
    - _Requirements: FR-7_
  
  - [ ] 15.5 Run automated accessibility audit
    - Run Lighthouse accessibility audit
    - Achieve 100/100 score
    - Fix any remaining violations
    - _Requirements: NFR Accessibility_

- [ ] 16. Checkpoint - Validate accessibility
  - Test keyboard navigation through all components
  - Verify WCAG AAA compliance with automated tools
  - Test with screen reader
  - Test reduced motion preference
  - Ask the user if questions arise

### Phase 6: Testing & Performance Optimization

- [ ] 17. Set up testing infrastructure
  - [ ] 17.1 Configure Vitest for component testing
    - Install testing dependencies: `npm install -D vitest @testing-library/react @testing-library/user-event jsdom`
    - Create `vitest.config.ts` with jsdom environment
    - Update package.json scripts for test commands
    - _Requirements: Testing Strategy_
  
  - [ ] 17.2 Configure fast-check for property-based testing
    - Install fast-check: `npm install -D fast-check`
    - Create property test configuration with 100 iterations
    - Set up seed for reproducibility
    - _Requirements: Testing Strategy_
  
  - [ ] 17.3 Configure jest-axe for accessibility testing
    - Install jest-axe: `npm install -D jest-axe`
    - Extend expect with toHaveNoViolations
    - Create accessibility test helpers
    - _Requirements: Testing Strategy_
  
  - [ ] 17.4 Set up test file structure
    - Create directories: `__tests__/unit`, `__tests__/properties`, `__tests__/integration`, `__tests__/accessibility`
    - Create test utilities and helpers
    - _Requirements: Testing Strategy_

- [ ] 18. Write unit tests for components
  - [ ] 18.1 Write unit tests for Button component
    - Test primary, secondary, and disabled variants
    - Test hover and focus states
    - Test accessibility (aria-label, role)
    - _Requirements: Story 8_
  
  - [ ] 18.2 Write unit tests for LocationPicker
    - Test input focus effects
    - Test swap button interaction
    - Test validation error display
    - _Requirements: Story 3_
  
  - [ ] 18.3 Write unit tests for DecisionCard
    - Test classification-specific styling
    - Test metric display
    - Test button interactions
    - _Requirements: Story 5_
  
  - [ ] 18.4 Write unit tests for RouteComparison
    - Test card rendering
    - Test sort functionality
    - Test expand/collapse behavior
    - _Requirements: Story 6_
  
  - [ ] 18.5 Write unit tests for TransparencyPanel
    - Test tab switching
    - Test code syntax highlighting
    - Test copy-to-clipboard functionality
    - Test formula rendering
    - _Requirements: Story 7_
  
  - [ ] 18.6 Write unit tests for Header
    - Test scroll-based backdrop blur
    - Test navigation item rendering
    - Test language toggle
    - _Requirements: Story 2_

- [ ] 19. Write integration tests
  - [ ] 19.1 Write landing page animation sequence test
    - Test hero elements animate in with correct stagger timing
    - Verify all animations complete
    - Test scroll-triggered animations
    - _Requirements: Story 1_
  
  - [ ] 19.2 Write route selection flow test
    - Test complete flow from location selection to route decision
    - Verify data flows correctly through components
    - Test state management
    - _Requirements: Story 3, Story 4, Story 5_
  
  - [ ] 19.3 Write navigation flow test
    - Test navigation between sections
    - Verify page transitions work correctly
    - Test mobile menu behavior
    - _Requirements: Story 2_

- [ ] 20. Write accessibility tests
  - [ ] 20.1 Test keyboard navigation for all components
    - Verify tab order is logical
    - Test Enter/Space activation
    - Test Escape for dismissal
    - _Requirements: FR-7_
  
  - [ ] 20.2 Run axe accessibility audits
    - Test DecisionCard has no violations
    - Test LocationPicker has no violations
    - Test TransparencyPanel has no violations
    - Test Header has no violations
    - _Requirements: FR-7_
  
  - [ ] 20.3 Test accessible names for interactive elements
    - Verify all buttons have accessible names
    - Verify all inputs have labels
    - Verify all links have descriptive text
    - _Requirements: FR-7_

- [ ] 21. Optimize performance
  - [ ] 21.1 Lazy load heavy libraries
    - Lazy load KaTeX for formula rendering
    - Lazy load Recharts for sparklines
    - Use React.lazy() and Suspense
    - _Requirements: NFR Performance_
  
  - [ ] 21.2 Optimize animation performance
    - Verify all animations use transform and opacity (hardware-accelerated)
    - Check for layout thrashing in DevTools
    - Optimize re-renders with React.memo where appropriate
    - _Requirements: FR-8_
  
  - [ ] 21.3 Measure and validate web vitals
    - Install web-vitals: `npm install web-vitals`
    - Measure FCP, LCP, CLS in production build
    - Ensure FCP < 1.5s, LCP < 2.5s, CLS < 0.1
    - _Requirements: NFR Performance_
  
  - [ ] 21.4 Monitor bundle size
    - Run build and check bundle sizes
    - Ensure design system additions < 50KB gzipped
    - Use vite-plugin-visualizer to analyze bundle
    - _Requirements: NFR Performance_
  
  - [ ] 21.5 Test animation frame rates
    - Implement frame rate monitoring
    - Verify 60fps during animations
    - Test on lower-end devices if possible
    - _Requirements: FR-8_

- [ ] 22. Create design system documentation
  - [ ] 22.1 Document design tokens
    - Create documentation for all CSS custom properties
    - Include usage examples for each token category
    - Document semantic color mappings
    - _Requirements: Story 8_
  
  - [ ] 22.2 Document animation patterns
    - Document all Framer Motion variants
    - Include code examples for common patterns
    - Document reduced motion support
    - _Requirements: FR-2_
  
  - [ ] 22.3 Document component patterns
    - Document button variants and usage
    - Document input patterns and validation
    - Document card patterns and layouts
    - _Requirements: Story 8_
  
  - [ ] 22.4 Create design system README
    - Create `frontend/src/DESIGN_SYSTEM.md`
    - Include overview of Aurora Borealis palette
    - Document animation system architecture
    - Include accessibility guidelines
    - _Requirements: Story 8_

- [ ] 23. Final checkpoint - Production readiness
  - Ensure all tests pass (unit, property, integration, accessibility)
  - Verify Lighthouse scores: Accessibility 100/100, Performance 95+/100
  - Test on multiple browsers (Chrome, Firefox, Safari)
  - Test on mobile devices
  - Verify bundle size is within limits
  - Review documentation completeness
  - Ask the user if questions arise before deployment

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements and user stories for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Implementation follows a phased approach: foundation → animations → components → features → accessibility → testing
- All new libraries (Framer Motion, Recharts, KaTeX, fast-check) should be added incrementally
- Existing components should be enhanced rather than rewritten completely
- Design tokens provide a consistent foundation for all visual changes
- Accessibility and performance are integrated throughout, not afterthoughts
