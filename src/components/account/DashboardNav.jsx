import React from "react";

export default function DashboardNav({ sections = [], onToggleView, view }) {
  return (
    <nav
      aria-label="Account sections"
      style={{
        position: "sticky", top: 0, zIndex: 8,
        backdropFilter: "saturate(140%) blur(6px)",
        background: "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.12))",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        display: "flex", gap: 8, padding: "10px 16px", alignItems: "center", flexWrap: "wrap"
      }}>
        {sections.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="pill"
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid var(--hairline)",
              background: "rgba(255,255,255,.04)",
              textDecoration: "none",
              color: "var(--text)",
              fontWeight: 600,
            }}
          >
            {s.label}
          </a>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={onToggleView}
          className="btn btn--ghost"
          aria-pressed={view === "cards"}
          title="Toggle cards / tabs"
        >
          {view === "cards" ? "Tabs view" : "Cards view"}
        </button>
      </div>
    </nav>
  );
}

