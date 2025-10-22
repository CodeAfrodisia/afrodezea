// src/components/profile/PlaceholderCard.jsx
import React from "react";

export default function PlaceholderCard({ title = "Widget", children, style }) {
  return (
    <div
      className="surface"
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid var(--hairline)",
        background: "rgba(255,255,255,.03)",
        ...style,
      }}
    >
      {title && <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>}
      {children}
    </div>
  );
}
