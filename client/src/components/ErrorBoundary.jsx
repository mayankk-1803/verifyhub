import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="p-8 text-center border border-red-500/20 bg-red-500/5 rounded-[24px] flex flex-col items-center gap-4 text-left font-sans">
            <span className="text-red-400 font-bold font-display">Something went wrong loading this panel.</span>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">This may be caused by a temporary network or runtime error. Please retry.</p>
            <button
              className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold transition-colors shadow-sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onRetry) {
                  this.props.onRetry();
                } else {
                  window.location.reload();
                }
              }}
            >
              Retry Panel
            </button>
          </div>
        );
      }
      return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="bg-white border border-slate-200 shadow-xl rounded-[24px] p-8 max-w-md w-full flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-pulse text-3xl">
              ⚠️
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-slate-900 font-display">Something went wrong</h2>
              <p className="text-xs text-slate-655 leading-relaxed">
                An unexpected error occurred while loading this page. Please refresh the page or contact support if the issue persists.
              </p>
            </div>
            {this.state.error && (
              <pre className="w-full text-left bg-slate-50 border border-slate-200 rounded-lg p-4 text-[10px] text-red-600 overflow-auto font-mono max-h-40">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors duration-200"
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

