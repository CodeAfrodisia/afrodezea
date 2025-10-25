// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// Expose for any REST helpers that need them
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = key;

/**
 * Auth configuration notes (reliability):
 * - `flowType: "implicit"` enables cross-device magic links reliably (PKCE requires same device that initiated).
 * - `persistSession: true` + localStorage is safest on Safari/Firefox.
 * - `detectSessionInUrl: true` lets Supabase parse auth params on any route.
 * - `multiTab: true` keeps sessions in sync across tabs/windows.
 * - Consider setting `redirectTo` when sending magic links to /auth/callback.
 */
const supabase = createClient(url, key, {
  auth: {
    flowType: "implicit",          // <- switch from PKCE to support opening links on another device/browser
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    multiTab: true,
    storage: typeof window !== "undefined" ? localStorage : undefined,
    // Optional: custom key so staging/prod don’t collide
    storageKey: import.meta.env.VITE_SUPABASE_STORAGE_KEY || "sb-afrodezea-auth",
  },
  global: {
    headers: { "x-client-info": "afrodezea-web" },
  },
});

// Dev/debug convenience
if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  window.__supabase = supabase;
  window.supabase = supabase;
}

export default supabase;
export { supabase };
