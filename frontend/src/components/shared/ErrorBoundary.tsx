import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 border border-red-200 rounded-[2rem] space-y-4 max-w-lg mx-auto my-12 shadow-lift animate-fade-in-up">
          <span className="text-5xl block">🛠️</span>
          <h2 className="text-2xl font-display font-bold text-red-700">Something went wrong</h2>
          <p className="text-gray-600 font-medium">The application encountered an unexpected error. Please refresh or try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all cursor-pointer active:scale-95"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
