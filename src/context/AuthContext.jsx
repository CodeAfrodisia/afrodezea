import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { ensureProfileHandle } from "@lib/ensureProfileHandle.js";
import { getSiteOrigin } from "@lib/site.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Subscribe FIRST so we catch INITIAL_SESSION reliably,
  // then query getSession in parallel. Add a small failsafe timer.
  useEffect(() => {
    let mounted = true;
    const killSwitch = setTimeout(() => {
      if (mounted) {
        console.warn("[auth] load failsafe tripped — forcing ready");
        setAuthLoading(false);
      }
    }, 3000);

    const { data: listener } = supabase.auth.onAuthStateChange(async (evt, session) => {
      const u = session?.user ?? null;
      console.log("[auth] onAuthStateChange:", evt, u?.id || null);
      if (!mounted) return;
      setUser(u);

      // As soon as we know anything about the session, we’re ready.
      setAuthLoading(false);

      if (!u) return;
      try {
        // Make sure profile exists (conflict on user_id)
        const { data: { session: fresh } } = await supabase.auth.getSession();
        console.log("[profiles upsert] jwt present?", !!fresh?.access_token);
        const { error } = await supabase.from("profiles").upsert({ user_id: u.id }, { onConflict: "user_id" });
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

    // Also request current session (this resolves quickly when cached)
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const bootUser = data?.session?.user ?? null;
        console.log("[auth] boot session:", bootUser ? { userId: bootUser.id, exp: data.session.expires_at } : null);
        if (!mounted) return;
        setUser(bootUser);
        setAuthLoading(false); // in case INITIAL_SESSION is delayed
      } catch {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(killSwitch);
      try { listener?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  const AUTH_REDIRECT = `${getSiteOrigin()}/login`;

  async function signInEmail(email) {
    console.log("[auth] signInEmail → redirect:", AUTH_REDIRECT);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    if (error) {
      console.error("[auth] signInWithOtp failed:", { status: error.status, name: error.name, message: error.message });
      throw error;
    }
  }

  async function signInOAuth(provider) {
    console.log("[auth] signInOAuth →", provider, "redirect:", AUTH_REDIRECT);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: AUTH_REDIRECT } });
    if (error) {
      console.error("[auth] signInWithOAuth failed:", { status: error.status, name: error.name, message: error.message });
      throw error;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading: authLoading, authLoading, signInEmail, signInOAuth, signOut }),
    [user, authLoading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
