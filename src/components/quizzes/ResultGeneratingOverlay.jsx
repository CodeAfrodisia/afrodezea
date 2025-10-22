// src/components/quizzes/ResultGeneratingOverlay.jsx
import React, { useEffect } from "react";

export default function ResultGeneratingOverlay({ open = false, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => { body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="result-wait-overlay"
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "grid", placeItems: "center",
        background:
          "radial-gradient(1200px 600px at 50% 20%, rgba(48,23,39,.70), rgba(12,10,12,.92))",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="plate"
        style={{
          width: "min(720px, 92vw)",
          borderRadius: 20,
          border: "1px solid var(--c-border-subtle)",
          boxShadow: "0 18px 48px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)",
          padding: "28px 28px 22px",
          background:
            "linear-gradient(180deg, rgba(84,42,68,.35) 0%, rgba(16,14,16,.65) 100%)",
          color: "var(--c-ink)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: .2 }}>We’re weaving your results…</div>
            <div style={{ opacity: .85, marginTop: 6 }}>A moment of anticipation—then the reveal.</div>
          </div>
          {onCancel ? (
            <button className="btn btn--ghost" onClick={onCancel} aria-label="Cancel">
              Cancel
            </button>
          ) : null}
        </div>

        <div style={{ marginTop: 20, position: "relative", height: 120 }}>
          {/* Glow ring */}
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
              filter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: 160, height: 160, borderRadius: "50%",
                background:
                  "conic-gradient(from 0deg, rgba(212,175,55,.28), rgba(212,175,55,.03) 40%, rgba(212,175,55,.28))",
                animation: "spin 3.5s linear infinite",
              }}
            />
          </div>

          {/* Star pulse */}
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
            }}
          >
            <div
              style={{
                width: 16, height: 16, borderRadius: "50%",
                boxShadow:
                  "0 0 24px rgba(212,175,55,.85), 0 0 120px rgba(212,175,55,.25)",
                background: "rgba(212,175,55,.95)",
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* Progress beats */}
        <div
          aria-hidden
          style={{
            display: "flex", gap: 10, justifyContent: "center", marginTop: 10,
          }}
        >
          {[0,1,2].map(i => (
            <span key={i}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "rgba(212,175,55,.75)",
                opacity: .35,
                animation: "beat 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframes (scoped inline) */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { transform: scale(0.85); opacity: .85; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes beat {
          0%, 100% { transform: translateY(0); opacity: .4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

