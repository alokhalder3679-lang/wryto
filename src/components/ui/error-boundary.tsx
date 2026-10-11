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
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[SafeErrorBoundary:${this.props.name || "default"}] caught error:`, error, errorInfo);
    reportLovableError(error, {
      boundary: this.props.name || "SafeErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
  }

  public reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function" && this.state.error) {
        return this.props.fallback(this.state.error, this.reset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Something unexpected happened</h2>
            <p className="text-sm text-muted-foreground">
              We encountered an issue loading this section. You can refresh or return to the main feed.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.reset}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </button>
              <a
                href="/feed"
                className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                Explore Feed
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
