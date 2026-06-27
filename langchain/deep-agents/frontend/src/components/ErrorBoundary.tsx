import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-950 p-6">
          <div className="max-w-lg rounded-2xl border border-rose-500/30 bg-surface-900 p-6">
            <h2 className="text-lg font-semibold text-rose-300">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              The UI hit an unexpected error. Refresh the page and try again.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-rose-200">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
