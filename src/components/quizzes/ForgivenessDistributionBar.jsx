// src/components/quizzes/ForgivenessDistributionBar.jsx
import React from "react";

/**
 * Props:
 *   data: {
 *     keys: string[];
 *     percentages: Record<string, number>; // 0..100 (integers okay)
 *     counts: Record<string, number>;
 *     order: string[];   // keys sorted by counts desc
 *     winner: string|null;
 *     runnerUp: string|null;
 *     confidence: number; // 0..1
 *     capPerStyle: number; // optional, if present we'll show it in title
 *   }
 *   labels?: Record<string, string>; // optional pretty labels
 */
export default function ForgivenessDistributionBar({
  data,
  labels = {
    accountability: "Accountability",
    repair: "Repair / Amends",
    gift: "Gesture / Gift",
    time: "Time / Consistency",
    words: "Words",
    change: "Changed Behavior",
  },
}) {
  if (!data || !data.keys || !data.percentages) return null;

  const segments = data.keys.map((k) => ({
    key: k,
    label: labels[k] || k,
    pct: clamp0to100(data.percentages[k] ?? 0),
    count: data.counts?.[k] ?? null,
    isWinner: data.winner === k,
  }));

  // Hide segments that are truly 0% to keep the bar clean,
  // but still list them below in the legend.
  const shown = segments.filter((s) => s.pct > 0);

  // Tiny color palette that works in dark or light backgrounds
  const palette = {
    accountability: "#9b8cff",
    repair: "#f59f00",
    gift: "#ef476f",
    time: "#118ab2",
    words: "#06d6a0",
    change: "#ffd166",
    default: "#8b8b8b",
  };

  const bar = (
    <div
      role="img"
      aria-label="Forgiveness style distribution"
      style={{
        display: "flex",
        width: "100%",
        height: 14,
        borderRadius: 999,
        overflow: "hidden",
        outline: "1px solid var(--hairline, rgba(255,255,255,0.12))",
        background: "rgba(127,127,127,0.12)",
      }}
      title={`Top: ${prettyLabel(segments, data.winner, labels)} • Runner-up: ${prettyLabel(segments, data.runnerUp, labels)} • Confidence: ${Math.round((data.confidence || 0) * 100)}%`}
    >
      {shown.length === 0 ? (
        <div style={{ flex: 1, background: "rgba(128,128,128,.2)" }} />
      ) : (
        shown.map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.pct}%${s.count != null ? `  (${s.count})` : ""}`}
            style={{
              width: `${s.pct}%`,
              background: palette[s.key] || palette.default,
              outline: s.isWinner ? "1px solid rgba(255,255,255,.7)" : "none",
              boxShadow: s.isWinner ? "inset 0 0 0 9999px rgba(255,255,255,0.06)" : "none",
            }}
          />
        ))
      )}
    </div>
  );

  // Legend (compact, wraps on small screens)
  const legend = (
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
      {segments.map((s) => (
        <div key={`legend-${s.key}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: palette[s.key] || palette.default,
              outline: s.isWinner ? "1px solid rgba(255,255,255,.7)" : "none",
            }}
          />
          <span style={{ whiteSpace: "nowrap" }}>
            {s.label}: <strong>{s.pct}%</strong>
            {s.count != null ? <span style={{ opacity: 0.8 }}> ({s.count})</span> : null}
            {s.isWinner ? <span style={{ marginLeft: 4, opacity: 0.8 }}>• top</span> : null}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {bar}
      {legend}
    </div>
  );
}

function clamp0to100(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function prettyLabel(segments, key, labels) {
  if (!key) return "—";
  const seg = segments.find((s) => s.key === key);
  return seg ? seg.label : labels[key] || key;
}

// src/components/quizzes/ForgivenessDistributionBar.jsx
import React from "react";
import StyleDistributionBar from "./StyleDistributionBar";

/**
 * Back-compat adapter for the old shape.
 * Props:
 *   data: {
 *     keys: string[];
 *     percentages: Record<string, number>;
 *     counts: Record<string, number>;
 *     order: string[];
 *     winner: string|null;
 *     runnerUp: string|null;
 *     confidence: number;
 *   }
 *   labels?: Record<string,string>
 */
export default function ForgivenessDistributionBar({ data, labels = {} }) {
  if (!data) return null;
  const rows = (data.order ?? data.keys ?? []).map((k, i) => ({
    key: k,
    label: labels[k] || k,
    score: data.counts?.[k] ?? 0,
    percent: data.percentages?.[k] ?? 0,
    rank: i + 1,
  }));
  return (
    <StyleDistributionBar
      rows={rows}
      ariaLabel="Forgiveness style distribution"
      // keep the forgiveness color mapping exactly as before if you want:
      palette={{
        accountability: "#9b8cff",
        repair: "#f59f00",
        gift: "#ef476f",
        time: "#118ab2",
        words: "#06d6a0",
        change: "#ffd166",
      }}
    />
  );
}