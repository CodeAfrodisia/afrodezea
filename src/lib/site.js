// src/lib/site.js
export function getSiteOrigin() {
  // Prefer explicit env; fall back to window at runtime
  return (
    import.meta.env.VITE_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  );
}

export function isPreviewEnv() {
  const url = (import.meta.env.VITE_SITE_URL || "").toLowerCase();
  // Heuristics: vercel preview domains or any non-prod host strings you use
  return url.includes("vercel.app") || url.includes("preview") || url.includes("staging");
}

// Optional convenience if some files want a constant:
export const SITE_URL = getSiteOrigin();
