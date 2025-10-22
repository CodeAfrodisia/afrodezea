import { supabase } from "./supabaseClient";

// Gracefully ensure there is a usable session.
// Returns true if a token is available after an optional refresh.
export async function ensureSessionFresh() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return true;

    // try refresh
    await supabase.auth.refreshSession();
    const { data: { session: s2 } } = await supabase.auth.getSession();
    return !!s2?.access_token;
  } catch {
    return false;
  }
}

// Wrap any Supabase call so auth failures don’t explode your UI.
export async function sbSafe(taskFn, opts = {}) {
  const { label = "sbSafe", onAuthLost } = opts;
  try {
    const res = await taskFn();
    // supabase-js returns { data, error }
    if (res?.error) {
      const code = String(res.error.status || res.error.code || "");
      // Treat 401/403 as auth-lost
      if (code.includes("401") || code.includes("403")) {
        if (typeof onAuthLost === "function") onAuthLost(res.error);
      }
      // Hand back the struct so callers can decide
      return res;
    }
    return res;
  } catch (e) {
    // Network / thrown case (also treat as auth lost if 401/403 present)
    const msg = String(e?.message || e);
    if (/401|403/i.test(msg) && typeof onAuthLost === "function") {
      onAuthLost(e);
    }
    return { data: null, error: e };
  }
}
