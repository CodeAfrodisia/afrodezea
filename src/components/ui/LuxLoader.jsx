// src/components/ui/LuxLoader.jsx
import React from "react";

export default function LuxLoader({ message = "Composing your result…" }) {
  return (
    <div aria-live="polite" aria-busy="true"
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "grid", placeItems: "center",
        backdropFilter: "blur(3px)",
        background: "rgba(0,0,0,.45)"
      }}
    >
      <div
        style={{
          width: 220, padding: 18, borderRadius: 16,
          background: "linear-gradient(180deg, #301727 0%, #1a1017 100%)",
          border: "1px solid rgba(212,175,55,.35)",
          color: "#F7F4ED",
          boxShadow: "0 18px 42px rgba(0,0,0,.42)",
          display: "grid", gap: 10, justifyItems: "center"
        }}
      >
        <div style={{ position: "relative", width: 96, height: 96 }}>
          {/* gold ring */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "2px solid rgba(212,175,55,.55)",
            animation: "lux-spin 2.6s linear infinite"
          }}/>
          {/* inner pulse */}
          <div style={{
            position: "absolute", inset: 16, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,.45), transparent 60%)",
            animation: "lux-pulse 2.2s ease-in-out infinite"
          }}/>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>A moment of alchemy…</div>
          <div style={{ opacity: .9, fontSize: 14 }}>{message}</div>
        </div>
      </div>

      <style>{`
        @keyframes lux-spin { to { transform: rotate(360deg); } }
        @keyframes lux-pulse {
          0%, 100% { transform: scale(.85); opacity:.8; }
          50% { transform: scale(1); opacity:1; }
        }
      `}</style>
    </div>
  );
}

