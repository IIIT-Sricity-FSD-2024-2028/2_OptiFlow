import React from 'react';

// WHY: If a React component crashes (e.g., trying to read data that doesn't exist), 
// it will unmount the entire React tree (white screen of death). ErrorBoundary catches these 
// errors and displays a fallback UI instead of crashing the whole app.
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
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // TODO: Style the fallback UI using Tailwind to look like a proper error page.
      return (
        <div className="p-4 border border-red-500 bg-red-50 text-red-700">
          <h2>Something went wrong.</h2>
          <details className="whitespace-pre-wrap">
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
