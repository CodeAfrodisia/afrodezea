// src/lib/site.js
export function getSiteOrigin() {
  // Prefer explicit env; fall back to window at runtime
  const origin =
    import.meta.env.VITE_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // Always prefer https in production-like hosts
  return origin.replace(/^http:/, "https:");
}

export function isPreviewEnv() {
  const url = (import.meta.env.VITE_SITE_URL || "").toLowerCase();
  return url.includes("vercel.app") || url.includes("preview") || url.includes("staging");
}

// Canonical https URL for redirects (e.g., /auth/callback)
export const SITE_URL = getSiteOrigin();
export const AUTH_CALLBACK_URL = `${SITE_URL}/auth/callback`;
