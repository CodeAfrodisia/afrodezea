// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { ensureProfileHandle } from "@lib/ensureProfileHandle.js";
import { getSiteOrigin } from "@lib/site.js";

const AuthCtx = createContext(null);


// --- PROBES (module scope) ---
const g = (typeof globalThis !== 'undefined' ? globalThis : window);
console.log('[sb instance app/AuthContext] tag =', supabase && supabase.__probe);
console.log('[sb instance app/AuthContext] sameRef =', (supabase && g.__sb_ref) ? (supabase === g.__sb_ref) : null);




/** Small helper to read the auth blob the Supabase client persists. */
async function readStoredSession() {
  try {
    const key = import.meta.env.VITE_SUPABASE_STORAGE_KEY || "sb-afrodezea-auth";
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && obj.user ? obj : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const ready = !authLoading;


  useEffect(() => {
  const g = (typeof globalThis !== 'undefined' ? globalThis : window);
  if (!g.__authCtxMounts) g.__authCtxMounts = 0;
  g.__authCtxMounts += 1;
  console.log('[AuthProvider] mounted count =', g.__authCtxMounts, 'clientTag=', supabase && supabase.__probe);
  return () => {
    g.__authCtxMounts -= 1;
    console.log('[AuthProvider] unmounted count =', g.__authCtxMounts);
  };
}, []);


  /* ----------------------- Dev helpers (console only) ---------------------- */
  if (typeof window !== "undefined") {
    window.__auth = {
      async s()  { return (await supabase.auth.getSession()).data.session },
      async u()  { return (await supabase.auth.getUser()).data.user },
      on() {
        return supabase.auth.onAuthStateChange((evt, session) => {
          console.log("[auth:on]", evt, session?.user?.id || null);
        });
      },
    };
  }
  console.log('[sb instance app]', supabase.__probe);

  /* ----------------- 1) Hash-token magic link safety net ------------------- */
  // If the user lands on ANY route with #access_token/#refresh_token,
  // explicitly setSession(), clean the URL, and seed local state.
  useEffect(() => {
    (async () => {
      try {
        const hashRaw = typeof window !== "undefined" ? (window.location.hash || "") : "";
        if (!hashRaw.includes("access_token")) return;

        const h = hashRaw.startsWith("#") ? hashRaw.slice(1) : hashRaw;
        const p = new URLSearchParams(h);

        const access_token  = p.get("access_token");
        const refresh_token = p.get("refresh_token");

        console.log("[auth] HASH PRESENT → attempting setSession", {
          hasAT: !!access_token,
          atLen: access_token?.length || 0,
          hasRT: !!refresh_token,
          rtLen: refresh_token?.length || 0,
          storageKey: import.meta.env.VITE_SUPABASE_STORAGE_KEY || "sb-afrodezea-auth",
        });

        const { data: ssData, error: ssErr } = await supabase.auth.setSession({ access_token, refresh_token });
        console.log("[auth] setSession result →", {
          ok: !!ssData?.session,
          userId: ssData?.session?.user?.id || null,
          err: ssErr?.message || null,
        });

        const s1 = await supabase.auth.getSession();
        console.log("[auth] getSession (after setSession) →", {
          hasSession: !!s1?.data?.session,
          userId: s1?.data?.session?.user?.id || null,
          exp: s1?.data?.session?.expires_at || null,
        });

        const u1 = await supabase.auth.getUser();
        console.log("[auth] getUser (after setSession) →", {
          hasUser: !!u1?.data?.user,
          userId: u1?.data?.user?.id || null,
          userErr: u1?.error?.message || null,
        });

        console.log('[auth ctx] ready=', ready, 'userId=', user?.id || null);



        useEffect(() => {
  const g = (typeof globalThis !== 'undefined' ? globalThis : window);
  if (!g.__authCtxIds) g.__authCtxIds = new Set();

  const id = Math.random().toString(36).slice(2);
  g.__authCtxIds.add(id);
  console.log('[auth ctx] mounted count =', g.__authCtxIds.size);

  return () => {
    g.__authCtxIds.delete(id);
    console.log('[auth ctx] unmounted count =', g.__authCtxIds.size);
  };
}, []);



        // Clean the URL (remove the hash so we don’t reprocess on refresh).
        try { history.replaceState({}, "", location.pathname + location.search); } catch {}

        // Seed local user immediately if present
        if (u1?.data?.user) {
          setUser(u1.data.user);
          setAuthLoading(false);
          if (location.pathname === "/login") {
            console.log("[auth] user ready after setSession → redirecting to /account");
            location.replace("/account");
          }
        }
      } catch (e) {
        console.error("[auth] setSession from hash FAILED:", e);
      }
    })();
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  


  /* -------- 2) Primary listener + boot getSession + brief late poll -------- */
  useEffect(() => {
    let mounted = true;

    // Give slower browsers (Safari/Firefox) more time before forcing ready.
    const killSwitch = setTimeout(() => {
      if (mounted) {
        console.warn("[auth] load failsafe tripped — forcing ready");
        setAuthLoading(false);
      }
    }, 8000);

    const { data: listener } = supabase.auth.onAuthStateChange(async (evt, session) => {
      const u = session?.user ?? null;
      console.log("[auth] onAuthStateChange:", evt, u?.id || null);
      if (!mounted) return;

      setUser(u);
      setAuthLoading(false);

      if (!u) return;

      // On sign-in, quietly ensure a profile row + handle exist.
      try {
        const { data: { session: fresh } } = await supabase.auth.getSession();
        console.log("[profiles upsert] jwt present?", !!fresh?.access_token);
        const { error } = await supabase
          .from("profiles")
          .upsert({ user_id: u.id }, { onConflict: "user_id" });
        if (error) console.error("[profiles upsert] failed:", error);
      } catch (e) {
        console.error("[profiles upsert] exception:", e);
      }

      try {
        const h = await ensureProfileHandle(u);
        console.log("[profiles handle] ensured:", h);
      } catch (e) {
        console.warn("[profiles handle] failed:", e?.message || e);
      }
    });

    // Boot: ask for the current session; if not present, poll briefly for a late hydrate
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        let bootUser = data?.session?.user ?? null;
        console.log("[auth] boot session:", bootUser ? { userId: bootUser.id, exp: data.session.expires_at } : null);

        let tries = 0;
        while (!bootUser && tries < 10) {
          await new Promise(r => setTimeout(r, 200)); // ~2s total
          const { data: d2 } = await supabase.auth.getSession();
          bootUser = d2?.session?.user ?? null;
          if (bootUser) console.log("[auth] late session detected:", { userId: bootUser.id });
          tries++;
        }

        if (mounted) {
          setUser(bootUser);
          setAuthLoading(false);
        }
      } catch (e) {
        console.error("[auth] boot session error:", e);
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(killSwitch);
      try { listener?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);




  /* -------- 3) Last-chance storage sync (missed event protection) ---------- */
  // If the INITIAL_SESSION event was missed (race/StrictMode), hydrate user from storage
  // after a short delay and whenever the tab regains focus/visibility.
  useEffect(() => {
    let alive = true;

    const sync = async (label) => {
      const stored = await readStoredSession();
      if (!alive) return;
      if (stored?.user && !user) {
        console.log("[auth] storage sync", label, "→ setting user:", stored.user.id);
        setUser(stored.user);
        setAuthLoading(false);
      }
    };

    const t = setTimeout(() => sync("t+200ms"), 200);
    const onVis = () => sync("visibilitychange");
    const onFocus = () => sync("focus");
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      clearTimeout(t);
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  /* ------------------------- Redirect URL builder -------------------------- */
  function buildAuthRedirect() {
    const origin =
      (typeof window !== "undefined" && window.location.origin) || getSiteOrigin();
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const next =
      params.get("next") ||
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/account");
    const url = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    console.log("[auth] redirect URL:", url);
    return url;
  }

  /* ------------------------------ Public API ------------------------------- */
  async function signInEmail(email) {
    const redirectTo = buildAuthRedirect();
    console.log("[auth] signInEmail → redirect:", redirectTo);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      console.error("[auth] signInWithOtp failed:", {
        status: error.status, name: error.name, message: error.message
      });
      throw error;
    }
  }

  async function signInOAuth(provider) {
    const redirectTo = buildAuthRedirect();
    console.log("[auth] signInOAuth →", provider, "redirect:", redirectTo);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo },
    });
    if (error) {
      console.error("[auth] signInWithOAuth failed:", {
        status: error.status, name: error.name, message: error.message
      });
      throw error;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading: authLoading, authLoading, ready, signInEmail, signInOAuth, signOut }),
    [user, authLoading, ready]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
