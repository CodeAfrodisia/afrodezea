// src/components/shop/RateDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { submitRating, fetchMyRating } from "../../lib/ratings.js";

function clamp0to5(n) {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(5, x));
}

const FIELDS = [
  "floral",
  "fruity",
  "citrus",
  "woody",
  "fresh",
  "spicy",
  "sweet",
  "smoky",
  "strength",
];

// Promise deadline guard so the UI never hangs if the request doesn't settle
function withDeadline(promise, ms = 12000, label = "op") {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, rej) => {
      timer = setTimeout(() => rej(new Error(`[timeout] ${label} > ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export default function RateDrawer({
  open,
  onClose,
  product,
  existingRating = null,
  rateToken = null,   // reserved; not used with member-only flow
  onSubmitted = null,
  userId = null,      // optional; server can default to auth.uid()
}) {
  const [vals, setVals] = useState({
    floral: 0,
    fruity: 0,
    citrus: 0,
    woody: 0,
    fresh: 0,
    spicy: 0,
    sweet: 0,
    smoky: 0,
    strength: 3,
  });
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const panelRef = useRef(null);
  const firstRef = useRef(null);

  // ───────────────── Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ───────────────── Prefill from the user's existing rating (if any)
  useEffect(() => {
    let active = true;
    if (!open || !product?.id) return;

    setErr("");
    setLoadingExisting(true);

    (async () => {
      try {
        const r =
          (await fetchMyRating(product.id)) ||
          existingRating ||
          null;

        if (!active) return;
        setExisting(r);

        setVals({
          floral: clamp0to5(r?.floral ?? 0),
          fruity: clamp0to5(r?.fruity ?? 0),
          citrus: clamp0to5(r?.citrus ?? 0),
          woody: clamp0to5(r?.woody ?? 0),
          fresh: clamp0to5(r?.fresh ?? 0),
          spicy: clamp0to5(r?.spicy ?? 0),
          sweet: clamp0to5(r?.sweet ?? 0),
          smoky: clamp0to5(r?.smoky ?? 0),
          strength: clamp0to5(r?.strength ?? 3),
        });

        // focus first control
        setTimeout(() => firstRef.current?.focus(), 0);
      } catch (e) {
        if (!active) return;
        console.error("[ratings] prefill failed:", e);
        setErr(e?.message || "Could not load your previous rating.");
      } finally {
        if (active) setLoadingExisting(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, product?.id, existingRating]);

  // ───────────────── ESC close + simple focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isEditing = Boolean(existing?.id);

  async function submit() {
    if (submitting) return; // guard double-clicks
    setErr("");
    if (!product?.id) return;

    setSubmitting(true);
    try {
      const payload = {
        product_id: product.id,
        user_id: userId || undefined, // server may default this to auth.uid()
        floral: clamp0to5(vals.floral),
        fruity: clamp0to5(vals.fruity),
        citrus: clamp0to5(vals.citrus),
        woody: clamp0to5(vals.woody),
        fresh: clamp0to5(vals.fresh),
        spicy: clamp0to5(vals.spicy),
        sweet: clamp0to5(vals.sweet),
        smoky: clamp0to5(vals.smoky),
        strength: clamp0to5(vals.strength),
      };

      // IMPORTANT: enforce a deadline so UI can't hang forever
      const res = await withDeadline(submitRating(payload), 12000, "rating.submit");
      // optional debug:
      // console.debug("[ratings] submit result:", res);

      // Let parent optimistically update graphs
      onSubmitted?.({
        floral: vals.floral,
        fruity: vals.fruity,
        citrus: vals.citrus,
        woody: vals.woody,
        fresh: vals.fresh,
        spicy: vals.spicy,
        sweet: vals.sweet,
        smoky: vals.smoky,
        strength: vals.strength,
      });

      onClose?.();
    } catch (e) {
      console.error("[ratings] submit failed:", e);
      // Show helpful text (e.g., RLS errors, timeouts)
      setErr(
        (e && e.message) ||
          "Something went wrong while submitting your rating."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ───────────────── Modal (portal) styles
  const veilStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,.45)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const cardStyle = {
    width: "min(720px, 92vw)",
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: 16,
    border: "1px solid var(--hairline)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02)), #0f0c0f",
    boxShadow: "0 12px 32px rgba(0,0,0,.45)",
  };

  const headerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    background: "rgba(0,0,0,.35)",
    backdropFilter: "blur(2px)",
    borderBottom: "1px solid var(--hairline)",
  };

  // ───────────────── Render via portal
  return createPortal(
    <div
      className="modal-veil"
      style={veilStyle}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div ref={panelRef} className="glass modal-card" style={cardStyle}>
        <div className="glass-header" style={headerStyle}>
          <div style={{ display: "grid" }}>
            <div className="modalTitle">
              {isEditing ? "Update your rating" : "Rate this candle’s profile"}
            </div>
            <small style={{ opacity: 0.7 }}>{product?.title || "—"}</small>
          </div>
          <button className="btn btn--icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          {loadingExisting && (
            <div style={{ opacity: 0.8 }}>Loading your previous rating…</div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {FIELDS.map((k, i) => (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <label style={{ textTransform: "capitalize", opacity: 0.9 }}>
                  {k}
                </label>
                <input
                  ref={i === 0 ? firstRef : undefined}
                  type="range"
                  min="0"
                  max="5"
                  value={vals[k]}
                  onChange={(e) =>
                    setVals((v) => ({ ...v, [k]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>

          {err ? <div style={{ color: "#ffb3b3" }}>{err}</div> : null}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn--gold" onClick={submit} disabled={submitting}>
              {submitting ? "Sending…" : isEditing ? "Update rating" : "Submit rating"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
