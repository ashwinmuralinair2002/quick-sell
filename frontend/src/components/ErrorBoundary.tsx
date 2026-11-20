import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error | null; resetError: () => void }) => ReactNode);
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture error details for logging or diagnostic purposes
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    this.handleReset();
    window.location.href = '/';
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback was supplied, render it
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback({
            error: this.state.error,
            resetError: this.handleReset
          });
        }
        return this.props.fallback;
      }

      // Default QuickSell user-friendly fallback UI
      return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center p-3 bg-light">
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white text-center" style={{ maxWidth: '520px', width: '100%' }}>
            {/* Visual Icon */}
            <div
              className="rounded-circle bg-danger bg-opacity-10 text-danger d-inline-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
            >
              ⚠️
            </div>

            {/* Error Message */}
            <h2 className="fw-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-muted small mb-4" style={{ lineHeight: '1.6' }}>
              An unexpected application error occurred while rendering this page. You can try refreshing the page or returning to the homepage.
            </p>

            {/* Action Buttons */}
            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary-custom px-4 py-2 fw-semibold"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-outline-secondary px-4 py-2 fw-semibold"
              >
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
