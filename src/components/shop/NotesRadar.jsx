// src/components/shop/NotesRadar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const AXES_ORDER = [
  { key: "floral", label: "Floral" },
  { key: "fruity", label: "Fruity" },
  { key: "citrus", label: "Citrus" },
  { key: "fresh",  label: "Fresh"  },
  { key: "woody",  label: "Woody"  },
  { key: "spicy",  label: "Spicy"  },
  { key: "sweet",  label: "Sweet"  },
  { key: "smoky",  label: "Smoky"  },
];

function cssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)?.trim();
  return v || fallback;
}

function getPalette() {
  const theme = document?.documentElement?.dataset?.theme || "cream";
  const wine = cssVar("--brand-wine", "#301727");
  const gold = cssVar("--brand-gold", "rgb(212 175 55)");

  if (theme === "charcoal" || theme === "velvet") {
    return {
      axisText: "rgba(249,249,249,.92)",
      grid: "rgba(249,249,249,.20)",
      gridOuter: "rgba(249,249,249,.38)",
      stroke: gold,
      dot: gold,
      fill: `color-mix(in srgb, ${gold} 22%, transparent)`,
    };
  }
  // cream
  return {
    axisText: "rgba(42,28,28,.95)",
    grid: "rgba(42,28,28,.18)",
    gridOuter: "rgba(42,28,28,.36)",
    stroke: "rgba(42,28,28,.75)",
    dot: "rgba(42,28,28,.85)",
    fill: `color-mix(in srgb, ${cssVar("--brand-wine", "#301727")} 18%, transparent)`,
  };
}

export default function NotesRadar({
  profile = {},
  compact = false,
  chartScale = 0.9,       // a touch larger so max hits the edge visually
  max = 5,
  levels = 5,
  animate = true,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colors = getPalette();

  // size clamped for clarity
  const size = Math.max(240, Math.min(460, width || (compact ? 320 : 380)));
  const pad = compact ? 12 : 16;
  const headingSize = Math.max(16, compact ? 16 : 18);

  // labels a bit further out so the polygon can fill
  const labelFontSize = Math.max(12, Math.round(size * 0.046));
  const labelOffset   = Math.max(12, Math.round(size * 0.07));

  // prep values (clamped)
  const axes = useMemo(() => AXES_ORDER, []);
  const vals = useMemo(() => {
    const clamp = (v) => Math.max(0, Math.min(max, Number(v ?? 0)));
    return axes.map(a => clamp(profile[a.key]));
  }, [profile, axes, max]);

  // geometry
  const cx = size / 2;
  const cy = size / 2;
  const rBase = (size / 2) - pad;
  const r = rBase * chartScale; // all rings + polygon use the same r (so max reaches outer)

  const angleStep = (Math.PI * 2) / axes.length;

  // rings
  const gridLevels = useMemo(() => {
    const out = [];
    for (let lvl = 1; lvl <= levels; lvl++) {
      const frac = lvl / levels;
      const ring = axes.map((_, i) => {
        const a = -Math.PI / 2 + i * angleStep;
        return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac];
      });
      out.push(ring);
    }
    return out;
  }, [axes, r, angleStep, levels, cx, cy]);

  // polygon points (target)
  const targetPts = useMemo(() => axes.map((_, i) => {
    const v = vals[i];
    const a = -Math.PI / 2 + i * angleStep;
    // snap-to-edge if value is effectively max (avoids a hairline gap)
    const rr = (Math.min(v, max) / max) * r * 1.002; // +0.2% visual nudge
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  }), [axes, angleStep, vals, max, r, cx, cy]);


  // (optional) animation lerp
  const [pts, setPts] = useState(targetPts);
  useEffect(() => {
    if (!animate) { setPts(targetPts); return; }
    let raf = 0;
    const D = 120; // ms
    const start = performance.now();
    const from = pts;

    const tick = (t) => {
      const f = Math.min(1, (t - start) / D);
      const next = targetPts.map(([tx, ty], i) => {
        const [fx, fy] = from[i] || targetPts[i];
        return [fx + (tx - fx) * f, fy + (ty - fy) * f];
      });
      setPts(next);
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetPts, animate]); // eslint-disable-line react-hooks/exhaustive-deps

  const polygonPath = useMemo(() => pts.map(([x, y]) => `${x},${y}`).join(" "), [pts]);

  return (
    <div className="glass" style={{ padding: 12, borderRadius: 16 }} ref={containerRef}>
      <div className="heading" style={{ fontSize: headingSize, margin: "0 0 10px" }}>
        Scent Profile
      </div>

      <div style={{ width: "100%", height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Scent profile radar">
          {/* grid rings */}
          {gridLevels.map((ring, i) => (
            <polygon
              key={`grid-${i}`}
              points={ring.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke={i === gridLevels.length - 1 ? colors.gridOuter : colors.grid}
              strokeWidth={i === gridLevels.length - 1 ? 1.5 : 1}
            />
          ))}

          {/* axes */}
          {axes.map((_, i) => {
            const a = -Math.PI / 2 + i * angleStep;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={colors.grid}
                strokeWidth="1"
              />
            );
          })}

          {/* data polygon */}
          <polygon
            points={polygonPath}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {/* vertex dots */}
          {pts.map(([x, y], i) => (
            <circle key={`dot-${i}`} cx={x} cy={y} r={3.5} fill={colors.dot} />
          ))}

          {/* labels */}
          {axes.map((a, i) => {
            const ang = -Math.PI / 2 + i * angleStep;
            const lx = cx + Math.cos(ang) * (r + labelOffset);
            const ly = cy + Math.sin(ang) * (r + labelOffset);
            const cos = Math.cos(ang);
            const anchor = cos > 0.2 ? "start" : (cos < -0.2 ? "end" : "middle");
            return (
              <text
                key={`lab-${a.key}`}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                style={{ fontSize: labelFontSize, fill: colors.axisText, fontWeight: 600 }}
              >
                {a.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
