import React from "react"

export default function Sparkline({
    points = [],
    width = 140,
    height = 40,
    strokeWidth = 2,
}) {
    if (!points.length) return null
    const xs = points.map((_, i) => i)
    const min = Math.min(...points),
        max = Math.max(...points)
    const norm = (v) => {
        if (max === min) return height / 2
        return height - ((v - min) / (max - min)) * height
    }
    const step = width / Math.max(1, points.length - 1)
    const d = points
        .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step},${norm(v)}`)
        .join(" ")
    return (
        <svg width={width} height={height}>
            <path
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
            />
        </svg>
    )
}

