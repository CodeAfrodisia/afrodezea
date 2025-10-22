// src/components/account/TodayCheckInInline.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@lib/useTheme.jsx";

export default function TodayCheckInInline() {
  const theme = useTheme();
  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Today</h3>
        <Link to="/account/check-in" className="btn btn--gold">Open Today</Link>
      </div>
      <div style={{ opacity: .85 }}>
        Ready to check in for today? Log mood, notes, and reflections.
      </div>
    </div>
  );
}

