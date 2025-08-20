// src/components/shop/GalleryZoom.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { track } from "../../lib/analytics.js";

export default function GalleryZoom({ src, alt = "", aspect = 1, imgHints = {} }) {
  const boxRef = useRef(null);
  const imgRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const bgPos = useMemo(() => `${pos.x}% ${pos.y}%`, [pos]);

  function onMove(e) {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  // Modal handlers
  function onWheel(e) {
    e.preventDefault();
    const next = Math.max(1, Math.min(4, scale + (e.deltaY < 0 ? 0.15 : -0.15)));
    setScale(next);
  }
  function onDown(e) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onUp() { dragging.current = false; }
  function onDrag(e) {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Inline zoom box */}
      <div
        ref={boxRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={onMove}
        onClick={() => { setOpen(true); track("pdp_zoom_open", {}); }}
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--hairline)",
          aspectRatio: `${aspect} / 1`,
          backgroundImage: `url(${src})`,
          backgroundSize: hover ? "220%" : "cover",
          backgroundPosition: hover ? bgPos : "center",
          cursor: "zoom-in",
          backgroundColor: "#0a0a0a",
        }}
        aria-label="Open zoomed image"
      >
        {/* Hidden <img> helps with layout/intrinsics */}
       <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{ width:"100%", height:"100%", objectFit:"cover", opacity: 0 }}
          loading={imgHints.loading}
          fetchpriority={imgHints.fetchpriority}
          decoding={imgHints.decoding}
          sizes={imgHints.sizes}
       />
      </div>

      {/* Fullscreen modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(0,0,0,.7)",
            display: "grid", placeItems: "center",
            cursor: "zoom-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onWheel={onWheel}
            onMouseDown={onDown}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onMouseMove={onDrag}
            style={{
              position: "relative",
              border: "1px solid var(--hairline)",
              borderRadius: 16,
              overflow: "hidden",
              background: "#0a0a0a",
              maxWidth: "90vw",
              maxHeight: "85vh",
              touchAction: "none",
              cursor: dragging.current ? "grabbing" : "grab",
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, /* ... */ }}
              draggable={false}
              loading={imgHints.modalLoading || "eager"}
              decoding={imgHints.modalDecoding || "async"}
            />
            <div style={{
              position: "absolute", bottom: 8, right: 8,
              display: "flex", gap: 6, background: "rgba(0,0,0,.5)",
              padding: "6px 8px", borderRadius: 999, border: "1px solid var(--hairline)"
            }}>
              <button className="btn btn--ghost" style={{ padding: "2px 10px" }} onClick={() => setScale(s => Math.max(1, s - 0.25))}>-</button>
              <span style={{ minWidth: 36, textAlign: "center", alignSelf: "center" }}>{Math.round(scale * 100)}%</span>
              <button className="btn btn--gold"  style={{ padding: "2px 10px" }} onClick={() => setScale(s => Math.min(4, s + 0.25))}>+</button>
              <button className="btn" style={{ padding: "2px 10px" }} onClick={() => { setScale(1); setPan({ x:0, y:0 }); }}>Reset</button>
              <button className="btn" style={{ padding: "2px 10px" }} onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

