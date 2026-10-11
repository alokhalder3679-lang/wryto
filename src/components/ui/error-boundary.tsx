import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[SafeErrorBoundary:${this.props.name || "default"}] caught error:`, error, errorInfo);
    reportLovableError(error, {
      boundary: this.props.name || "SafeErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
  }

  public reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function" && this.state.error) {
        return this.props.fallback(this.state.error, this.reset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return null;
    }
    return this.props.children;
  }
}
