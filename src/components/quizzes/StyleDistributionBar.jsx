// src/components/quizzes/StyleDistributionBar.jsx
import React from "react";

/**
 * Generic style distribution bar.
 *
 * Props:
 *  rows: Array<{ key: string; label: string; score: number; percent: number; rank: number }>
 *  palette?: Record<string, string>                 // optional color overrides by key
 *  hideZeros?: boolean                              // default true
 *  ariaLabel?: string                               // for a11y
 */
export default function StyleDistributionBar({
  rows,
  palette = {},
  hideZeros = true,
  ariaLabel = "Style distribution",
}) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const shown = (hideZeros ? rows.filter(r => (r?.percent ?? 0) > 0) : rows).slice();
  const winnerKey = rows.find(r => r.rank === 1)?.key ?? rows[0]?.key;

  // deterministic palette per key (fallback when no explicit color provided)
  const base = [
    "#9b8cff", "#f59f00", "#ef476f", "#118ab2", "#06d6a0", "#ffd166",
    "#8b8b8b", "#a855f7", "#22c55e", "#e11d48"
  ];
  const colorFor = (k) => {
    if (palette[k]) return palette[k];
    // simple stable hash → index
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    return base[h % base.length];
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {/* Bar */}
      <div
        role="img"
        aria-label={ariaLabel}
        style={{
          display: "flex",
          width: "100%",
          height: 14,
          borderRadius: 999,
          overflow: "hidden",
          outline: "1px solid var(--hairline, rgba(255,255,255,0.12))",
          background: "rgba(127,127,127,0.12)",
        }}
        title={`Top: ${labelOf(rows, winnerKey)}${
          rows[1] ? ` • Runner-up: ${rows[1].label}` : ""
        }`}
      >
        {shown.length === 0 ? (
          <div style={{ flex: 1, background: "rgba(128,128,128,.2)" }} />
        ) : (
          shown.map((r) => (
            <div
              key={r.key}
              title={`${r.label}: ${r.percent}% (${r.score})`}
              style={{
                width: `${clamp0to100(r.percent)}%`,
                background: colorFor(r.key),
                outline: r.key === winnerKey ? "1px solid rgba(255,255,255,.7)" : "none",
                boxShadow: r.key === winnerKey ? "inset 0 0 0 9999px rgba(255,255,255,0.06)" : "none",
              }}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
          fontSize: 12,
          opacity: 0.9,
        }}
      >
        {rows.map((r) => (
          <div key={`legend-${r.key}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: colorFor(r.key),
                outline: r.key === winnerKey ? "1px solid rgba(255,255,255,.7)" : "none",
              }}
            />
            <span style={{ whiteSpace: "nowrap" }}>
              {r.label}: <strong>{Math.round(r.percent)}%</strong>{" "}
              <span style={{ opacity: 0.8 }}>({r.score})</span>
              {r.key === winnerKey ? <span style={{ marginLeft: 4, opacity: 0.8 }}>• top</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function clamp0to100(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
function labelOf(rows, key) {
  const found = rows.find(r => r.key === key);
  return found?.label ?? key ?? "—";
}

