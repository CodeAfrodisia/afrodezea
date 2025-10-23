// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { ensureProfileHandle } from "@lib/ensureProfileHandle.js";
import { getSiteOrigin } from "@lib/site.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Boot from cached session once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const bootUser = data?.session?.user ?? null;
      console.log("[auth] boot session:", bootUser
        ? { userId: bootUser.id, exp: data.session.expires_at }
        : null);
      if (!cancelled) setUser(bootUser);
      if (!cancelled) setAuthLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Helper: create/keep profile row (no `id`, conflict on `user_id`)
  async function ensureProfileRow(u) {
    if (!u?.id) return;
    try {
      // wait for a fresh session so Authorization header is definitely attached
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[profiles upsert] jwt present?", !!session?.access_token);

      const payload = { user_id: u.id }; // do NOT send `id`
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) {
        console.error("[profiles upsert] failed:", error);
      } else {
        console.log("[profiles upsert] ok for", u.id);
      }
    } catch (e) {
      console.error("[profiles upsert] exception:", e);
    }
  }

  // React to auth changes
  useEffect(() => {
    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange(async (evt, session) => {
      const u = session?.user ?? null;
      console.log("[auth] onAuthStateChange:", evt, u?.id || null);
      if (mounted) setUser(u);
      if (!u) return;

      // 1) Create/keep profile row (RLS-safe)
      await ensureProfileRow(u);

      // 2) Ensure handle (best-effort)
      try {
        const h = await ensureProfileHandle(u);
        console.log("[profiles handle] ensured:", h);
      } catch (e) {
        console.warn("[profiles handle] failed:", e?.message || e);
      }
    });

    return () => {
      mounted = false;
      try { listener?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  // Redirect used for magic link / OAuth
  const AUTH_REDIRECT = `${getSiteOrigin()}/products`;

  async function signInEmail(email) {
    console.log("[auth] signInEmail → redirect:", AUTH_REDIRECT);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    if (error) {
      console.error("[auth] signInWithOtp failed:", {
        status: error.status, name: error.name, message: error.message,
      });
      throw error;
    }
    console.log("[auth] magic link sent:", data);
  }

  async function signInOAuth(provider) {
    console.log("[auth] signInOAuth →", provider, "redirect:", AUTH_REDIRECT);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: AUTH_REDIRECT },
    });
    if (error) {
      console.error("[auth] signInWithOAuth failed:", {
        status: error.status, name: error.name, message: error.message,
      });
      throw error;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, authLoading, signInEmail, signInOAuth, signOut }),
    [user, authLoading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
