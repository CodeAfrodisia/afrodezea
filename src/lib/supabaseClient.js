import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// Use localStorage for mobile reliability (Firefox, Safari)
const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: typeof window !== "undefined" ? localStorage : undefined, // 👈 fallback
  },
  global: {
    headers: { "x-client-info": "afrodezea-web" },
  },
});

if (import.meta.env.MODE === "development") {
  window.__supabase = supabase;
}

export default supabase;
export { supabase };

// OPTIONAL (dev only): expose for console debugging
if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  window.supabase = supabase;
}
