// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = key;

/**
 * Auth config:
 * - PKCE is recommended (default) and works great with magic links.
 * - persistSession + multiTab keep state consistent across tabs.
 * - detectSessionInUrl allows parsing tokens on any route.
 * - Use `redirectTo` when sending magic links if you need a specific callback path.
 */
const supabase = createClient(url, key, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    multiTab: true,
    storage: typeof window !== "undefined" ? localStorage : undefined,
    storageKey: import.meta.env.VITE_SUPABASE_STORAGE_KEY || "sb-afrodezea-auth",
  },
  global: {
    headers: { "x-client-info": "afrodezea-web" },
  },
});

// ---- SINGLETON PIN + GUARD ----
const g = (typeof globalThis !== 'undefined' ? globalThis : window);
if (!g.__sb_ref) {
  g.__sb_ref = supabase;
  supabase.__probe = 'app:shared-client';
  supabase.__created_from = import.meta.url;
} else if (g.__sb_ref !== supabase) {
  console.error('[Supabase] DUPLICATE CLIENT DETECTED', {
    firstFrom: g.__sb_ref.__created_from,
    secondFrom: import.meta.url,
  });
  throw new Error('Duplicate Supabase client instance — check your imports/aliases.');
}


console.log('[supabase init]', import.meta.env.VITE_SUPABASE_URL, !!import.meta.env.VITE_SUPABASE_ANON_KEY);


// Dev convenience
if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  window.__supabase = supabase;
  window.supabase = supabase;
  window.SUPABASE_URL = url;
}

if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  window.__supabase = supabase;
  window.supabase = supabase;
  window.SUPABASE_URL = url;
  window.SUPABASE_ANON_KEY = key;   // <- add this line so console REST calls work
}


export default supabase;
export { supabase };
