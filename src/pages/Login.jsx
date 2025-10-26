// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function Login() {
  const { signInEmail } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [msg, setMsg] = useState("");

  const redirectTo = loc.state?.from?.pathname || "/account";

  // Handle magic-link / OAuth callbacks and late auth events
  useEffect(() => {
    let mounted = true;

    async function run() {
      setStatus("working");
      try {
        // 1) Already have a session? Go to account.
        const { data: s1 } = await supabase.auth.getSession();
        if (mounted && s1?.session) {
          setStatus("done");
          nav(redirectTo, { replace: true });
          return;
        }

        // 2) PKCE email link: ?code=...
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!mounted) return;
          // clean the query string
          window.history.replaceState({}, "", window.location.pathname);
          setStatus("done");
          nav(redirectTo, { replace: true });
          return;
        }

        // 3) Legacy hash token fallback (rare)
        const hasHash = typeof window !== "undefined" && window.location.hash?.includes("access_token");
        if (hasHash) {
          await new Promise((r) => setTimeout(r, 50));
          const { data: s2 } = await supabase.auth.getSession();
          if (mounted && s2?.session) {
            setStatus("done");
            nav(redirectTo, { replace: true });
            return;
          }
        }

        // 4) No session yet — stay on form
        setStatus("idle");
      } catch (e) {
        console.warn("[login] exchange failed:", e);
        if (mounted) {
          setStatus("error");
          setMsg(e?.message || "Sign-in link could not be verified.");
        }
      }
    }

    run();

    // 5) Also handle late SIGNED_IN events (Safari/Firefox quirks)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      if (session?.user) {
        nav(redirectTo, { replace: true });
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
    // re-run if the query string changes (e.g., after clicking a new link)
  }, [nav, redirectTo, loc.search]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await signInEmail(email); // sends magic link with redirect to /login
      setSent(true);
    } catch (e2) {
      setMsg(e2.message || "Failed to send link.");
    }
  }

  return (
    <div className="container" style={{ padding: 24, maxWidth: 540 }}>
      <h1 className="display" style={{ marginBottom: 12 }}>Sign in</h1>

      {status === "working" && (
        <p style={{ opacity: 0.85 }}>Verifying magic link…</p>
      )}
      {status === "error" && (
        <p style={{ color: "tomato" }}>{msg}</p>
      )}

      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="surface" style={{ padding: 16, display: "grid", gap: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {msg && status !== "error" && <div style={{ color: "var(--c-ink)" }}>{msg}</div>}
          <button className="btn btn--gold" type="submit">Send magic link</button>
        </form>
      )}
    </div>
  );
}
