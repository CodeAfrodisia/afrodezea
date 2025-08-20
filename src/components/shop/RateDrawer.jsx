// src/components/shop/RateDrawer.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { submitRating } from "../../lib/ratings.js";


function clamp0to5(n){ const x=Number(n??0); if(Number.isNaN(x)) return 0; return Math.max(0, Math.min(5, x)); }
const FIELDS = ["floral","fruity","woody","fresh","spicy","strength"];

export default function RateDrawer({ open, onClose, product, prefillEmail = "" }) {
  const [email, setEmail] = useState(prefillEmail);
  const [vals, setVals] = useState({ floral:0, fruity:0, woody:0, fresh:0, spicy:0, strength:3 });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const panelRef = useRef(null);
  const firstRef = useRef(null);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset
  useEffect(() => {
    if (!open) return;
    setVals({ floral:0, fruity:0, woody:0, fresh:0, spicy:0, strength:3 });
    setErr("");
    setTimeout(() => firstRef.current?.focus(), 0);
  }, [open, product?.id]);

  // ESC to close + basic focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;
      const f = panelRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f || f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const emailOk = useMemo(() => !email || /\S+@\S+\.\S+/.test(email), [email]);
  if (!open) return null;

  async function submit() {
    setErr("");
    if (!product?.id) return;
    if (!emailOk) { setErr("Please enter a valid email (or leave it blank)."); return; }

    setSubmitting(true);
    try {
      await submitRating({
        product_id: product.id,
        email: email || null,
        floral:   clamp0to5(vals.floral),
        fruity:   clamp0to5(vals.fruity),
        woody:    clamp0to5(vals.woody),
        fresh:    clamp0to5(vals.fresh),
        spicy:    clamp0to5(vals.spicy),
        strength: clamp0to5(vals.strength),
        token: rateToken || undefined,     // <-- important
      });
      onClose?.();
      // (optional toast later)
    } catch (e) {
      console.error(e);
      setErr(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-veil" onClick={(e)=> e.target === e.currentTarget && onClose?.()}>
      <div ref={panelRef} className="glass modal-card" style={{ width:"min(720px,92vw)" }}>
        <div className="glass-header">
          <div style={{ display:"grid" }}>
            <div className="modalTitle">Rate this Candle’s Profile</div>
            <small style={{ opacity:.7 }}>{product?.title || "—"}</small>
          </div>
          <button className="btn btn--icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ padding:16, display:"grid", gap:14 }}>
          <div>
            <label style={{ display:"block", marginBottom:6, opacity:.85 }}>Email (optional, for purchase verification later)</label>
            <input ref={firstRef} className="input" placeholder="you@example.com"
              value={email} onChange={e=>setEmail(e.target.value)}
              style={{ borderColor: emailOk ? undefined : "crimson" }}/>
          </div>

          <div style={{ display:"grid", gap:10 }}>
            {FIELDS.map(k => (
              <div key={k} style={{ display:"grid", gridTemplateColumns:"140px 1fr", alignItems:"center", gap:10 }}>
                <label style={{ textTransform:"capitalize", opacity:.9 }}>{k}</label>
                <input type="range" min="0" max="5" value={vals[k]}
                       onChange={e=>setVals(v=>({ ...v, [k]: Number(e.target.value) }))}/>
              </div>
            ))}
          </div>

          {err ? <div style={{ color:"#ffb3b3" }}>{err}</div> : null}

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button className="btn btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn--gold" onClick={submit} disabled={submitting}>
              {submitting ? "Sending…" : "Submit Rating"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
