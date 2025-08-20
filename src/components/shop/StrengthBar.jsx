// src/components/shop/StrengthBar.jsx
import React from "react";

function clamp01to5(v) {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

/**
 * StrengthBar
 * value: 0..5 (can be decimal)
 */
export default function StrengthBar({ value = 0, label = "Fragrance Strength" }) {
  const v = clamp01to5(value);
  const pct = (v / 5) * 100;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="heading" style={{ fontSize: 16 }}>{label}</div>
        <div style={{ color: "var(--gold)", fontWeight: 700 }}>{v.toFixed(1)} / 5</div>
      </div>

      <div
        aria-label={`Strength ${v.toFixed(1)} out of 5`}
        style={{
          position: "relative",
          height: 12,
          borderRadius: 999,
          border: "1px solid var(--hairline)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02)), #0f0c0f",
          overflow: "hidden",
        }}
      >
        {/* fill */}
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, #8a6b1f, #D4AF37 55%, #b89227)",
          }}
        />
        {/* ticks */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i / 5) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(255,255,255,.12)",
              transform: "translateX(-0.5px)",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
        <span>Soft</span>
        <span>Balanced</span>
        <span>Bold</span>
      </div>
    </div>
  );
}

