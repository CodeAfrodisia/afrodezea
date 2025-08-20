// src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="container" style={{ padding: 24 }}>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link className="btn btn--gold" to="/">Go home</Link>
    </div>
  );
}

