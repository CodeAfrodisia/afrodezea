// src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { signInEmail } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState("");

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  // After successful verification, send the user where they came from (or /account)
  function goNext() {
    const next = qs.get("next");
    const from = (loc.state && loc.state.from && loc.state.from.pathname) || null;
    nav(next || from || "/account", { replace: true });
  }

  useEffect(() => {
    // Handle Supabase magic-link redirects:
    // v2 PKCE: ?code=... (preferred)
    // legacy / some tenants: ?token_hash=...&type=magiclink&email=...
    (async () => {
      const code = qs.get("code");
      const tokenHash = qs.get("token_hash");
      const type = (qs.get("type") || "").toLowerCase();
      const emailInUrl = qs.get("email") || "";

      // explicit error from GoTrue
      const urlErr = qs.get("error_description") || qs.get("error");
      if (urlErr) {
        setErr(decodeURIComponent(urlErr));
        return;
      }

      if (!code && !tokenHash) return; // nothing to verify

      setVerifying(true);
      setErr("");

      try {
        if (code) {
          // Modern PKCE flow
          console.log("[login] exchanging code for session…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          console.log("[login] exchange ok:", !!data?.session);
          goNext();
          return;
        }

        if (tokenHash) {
          // Fallback: verify token hash (magiclink or recovery)
          console.log("[login] verifying token_hash flow…", { type, hasEmail: !!emailInUrl });
          // If the provider requires email, pass it (Supabase requires email for magiclink type)
          const { data, error } = await supabase.auth.verifyOtp({
            type: type === "recovery" ? "recovery" : "magiclink",
            token_hash: tokenHash,
            email: emailInUrl || undefined,
          });
          if (error) throw error;
          console.log("[login] verifyOtp ok:", !!data?.session);
          goNext();
          return;
        }
      } catch (e) {
        console.error("[login] verification failed:", e);
        setErr(e?.message || "Could not verify the sign-in link.");
      } finally {
        setVerifying(false);
      }
    })();
    // We only want this to run when the URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs.toString()]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await signInEmail(email);
      setSent(true);
    } catch (e2) {
      setErr(e2.message || "Failed to send link.");
    }
  }

  return (
    <div className="container" style={{ padding: 24, maxWidth: 540 }}>
      <h1 className="display" style={{ marginBottom: 12 }}>Sign in</h1>

      {verifying && <p>Verifying magic link…</p>}
      {err && (
        <div style={{ color: "#ffb3b3", marginBottom: 12 }}>
          {String(err)}
        </div>
      )}

      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="surface" style={{ padding: 16, display: "grid", gap: 12 }}>
          <label>Email</label>
          <input
            className="input"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            required
          />
          <button className="btn btn--gold" type="submit" disabled={!email || verifying}>
            Send magic link
          </button>
        </form>
      )}
    </div>
  );
}
