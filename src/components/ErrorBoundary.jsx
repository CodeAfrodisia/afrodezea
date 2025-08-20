import React from "react";

/**
 * Props:
 * - fallback?: ReactNode | (helpers) => ReactNode
 *   helpers = { reset }
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  reset() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback({ reset: this.reset });
      }
      if (fallback) return fallback;

      // Default fallback
      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong.</h2>
          <button className="btn btn--gold" onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
