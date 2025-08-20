import React from "react";
import { useLocation, Link } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary.jsx";

export default function PageBoundary({ children, name = "Page" }) {
  const location = useLocation();

  const Fallback = ({ reset }) => (
    <div className="container" style={{ padding: 24 }}>
      <h2>{name} had a hiccup.</h2>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn btn--gold" onClick={reset}>Try again</button>
        <Link className="btn" to="/">Go Home</Link>
      </div>
    </div>
  );

  // key by navigation key so boundary resets when user changes route
  return (
    <ErrorBoundary key={location.key} fallback={Fallback}>
      {children}
    </ErrorBoundary>
  );
}

