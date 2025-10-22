import React from "react"

export default function RingStat({
    value = 0,
    max = 100,
    size = 80,
    label,
    sub,
}) {
    const pct = Math.max(0, Math.min(1, max ? value / max : 0))
    const r = (size - 10) / 2
    const c = 2 * Math.PI * r
    const dash = c * pct

    return (
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
            <svg width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="#333"
                    strokeWidth="10"
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <text
                    x="50%"
                    y="50%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    style={{ fontSize: 14 }}
                >
                    {Math.round(pct * 100)}%
                </text>
            </svg>
            {label && <div style={{ fontWeight: 600 }}>{label}</div>}
            {sub && <div style={{ opacity: 0.7, fontSize: 12 }}>{sub}</div>}
        </div>
    )
}

