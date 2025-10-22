// TooltipWrapper.jsx
import React, { useState, useRef, useEffect } from "react"

export default function TooltipWrapper({ children, tooltip }) {
  const [visible, setVisible] = useState(false)
  const tipRef = useRef(null)
  const wrapperRef = useRef(null)
  const id = useRef(`tip_${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setVisible(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // Basic viewport flip if clipped
  useEffect(() => {
    if (!visible || !tipRef.current || !wrapperRef.current) return
    const tip = tipRef.current.getBoundingClientRect()
    if (tip.top < 0) tipRef.current.style.bottom = "auto", tipRef.current.style.top = "125%"
  }, [visible])

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      style={{ position: "relative", cursor: "help", display: "inline-block" }}
      aria-describedby={visible ? id : undefined}
      tabIndex={0}
    >
      {children}
      {visible && (
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "125%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#222",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            whiteSpace: "nowrap",
            fontSize: "14px",
            zIndex: 1000,
            boxShadow: "0px 4px 12px rgba(0,0,0,0.4)",
            opacity: 0.95,
            pointerEvents: "none",
            maxWidth: 280,
          }}
        >
          {tooltip}
        </div>
      )}
    </span>
  )
}

