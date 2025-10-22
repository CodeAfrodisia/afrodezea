// src/components/achievements/XPProgressBar.jsx
import React from "react"
import { useTheme } from "@lib/useTheme.jsx"

const fallbackTheme = {
  card: "#1a1a1a",
  border: "#444",
  text: "#fff",
  accent: "#FFD700",
}

export default function XPProgressBar({
  currentXP = 0,
  tierXP = 100,
  tier = "Bronze",
  theme: themeProp, // optional
}) {
  // Use provided theme if present; otherwise read from ThemeProvider; fallback hard-coded last
  const ctxTheme = useTheme?.() || {}
  const theme = themeProp || ctxTheme || fallbackTheme

  const percentage = Math.min((currentXP / tierXP) * 100, 100)

  const containerStyle = {
    width: "100%",
    background: theme.card || fallbackTheme.card,
    borderRadius: "10px",
    padding: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    border: `1px solid ${theme.border || fallbackTheme.border}`,
  }

  const barStyle = {
    height: "16px",
    width: `${percentage}%`,
    background: theme.accent || fallbackTheme.accent,
    borderRadius: "8px",
    transition: "width 0.4s ease-in-out",
  }

  const labelStyle = {
    color: theme.text || fallbackTheme.text,
    marginBottom: "6px",
    fontWeight: "bold",
  }

  return (
    <div style={{ maxWidth: "400px", width: "100%" }}>
      <p style={labelStyle}>
        XP: {currentXP} / {tierXP} ({tier})
      </p>
      <div style={containerStyle}>
        <div style={barStyle} />
      </div>
    </div>
  )
}
