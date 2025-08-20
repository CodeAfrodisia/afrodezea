import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, ready, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");

  if (!ready) return <div style={{ padding:24 }}>Loading…</div>;

  return (
    <div className="container" style={{ padding:24, display:"grid", gap:12 }}>
      <h1 className="display">My Account</h1>
      {user ? (
        <>
          <div className="surface" style={{ padding:12 }}>
            Signed in as <strong>{user.email}</strong>
          </div>
          <div><button className="btn btn--gold" onClick={signOut}>Sign out</button></div>
        </>
      ) : (
        <div className="surface" style={{ padding:12, display:"grid", gap:10, maxWidth:420 }}>
          <label>Email for magic link</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="btn btn--gold" onClick={async()=>{ if(!email) return; await signIn(email); alert("Check your inbox for the sign-in link."); }}>
            Send magic link
          </button>
        </div>
      )}
    </div>
  );
}
