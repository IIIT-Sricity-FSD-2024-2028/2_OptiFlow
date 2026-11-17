import React from 'react';

// WHY: If a React component crashes (e.g., trying to read data that doesn't exist),
// it will unmount the entire React tree (white screen of death). ErrorBoundary catches these
// errors and displays a fallback UI instead of crashing the whole app.
//
// Used around each layout's <Outlet />, so a crashing page leaves the sidebar and top bar working.
// Pass `resetKey` (the layouts pass the current path): when it changes the boundary clears the
// error, so moving to another page does not keep showing the failure.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You could log the error to an error reporting service here
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="max-w-xl mx-auto mt-12 p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
        <h2 className="text-lg font-semibold">Something went wrong on this page.</h2>
        <p className="mt-1 text-sm">
          The rest of the app still works. You can try again, reload, or open another page from the menu.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg border border-red-300 text-sm font-medium hover:bg-red-100 cursor-pointer"
          >
            Reload page
          </button>
        </div>
        <details className="mt-4 text-xs whitespace-pre-wrap">
          <summary className="cursor-pointer">Technical details</summary>
          {this.state.error && this.state.error.toString()}
        </details>
      </div>
    );
  }
}
