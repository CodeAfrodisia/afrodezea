// src/components/LogoWithVideoMask.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Video-in-logo mask with optional crossfade looping and glass highlights.
 *
 * Props:
 *  - logoSrc: PNG with transparency
 *  - mp4Src, webmSrc?: video sources
 *  - poster?: image while buffering
 *  - width?: CSS width (e.g. "clamp(150px,16vw,220px)")
 *  - aspect?: number (logo width/height, ≈1.55 for your asset)
 *  - glass?: boolean (enable specular overlays)
 *  - glassIntensity?: number (0.6 subtle … 1.3 bold)
 *  - ambientGlow?: boolean (soft background glow)
 *  - crossfade?: boolean (true = 2 videos fade between loops)
 *  - fadeDuration?: seconds (crossfade time)
 *  - pauseOffscreen?: boolean (use IntersectionObserver)
 *  - videoScale?: number (zoom the video)
 *  - videoPosX/PosY?: CSS positions for object-position
 *  - debugUnmasked?: boolean (show raw video instead of masked)
 */
export default function LogoWithVideoMask({
  // assets
  logoSrc,
  mp4Src,
  webmSrc,
  poster,

  // sizing & look
  width = "220px",
  aspect = 1.55,
  glass = true,
  glassIntensity = 0.75,
  ambientGlow = false,

  // video behavior
  crossfade = true,
  fadeDuration = 0.7,        // seconds
  pauseOffscreen = false,

  // composition
  videoScale = 1.2,
  videoPosX = "50%",
  videoPosY = "58%",

  // debug
  debugUnmasked = false,
}) {
  const v0 = useRef(null);
  const v1 = useRef(null);
  const rafId = useRef(0);
  const fading = useRef(false);

  const [active, setActive]   = useState(0);     // 0 or 1: which is on top
  const [ready, setReady]     = useState(false);
  const [duration, setDur]    = useState(0);

  /* ---------------- helpers ---------------- */
  const safePlay = (el) => {
    if (!el) return;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  /* ---- Pause when off-screen (optional) ---- */
  useEffect(() => {
    if (!pauseOffscreen) return;
    const el = v0.current;
    if (!el) return;

    const io = new IntersectionObserver(([e]) => {
      const a = v0.current, b = v1.current;
      if (!a) return;
      if (e.isIntersecting) { safePlay(a); if (crossfade) safePlay(b); }
      else { a.pause(); b?.pause(); }
    }, { threshold: 0.1, rootMargin: "200px 0px" });

    io.observe(el);
    return () => io.disconnect();
  }, [pauseOffscreen, crossfade]);

  /* ---- Bootstrap + visibility resilience ---- */
  useEffect(() => {
    const a = v0.current;
    if (!a) return;

    const onMeta = () => {
      const d = a.duration || 0;
      if (Number.isFinite(d) && d > 0) {
        setDur(d);
        setReady(true);
        safePlay(a);
        if (crossfade && v1.current) safePlay(v1.current);
      }
    };
    a.addEventListener("loadedmetadata", onMeta, { once: true });
    if (a.readyState >= 1) onMeta();

    const onWake = () => {
      if (document.hidden) return;
      safePlay(v0.current);
      if (crossfade) safePlay(v1.current);
    };
    window.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);

    // Stall watchdog (Safari can pause time updates)
    let lastT = 0, lastTick = performance.now();
    const watch = () => {
      const now = performance.now();
      const A = [v0.current, v1.current][active];
      if (A && !A.paused) {
        const t = A.currentTime || 0;
        if (now - lastTick > 1500 && Math.abs(t - lastT) < 0.05) safePlay(A);
        lastT = t; lastTick = now;
      }
      rafId.current = requestAnimationFrame(watch);
    };
    rafId.current = requestAnimationFrame(watch);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, [crossfade, active]);

  /* ---- Crossfade scheduler (core loop) ---- */
  useEffect(() => {
    if (!crossfade || !ready) return;

    const vids = [v0.current, v1.current];
    if (!vids[0] || !vids[1]) return;

    // reflect which one is active
    vids.forEach(el => { el.loop = false; el.style.transition = "opacity 0s"; });
    vids[active].style.opacity = "1";
    vids[1 - active].style.opacity = "0";
    safePlay(vids[active]);
    safePlay(vids[1 - active]);

    const fadeNow = () => {
      if (fading.current) return;
      fading.current = true;

      const A = vids[active];
      const B = vids[1 - active];

      try { B.currentTime = 0; } catch {}
      safePlay(B);

      B.style.transition = `opacity ${fadeDuration}s ease`;
      A.style.transition = `opacity ${fadeDuration}s ease`;
      B.style.opacity = "1";
      A.style.opacity = "0";

      setTimeout(() => {
        A.pause();
        try { A.currentTime = 0; } catch {}
        fading.current = false;
        setActive(prev => 1 - prev); // re-run this effect with new active
      }, fadeDuration * 1000 + 40);
    };

    // safety: if timing drifts, also react to native ended
    const onEnded = () => fadeNow();
    vids[active].addEventListener("ended", onEnded);

    const tick = () => {
      const A = vids[active];
      if (A && !fading.current) {
        const d  = duration || A.duration || 0;
        const t  = A.currentTime || 0;
        const remaining = Math.max(0, d - t);
        const guard = Math.max(0.08, fadeDuration * 0.15);
        if (remaining <= fadeDuration + guard) fadeNow();
      }
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      vids[active].removeEventListener("ended", onEnded);
    };
  }, [crossfade, ready, duration, active, fadeDuration]);

  /* ---- Simple single-video loop (no crossfade) ---- */
  useEffect(() => {
    if (crossfade || !ready) return;
    const a = v0.current;
    if (!a) return;
    a.loop = true;
    a.style.opacity = "1";
    safePlay(a);
  }, [crossfade, ready]);

  /* ---------------- styles ---------------- */
  const wrapStyle = {
    position: "relative",
    display: "block",
    width: typeof width === "number" ? `${width}px` : width,
    aspectRatio: aspect,
    isolation: "isolate",
    marginInline: "auto",
  };

  const stack = { position: "relative", width: "100%", aspectRatio: aspect };

  const maskStyle = debugUnmasked ? {} : {
    position: "absolute",
    inset: 0,
    WebkitMask: `url("${logoSrc}") no-repeat center / contain`,
    mask: `url("${logoSrc}") no-repeat center / contain`,
    overflow: "hidden",
  };

  const videoBase = {
    position: "absolute",
    inset: "-12% -12% -8% -12%", // bleed to cover strokes fully
    width: "auto",
    height: "auto",
    minWidth: "120%",
    minHeight: "120%",
    objectFit: "cover",
    objectPosition: `${videoPosX} ${videoPosY}`,
    transform: `scale(${videoScale})`,
    filter: "contrast(1.12) saturate(1.08) brightness(1.06)",
    pointerEvents: "none",
    transition: "opacity 0s linear",
    opacity: 0, // scheduler sets active → 1
  };

  // Glass layers
  const glassStyle = {
    position: "absolute",
    inset: 0,
    WebkitMask: `url("${logoSrc}") no-repeat center / contain`,
    mask: `url("${logoSrc}") no-repeat center / contain`,
    background:
      `radial-gradient(42% 28% at 50% 24%, rgba(255,240,200,${0.45 * glassIntensity}), transparent 70%),
       linear-gradient(to bottom,
         color-mix(in oklab, #ffb76a, white 38%),
         color-mix(in oklab, #ffb76a, black 28%))`,
    mixBlendMode: "screen",
    opacity: Math.min(0.95, 0.82 * glassIntensity),
    filter: `saturate(${1.05 + 0.05 * glassIntensity}) brightness(${1.02 + 0.02 * glassIntensity})`,
    pointerEvents: "none",
  };

  const rimStyle = {
    position: "absolute",
    inset: 0,
    WebkitMask: `url("${logoSrc}") no-repeat center / contain`,
    mask: `url("${logoSrc}") no-repeat center / contain`,
    background:
      `radial-gradient(65% 55% at 50% 35%, rgba(255,255,255,${0.18 * glassIntensity}), transparent 72%),
       radial-gradient(90% 80% at 50% 60%, rgba(0,0,0,${0.10 * glassIntensity}), transparent 78%)`,
    filter: "blur(2px)",
    mixBlendMode: "soft-light",
    opacity: Math.min(0.5, 0.35 * glassIntensity),
    pointerEvents: "none",
  };

  const sweepStyle = {
    position: "absolute",
    inset: 0,
    WebkitMask: `url("${logoSrc}") no-repeat center / contain`,
    mask: `url("${logoSrc}") no-repeat center / contain`,
    background:
      `linear-gradient(115deg,
        transparent 15%,
        rgba(255,255,255,${0.10 * glassIntensity}) 28%,
        rgba(255,255,255,${0.18 * glassIntensity}) 34%,
        rgba(255,255,255,${0.10 * glassIntensity}) 40%,
        transparent 55%)`,
    backgroundSize: "220% 220%",
    animation: "specSweep 4.6s ease-in-out infinite",
    mixBlendMode: "screen",
    opacity: Math.min(0.35, 0.25 * glassIntensity),
    pointerEvents: "none",
  };

  const glowStyle = {
    position: "absolute",
    inset: "-20vh -24vw",
    background:
      "radial-gradient(70% 45% at 50% 52%, rgba(255,220,150,.55), transparent 65%)," +
      "radial-gradient(120% 80% at 50% 62%, rgba(0,0,0,.45), transparent 75%)",
    filter: "blur(18px)",
    mixBlendMode: "screen",
    opacity: 0.75,
    zIndex: -1,
    pointerEvents: "none",
  };

  /* ---------------- render ---------------- */
  return (
    <div style={wrapStyle} aria-hidden>
      <style>{`
        @keyframes specSweep {
          0%   { background-position: -60% 0%;   opacity: 0.00; }
          10%  { opacity: .28; }
          40%  { background-position: 50% 0%;   opacity: .35; }
          70%  { opacity: .18; }
          100% { background-position: 160% 0%;  opacity: 0.00; }
        }
      `}</style>

      {ambientGlow && <div style={glowStyle} />}

      <div style={stack}>
        <div style={maskStyle}>
          {/* Video A (visible immediately) */}
          <video
            ref={v0}
            playsInline
            muted
            autoPlay
            preload="auto"
            poster={poster || undefined}
            style={{ ...videoBase, opacity: 1 }}
            onLoadedData={() => { try { v0.current && (v0.current.style.opacity = "1"); } catch {} }}
          >
            {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
            <source src={mp4Src} type="video/mp4" />
          </video>

          {/* Video B (for crossfade) */}
          {crossfade && (
            <video
              ref={v1}
              playsInline
              muted
              autoPlay
              preload="auto"
              style={videoBase}
            >
              {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
              <source src={mp4Src} type="video/mp4" />
            </video>
          )}
        </div>

        {glass && (
          <>
            <div style={glassStyle} />
            <div style={rimStyle} />
            <div style={sweepStyle} />
          </>
        )}
      </div>
    </div>
  );
}
