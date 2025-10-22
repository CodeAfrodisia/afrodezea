// src/components/shop/StrengthBar.jsx
import React from "react";

function clamp0to5(v) {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

/**
 * StrengthBar
 * value: 0..5 (can be decimal)
 */
export default function StrengthBar({ value = 0, label = "Fragrance Strength" }) {
  const v = clamp0to5(value);
  const isMax = v >= 5 - 1e-6;                 // snap at the edge
  const pct = Math.min(100, (v / 5) * 100 + 0.75);

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
          borderRadius: 9999,
          background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02)), #0f0c0f",
          overflow: "hidden",
          // use inset hairline instead of border to avoid a 1–2px “gap” at the end
          boxShadow: "inset 0 0 0 1px var(--hairline)",
        }}
      >
        {/* fill */}
        <div
          style={{
            width: isMax ? "100%" : `${pct}%`,
            height: "100%",
            borderRadius: 9999,
            background: "linear-gradient(90deg, #8a6b1f, #D4AF37 55%, #b89227)",
            willChange: "width",
            transform: "translateZ(0)", // crisper AA on some GPUs
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
              pointerEvents: "none",
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
