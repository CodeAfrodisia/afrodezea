// src/components/shop/NotesRadar.jsx
import React from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from "recharts";

/**
 * props.profile: object with 0..5 values for each axis, e.g.:
 * { floral: 4, fruity: 2, woody: 3, spicy: 1.5, citrus: 2.5, fresh: 3, sweet: 2, smoky: 1 }
 * props.compact: boolean (smaller text and height for Quick View)
 */
export default function NotesRadar({ profile = {}, compact = false }) {
  const axes = [
    { key: "floral",  label: "Floral"  },
    { key: "fruity",  label: "Fruity"  },
    { key: "citrus",  label: "Citrus"  },
    { key: "fresh",   label: "Fresh"   },
    { key: "woody",   label: "Woody"   },
    { key: "spicy",   label: "Spicy"   },
    { key: "sweet",   label: "Sweet"   },
    { key: "smoky",   label: "Smoky"   },
  ];

  const data = axes.map(a => ({
    axis: a.label,
    value: Math.max(0, Math.min(5, Number(profile[a.key] ?? 0))),
  }));

  const height = compact ? 220 : 280;
  const tickStyle = { fill: "var(--muted)", fontSize: compact ? 10 : 12 };

  return (
    <div className="glass" style={{ padding: 12, borderRadius: 16 }}>
      <div className="heading" style={{ fontSize: compact ? 14 : 16, margin: "0 0 8px" }}>
        Scent Profile
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius={compact ? 70 : 90}>
            <PolarGrid stroke="rgba(255,255,255,.15)" />
            <PolarAngleAxis dataKey="axis" tick={tickStyle} />
            <PolarRadiusAxis
              domain={[0, 5]}
              tick={tickStyle}
              tickCount={6}
              stroke="rgba(255,255,255,.15)"
            />
            <Radar
              name="Profile"
              dataKey="value"
              // keep default color per our “no custom colors” rule unless you want the brand fill:
              // fill="rgba(212,175,55,.28)" stroke="rgba(212,175,55,.9)"
              fill="rgba(212,175,55,.28)"
              stroke="rgba(212,175,55,.9)"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
