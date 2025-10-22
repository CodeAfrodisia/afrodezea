// src/components/profile/_TodayWidget.jsx
import React from "react";
import { Link } from "react-router-dom";
export default function _TodayWidget() {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Today</div>
      <p style={{ opacity: .85, marginTop: 0 }}>Quick access to your daily check-in.</p>
      <Link to="/account/check-in" className="btn btn--ghost">Open Today</Link>
    </div>
  );
}