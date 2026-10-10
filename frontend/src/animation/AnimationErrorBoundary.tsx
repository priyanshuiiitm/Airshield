import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary specifically for catching Framer Motion errors.
 * If animations fail, it applies a 'no-animations' class to fallback to CSS transitions.
 */
export class AnimationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Animation Error caught by boundary:", error, errorInfo);
    
    // Add fallback class to document body to disable complex JS animations
    // and rely on CSS transitions if possible
    document.body.classList.add('no-animations');
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback just renders children without animation wrappers if possible,
      // but since we can't easily strip them, we rely on the CSS class 'no-animations'
      // injected into the body. We still render the children and hope they recover,
      // or we just render a safe fallback div.
      return <div className="animation-error-recovery">{this.props.children}</div>;
    }

    return this.props.children;
  }
}
