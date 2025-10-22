// src/components/account/FullscreenDashboard.jsx
import React from "react";

export default function FullscreenDashboard({
  hero,
  tabs,
  activeTab,
  onChangeTab,
  panes,      // { [key]: ReactNode }
  heightOffset = 0, // if you have a fixed header elsewhere, pass its px height here
}) {
  // Outer takes full viewport (minus any global header gap)
  return (
    <div
      style={{
        height: `calc(100vh - ${heightOffset}px)`,
        maxHeight: `calc(100vh - ${heightOffset}px)`,
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: 12,
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* HERO (never grows) */}
      <div style={{ minHeight: 56 }}>{hero}</div>

      {/* TABS */}
      <nav
        role="tablist"
        aria-label="Dashboard sections"
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          border: "1px solid var(--hairline)",
          borderRadius: 999,
          padding: 6,
          background: "rgba(255,255,255,.03)",
        }}
      >
        {tabs.map((t) => {
          const selected = t.key === activeTab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              onClick={() => onChangeTab(t.key)}
              className="btn btn--ghost"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontWeight: 600,
                opacity: selected ? 1 : 0.8,
                border: selected ? "1px solid var(--hairline)" : "1px solid transparent",
                background: selected ? "rgba(255,255,255,.06)" : "transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* CONTENT PANE (fixed; only this area can scroll if needed) */}
      <section
        role="tabpanel"
        aria-labelledby={activeTab}
        style={{
          border: "1px solid var(--hairline)",
          borderRadius: 16,
          background: "rgba(255,255,255,.03)",
          overflow: "hidden",        // contain inner scroll
          display: "grid",
        }}
      >
        <div
          style={{
            overflow: "auto",
            padding: 16,
          }}
        >
          {panes[activeTab] ?? null}
        </div>
      </section>
    </div>
  );
}

