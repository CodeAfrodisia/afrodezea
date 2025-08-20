import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!ignore) setUser(data.user ?? null);
      setAuthLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      setUser(session?.user ?? null);
      // ensure profile row exists
      if (session?.user) {
        await supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email || null,
        });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInEmail(email) {
    // magic link to current origin
    const redirectTo = `${window.location.origin}/products`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
  }
  async function signOut() { await supabase.auth.signOut(); }

  const value = useMemo(() => ({ user, authLoading, signInEmail, signOut }), [user, authLoading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
