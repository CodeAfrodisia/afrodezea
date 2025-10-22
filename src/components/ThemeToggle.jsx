// ThemeToggle.jsx
import React from "react";

const STORAGE_KEY = "afd:theme";
const THEMES = ["charcoal", "cream", "velvet"]; // extend later (e.g., "rose", "noir", ...)

function applyTheme(value) {
  const root = document.documentElement;
  // Always set explicitly to avoid collisions with legacy CSS rules.
  root.setAttribute("data-theme", value);
}

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

function storeTheme(v) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {}
}

function nextTheme(current) {
  const idx = THEMES.indexOf(current);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % THEMES.length;
  return THEMES[nextIdx];
}

export default function ThemeToggle({
  className = "",
  themes = THEMES, // optional override if you inject more themes later
}) {
  const initial = React.useMemo(() => {
    const stored = readStoredTheme();
    return stored && themes.includes(stored) ? stored : themes[0] || "charcoal";
  }, [themes]);

  const [theme, setTheme] = React.useState(initial);

  // Apply and persist whenever it changes
  React.useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  // If the available theme list changes at runtime, re-align the value
  React.useEffect(() => {
    if (!themes.includes(theme)) {
      setTheme(themes[0] || "charcoal");
    }
  }, [themes, theme]);

  const handleClick = () => setTheme(nextTheme(theme));

  // Simple icon map; customize per theme as you add more
  const icon =
    theme === "cream" ? "🌞" :
    theme === "charcoal" ? "🌙" :
    theme === "velvet" ? "V" :
    "✨";

  const label =
    theme.charAt(0).toUpperCase() + theme.slice(1);

  const nextLabel = (() => {
    const n = nextTheme(theme);
    return n.charAt(0).toUpperCase() + n.slice(1);
  })();

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`btn btn-outline-gold ${className}`}
      title={`Switch to ${nextLabel}`}
      aria-label={`Switch theme to ${nextLabel}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
