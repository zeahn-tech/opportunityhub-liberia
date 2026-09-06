import React, { ErrorInfo, ReactNode } from 'react';
import { logger } from '../logging/logger';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    logger.error('ErrorBoundary', error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-[#F9F8F6]">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8E4D9] shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FCF0E8] text-[#BC6C25] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-serif font-bold text-[#132A13] mb-2">
              {this.props.fallbackTitle || 'Something interrupted this view'}
            </h2>

            <p className="text-sm text-[#606C38] mb-6">
              {this.props.fallbackMessage ||
                'A component encountered an unexpected state. Your data is safe. Please refresh or return home.'}
            </p>

            {this.state.error && import.meta.env?.DEV && (
              <div className="mb-6 p-3 bg-[#F9F8F6] rounded-xl text-left border border-[#E8E4D9] overflow-x-auto text-xs text-[#283618] font-mono">
                <div className="font-bold text-[#BC6C25]">
                  {this.state.error.name}: {this.state.error.message}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload View
              </button>
              <a
                href="#/"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F9F8F6] hover:bg-[#E8E4D9] text-[#283618] rounded-xl font-medium text-xs border border-[#E8E4D9] transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
