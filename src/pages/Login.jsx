// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const log  = (...a) => console.log("[login]", ...a);
const err  = (...a) => console.error("[login]", ...a);

export default function Login() {
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [verifying] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      log("signInEmail → /auth/callback redirect (with next)");
      await signInEmail(email);
      log("magic link sent");
      setSent(true);
    } catch (e2) {
      err("signInEmail failed", e2);
      setMsg(e2.message || "Failed to send link.");
    }
  }

  return (
    <div className="container" style={{ padding: 24, maxWidth: 540 }}>
      <h1 className="display" style={{ marginBottom: 12 }}>Sign in</h1>
      {!!msg && <div style={{ color: "#ffb3b3", marginBottom: 12 }}>{msg}</div>}
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
