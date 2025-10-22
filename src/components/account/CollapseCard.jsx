// src/components/account/CollapseCard.jsx
import React, { useState } from "react";

export default function CollapseCard({ title, defaultOpen = true, children, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="surface" style={{ borderRadius: 16, marginBottom: 12 }}>
      <header
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ opacity: .6, fontSize: 12 }}>{open ? "Hide" : "Show"}</div>
        </div>
        {right ?? null}
      </header>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
}

