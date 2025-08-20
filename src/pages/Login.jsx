import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

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
      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="surface" style={{ padding: 16, display: "grid", gap: 12 }}>
          <label>Email</label>
          <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
          {err && <div style={{ color: "#ffb3b3" }}>{err}</div>}
          <button className="btn btn--gold" type="submit">Send magic link</button>
        </form>
      )}
    </div>
  );
}

