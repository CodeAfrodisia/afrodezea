// src/components/LogoWithFlame.jsx
import React from "react";

/**
 * LogoWithFlame v3 + fireplace theme
 * - theme: "candle" (default) or "fireplace"
 */
export default function LogoWithFlame({
  src,
  width = "clamp(150px, 16vw, 220px)",
  aspect = 1.55,
  variant = "cutout",
  theme = "candle",     // NEW: "candle" | "fireplace"
  intensity = 1,
  speed = 1,
  flameTop = "6%",
  glass = true,
  className = "",
}) {
  const styleVars = {
    "--logo-url": `url(${src})`,
    "--w": typeof width === "number" ? `${width}px` : width,
    "--ar": aspect,
    "--intensity": intensity,
    "--speed": speed,
    "--flame-top": flameTop,
  };

  return (
    <div
      className={`logo-flame3 ${className}`}
      data-variant={variant}
      data-theme={theme}
      style={styleVars}
    >
      <div className="lf3-stack">
        <div className="lf3-flame" aria-hidden>
          {/* core + plume + halo are shared */}
          <div className="core" />
          <div className="plume" />
          <div className="halo" />

          {/* fireplace extras (two tongues) */}
          {theme === "fireplace" && (
            <>
              <div className="tongue left" />
              <div className="tongue right" />
            </>
          )}

          {/* subtle embers */}
          {theme === "fireplace" && (
            <div className="embers" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    // random-ish but deterministic offsets/timing via CSS vars
                    "--delay": `${(i * 0.27) % 2.6}s`,
                    "--dur": `${4.8 + ((i * 37) % 24) / 10}s`,
                    "--sx": `${-14 + (i * 7) % 28}px`, // horizontal start drift
                    "--ex": `${-22 + (i * 11) % 44}px`, // horizontal end drift
                    "--size": `${2 + (i % 3)}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {glass && <div className="lf3-glass" aria-hidden />}

        {variant === "dual" && (
          <img className="lf3-logo" src={src} alt="" draggable={false} />
        )}
      </div>
    </div>
  );
}
