import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(url, key, {
  auth: {
    // ✅ keep the user signed in across reloads
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles magic-link redirects
  },
});

export default supabase;
export { supabase };
