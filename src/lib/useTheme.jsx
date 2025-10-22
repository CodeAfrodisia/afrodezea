// src/lib/useTheme.js
import React, { createContext, useContext, useMemo } from "react"

export const defaultTheme = {
  background: "#111",
  card: "#1a1a1a",
  border: "#333",
  text: "#fff",
  textMuted: "#aaa",
  primary: "#ffd75e",
  accent: "#ffd75e",
}

const ThemeContext = createContext(defaultTheme)

/** Wrap your app with this to override any tokens in `defaultTheme` */
export function ThemeProvider({ value, children }) {
  const theme = useMemo(() => ({ ...defaultTheme, ...(value || {}) }), [value])
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

/** Hook used across components */
export function useTheme() {
  return useContext(ThemeContext)
}

// Optional default export so both `import useTheme` and `import { useTheme }` work
export default useTheme
