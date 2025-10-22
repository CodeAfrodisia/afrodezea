import React, { createContext, useContext, useEffect, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  function push(message, kind = "info", ttl = 2500) {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  }
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" style={{
        position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)",
        display:"grid", gap:8, zIndex:9999
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding:"10px 14px", borderRadius:10, background:"rgba(0,0,0,.8)", color:"#fff",
            border:"1px solid rgba(255,255,255,.15)"
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

