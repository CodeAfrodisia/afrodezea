// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { ensureProfileHandle } from "@lib/ensureProfileHandle.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Boot from cached session once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUser(data?.session?.user ?? null);
      if (!cancelled) setAuthLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // React to auth changes (single subscription, non-blocking writes)
useEffect(() => {
  let mounted = true;

  const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
    const u = session?.user ?? null;
    if (mounted) setUser(u);
    if (!u) return;

    // Fire-and-forget: create-or-keep the row by PK `id` (no `email` here)
    (async () => {
      try {
        await supabase
          .from("profiles")
          .upsert({ id: u.id }, { onConflict: "id" }); // ← RIGHT key
      } catch (e) {
        console.warn("[auth] profiles upsert failed:", e?.message || e);
      }

      try {
        await ensureProfileHandle(u);
      } catch (e) {
        console.warn("[auth] ensureHandle:", e?.message || e);
      }
    })();
  });

  return () => {
    mounted = false;
    try { listener?.subscription?.unsubscribe?.(); } catch {}
  };
}, []);


  async function signInEmail(email) {
    const redirectTo = `${window.location.origin}/products`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); }

  const value = useMemo(() => ({ user, authLoading, signInEmail, signOut }), [user, authLoading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
