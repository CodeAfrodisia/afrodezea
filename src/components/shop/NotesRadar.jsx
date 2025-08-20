import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * props:
 *  - profile: object with 0..5 values (e.g. { floral: 4, fruity: 2, ... })
 *  - compact: boolean
 *
 * Notes:
 *  - Responsive: uses ResizeObserver to fit container width
 *  - Supports 5 or 8 axes (renders whatever is present in AXES_ORDER below,
 *    and falls back to 0 for missing keys)
 */

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

// If you want a 5-axis variant somewhere, pass a profile with only those keys;
// the renderer gracefully shows whatever keys have values or default zeros.
// Or change the order above to your preferred default.

export default function NotesRadar({ profile = {}, compact = false }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Responsive width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const size = Math.max(160, Math.min(420, width || (compact ? 240 : 300))); // clamp
  const headingSize = compact ? 14 : 16;
  const max = 5;
  const levels = 5;

  // Decide which axes to render:
  // Show the axes from AXES_ORDER; if a key is missing in `profile`, treat as 0.
  const axes = useMemo(() => AXES_ORDER, []);
  const vals = useMemo(() => {
    const clamp = (v) => Math.max(0, Math.min(max, Number(v || 0)));
    return axes.map(a => ({
      label: a.label,
      key: a.key,
      value: clamp(profile[a.key]),
    }));
  }, [profile, axes]);

  // Geometry
  const { cx, cy, r, angleStep, pts, gridLevels } = useMemo(() => {
    const pad = compact ? 12 : 16;
    const cx = size / 2;
    const cy = size / 2;
    const r = (size / 2) - pad;
    const angleStep = (Math.PI * 2) / axes.length;

    // Grid rings (1..levels)
    const gridLevels = [];
    for (let lvl = 1; lvl <= levels; lvl++) {
      const frac = lvl / levels;
      const ring = axes.map((_, i) => {
        const a = -Math.PI / 2 + i * angleStep; // start at top
        return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac];
      });
      gridLevels.push(ring);
    }

    // Data polygon
    const pts = axes.map((a, i) => {
      const v = vals[i]?.value ?? 0;
      const aRad = -Math.PI / 2 + i * angleStep;
      const rr = (v / max) * r;
      return [cx + Math.cos(aRad) * rr, cy + Math.sin(aRad) * rr];
    });

    return { cx, cy, r, angleStep, pts, gridLevels };
  }, [size, axes, vals, compact]);

  const polygonPath = useMemo(() => pts.map(([x, y]) => `${x},${y}`).join(" "), [pts]);

  // label helpers
  const labelFontSize = compact ? 10 : 12;
  const labelOffset = compact ? 8 : 12;

  return (
    <div className="glass" style={{ padding: 12, borderRadius: 16 }} ref={containerRef}>
      <div className="heading" style={{ fontSize: headingSize, margin: "0 0 8px" }}>
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
              stroke="rgba(255,255,255,.15)"
              strokeWidth="1"
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
                stroke="rgba(255,255,255,.15)"
                strokeWidth="1"
              />
            );
          })}

          {/* data polygon */}
          <polygon
            points={polygonPath}
            fill="rgba(212,175,55,.28)"
            stroke="rgba(212,175,55,.9)"
            strokeWidth={2}
          />

          {/* vertex dots */}
          {pts.map(([x, y], i) => (
            <circle key={`dot-${i}`} cx={x} cy={y} r={3} fill="rgba(212,175,55,.9)" />
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
                style={{ fontSize: labelFontSize, fill: "var(--muted)", opacity: 0.9 }}
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
